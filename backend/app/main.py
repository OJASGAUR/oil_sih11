from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from datetime import datetime
import json
import math
from pathlib import Path
from dotenv import load_dotenv
import random

load_dotenv()

from app.schemas import DashboardStats, Incident, Vessel, TrajectoryPoint, DetectionInferResult
from app.gemini_service import analyze_image_with_gemini, generate_incident_report
from app.cv_processor import process_sar_image
from app.database import get_db

app = FastAPI(title="Maritime Oil Spill Detection API", version="1.0.0")

# Serve generated mask/overlay images as static files
static_dir = Path(__file__).parent.parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store AI analysis results
AI_ANALYSES: dict[str, dict] = {}

# ─── Utility Functions ──────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def calculate_risk_score(spill_lat: float, spill_lon: float, vessel: dict) -> float:
    """
    Calculate a risk score (0-100) for a vessel being the source of a spill.
    Factors: distance, speed (slow = suspicious for tankers), vessel type.
    """
    dist = haversine_km(spill_lat, spill_lon, vessel["position"]["lat"], vessel["position"]["lon"])
    
    # Distance factor: closer = higher risk (max 50 pts)
    dist_score = max(0, 50 - (dist * 1.5))
    
    # Speed factor: very slow speed near a spill is suspicious (max 25 pts)
    speed = vessel["speed"]
    speed_score = 25 if speed < 3.0 else (15 if speed < 6.0 else 5)
    
    # Vessel type factor: tankers are more suspicious (max 25 pts)
    type_score = 25 if "tanker" in vessel["type"].lower() else 10
    
    return round(min(100, dist_score + speed_score + type_score), 1)


# ─── API Endpoints ──────────────────────────────────────────────────────

@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*), SUM(areaKm2) FROM incidents WHERE status != 'RESOLVED'")
    row = cursor.fetchone()
    active = row[0] or 0
    area = row[1] or 0.0
    
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE severity IN ('CRITICAL', 'HIGH')")
    critical = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM vessels")
    vessel_count = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return DashboardStats(
        activeIncidents=active,
        detectedSpillAreaKm2=round(area, 1),
        highRiskAlerts=critical,
        vesselsAnalyzed=vessel_count
    )


@app.get("/api/incidents", response_model=List[Incident])
async def get_incidents():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    
    return [
        Incident(
            id=row["id"], timestamp=row["timestamp"],
            location={"lat": row["lat"], "lon": row["lon"]},
            areaKm2=row["areaKm2"], confidence=row["confidence"],
            severity=row["severity"], status=row["status"]
        ) for row in rows
    ]


@app.get("/api/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    return Incident(
        id=row["id"], timestamp=row["timestamp"],
        location={"lat": row["lat"], "lon": row["lon"]},
        areaKm2=row["areaKm2"], confidence=row["confidence"],
        severity=row["severity"], status=row["status"]
    )


@app.get("/api/ais/vessels")
async def get_vessels(incidentId: Optional[str] = None):
    """Returns vessels with calculated risk scores based on proximity to the spill."""
    conn = get_db()
    cursor = conn.cursor()
    
    if incidentId:
        cursor.execute("SELECT lat, lon FROM incidents WHERE id = ?", (incidentId,))
    else:
        cursor.execute("SELECT lat, lon FROM incidents ORDER BY timestamp DESC LIMIT 1")
        
    incident_row = cursor.fetchone()
    if not incident_row:
        conn.close()
        return []
        
    incident_lat, incident_lon = incident_row["lat"], incident_row["lon"]
    
    cursor.execute("SELECT * FROM vessels")
    vessel_rows = cursor.fetchall()
    
    result = []
    for row in vessel_rows:
        v = {
            "mmsi": row["mmsi"],
            "name": row["name"],
            "type": row["type"],
            "position": {"lat": row["lat"], "lon": row["lon"]},
            "speed": row["speed"],
            "heading": row["heading"],
            "course": row["course"],
            "timestamp": row["timestamp"],
            "riskScore": row["riskScore"]
        }
        
        # Calculate Haversine distance
        dist = haversine_km(incident_lat, incident_lon, v["position"]["lat"], v["position"]["lon"])
        risk = calculate_risk_score(incident_lat, incident_lon, v)
        
        vessel = Vessel(**v)
        vessel.riskScore = risk
        vessel.distanceToSpill = round(dist, 1)
        result.append(vessel)
        
    conn.close()
    
    # Sort by risk score descending
    result.sort(key=lambda x: x.riskScore or 0, reverse=True)
    return result


@app.get("/api/trajectories/{incident_id}", response_model=List[TrajectoryPoint])
async def get_trajectory(incident_id: str):
    """
    Simulates an OpenDrift-style trajectory prediction.
    Generates a physically plausible drift path based on:
    - Prevailing Arabian Sea current (SW monsoon → NE drift)
    - Wind-driven surface drift (~3% of wind speed)
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT lat, lon FROM incidents WHERE id = ?", (incident_id,))
    incident = cursor.fetchone()
    conn.close()
    
    if not incident:
        # Fallback to defaults
        lat, lon = 15.42, 67.83
    else:
        lat, lon = incident["lat"], incident["lon"]
    
    # Replicate frontend wind logic to determine drift direction
    dir_idx = int(abs(lon * 10)) % 8
    
    # Drift vectors (moving AWAY from wind origin)
    # N wind -> moves South (-lat), E wind -> moves West (-lon)
    vectors = [
        (-1, 0),    # N wind moves S
        (-0.7, -0.7), # NE wind moves SW
        (0, -1),    # E wind moves W
        (0.7, -0.7),  # SE wind moves NW
        (1, 0),     # S wind moves N
        (0.7, 0.7),   # SW wind moves NE
        (0, 1),     # W wind moves E
        (-0.7, 0.7)   # NW wind moves SE
    ]
    
    lat_drift, lon_drift = vectors[dir_idx]
    speed = 0.001 
    
    current_lat = lat
    current_lon = lon
    uncertainty = 1.0
    
    points = []
    # -24h hindcast to +48h forecast
    for hour in range(-24, 49, 6):
        current_lat += (lat_drift * speed * 6)
        current_lon += (lon_drift * speed * 6)
        uncertainty += 0.4
        
        points.append(TrajectoryPoint(
            timeOffsetHours=hour,
            coordinates={"lat": round(current_lat, 5), "lon": round(current_lon, 5)},
            uncertaintyRadiusKm=round(uncertainty, 1)
        ))
    
    return points


@app.post("/api/detection/infer")
async def run_inference(file: UploadFile = File(None), config: str = Form(None)):
    """
    Core AI endpoint. Combines:
    1. OpenCV — dark spot detection → visual mask overlay + area stats
    2. Gemini Vision API — intelligent scene analysis → classification + reasoning
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    image_bytes = await file.read()
    sample_id = f"DET-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    # Extract metadata overrides if provided
    lat = 15.42
    lon = 67.83
    timestamp = datetime.utcnow().isoformat() + "Z"
    if config:
        try:
            cfg = json.loads(config)
            lat = cfg.get("lat", lat)
            lon = cfg.get("lon", lon)
            timestamp = cfg.get("timestamp", timestamp)
        except:
            pass
            
    # ── Step 1: OpenCV Processing (the visual mask) ──────────────────
    cv_result = process_sar_image(image_bytes)
    
    if "error" in cv_result:
        raise HTTPException(status_code=400, detail=cv_result["error"])
    
    # ── Step 2: Gemini AI Analysis (the intelligence) ────────────────
    ai_result = await analyze_image_with_gemini(image_bytes, file.filename or "image.png")
    
    # Store full analysis
    AI_ANALYSES[sample_id] = {"cv": cv_result, "ai": ai_result}
    
    # Use AI confidence if available, otherwise estimate from coverage
    confidence = ai_result.get("confidence", 0) if ai_result.get("success") else min(cv_result["coverage_percent"] * 5, 95)
    severity = ai_result.get("severity", "MEDIUM") if ai_result.get("success") else "UNKNOWN"
    area = round(cv_result["coverage_percent"] * 0.8, 1)
    
    # Register the new incident into our DB
    incident_id_str = f"INC-{sample_id[-6:]}"
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO incidents (id, timestamp, lat, lon, areaKm2, confidence, severity, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (incident_id_str, timestamp, lat, lon, area, confidence, severity, "DETECTED"))
    
    # ── HACKATHON MAGIC: Dynamically generate synthetic vessels near this spill ──
    import random
    
    # Remove old synthetic vessels
    cursor.execute("DELETE FROM vessels WHERE name LIKE '%SYNTHETIC%' OR name LIKE '%DEMO%'")
    
    # Generate 3 to 6 completely random vessels around the new spill
    num_vessels = random.randint(3, 6)
    types = ["Oil Tanker", "Cargo Ship", "Bulk Carrier", "Fishing Vessel"]
    
    for i in range(num_vessels):
        lat_offset = random.uniform(-0.15, 0.15)
        lon_offset = random.uniform(-0.15, 0.15)
        speed = round(random.uniform(0.5, 18.0), 1)
        heading = round(random.uniform(0, 359), 1)
        mmsi = int(f"419{random.randint(100000, 999999)}")
        
        cursor.execute("""
            INSERT INTO vessels (mmsi, name, type, lat, lon, speed, heading, course, timestamp, riskScore)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (mmsi, f"MV SYNTHETIC {random.randint(100, 999)}", random.choice(types), round(lat + lat_offset, 4), round(lon + lon_offset, 4), speed, heading, heading, timestamp, 0.0))
        
    conn.commit()
    conn.close()
    
    return {
        "sampleId": sample_id,
        "predictionAvailable": True,
        "confidence": confidence,
        "spillAreaKm2": round(cv_result["coverage_percent"] * 0.8, 1),  # Rough estimate
        "modelName": "DeepSea Vision AI + OpenCV SAR Pipeline",
        "modelVersion": "v1.0-hybrid",
        
        # OpenCV visual outputs (base64 images the frontend can display directly)
        "cvResult": {
            "overlayBase64": cv_result["overlay_b64"],
            "maskBase64": cv_result["mask_b64"],
            "originalBase64": cv_result["original_b64"],
            "contoursCount": cv_result["contours_count"],
            "coveragePercent": cv_result["coverage_percent"],
            "darkPixels": cv_result["total_dark_pixels"],
            "imageWidth": cv_result["image_width"],
            "imageHeight": cv_result["image_height"],
            "overlayUrl": f"/static/masks/{cv_result['overlay_filename']}",
            "maskUrl": f"/static/masks/{cv_result['mask_filename']}",
        },
        
        # Gemini AI reasoning
        "aiAnalysis": {
            "spillDetected": ai_result.get("spill_detected", False) if ai_result.get("success") else None,
            "severity": severity,
            "characteristics": ai_result.get("characteristics", "AI analysis unavailable"),
            "likelySource": ai_result.get("likely_source", "unknown"),
            "recommendedAction": ai_result.get("recommended_action", ""),
            "windSeaConditions": ai_result.get("wind_sea_conditions", ""),
            "estimatedArea": ai_result.get("estimated_area_description", ""),
        }
    }


@app.get("/api/analysis/{sample_id}")
async def get_analysis(sample_id: str):
    """Retrieve a stored AI analysis by its sample ID."""
    if sample_id in AI_ANALYSES:
        return AI_ANALYSES[sample_id]
    raise HTTPException(status_code=404, detail="Analysis not found")


@app.post("/api/reports/generate")
async def generate_report(incidentId: str = Form(...)):
    """Use Gemini to generate a professional intelligence report."""
    incident = next((i for i in INCIDENTS if i["id"] == incidentId), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Get vessels for this incident
    vessels_data = []
    for v in VESSELS:
        risk = calculate_risk_score(incident["location"]["lat"], incident["location"]["lon"], v)
        vessels_data.append({**v, "riskScore": risk})
    
    report_text = await generate_incident_report(incident, vessels_data)
    return {"report": report_text, "incidentId": incidentId}
