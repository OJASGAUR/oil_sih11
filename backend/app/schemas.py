from pydantic import BaseModel
from typing import List, Optional

class Location(BaseModel):
    lat: float
    lon: float

class DashboardStats(BaseModel):
    activeIncidents: int
    detectedSpillAreaKm2: float
    highRiskAlerts: int
    vesselsAnalyzed: int

class Incident(BaseModel):
    id: str
    timestamp: str
    location: Location
    areaKm2: float
    confidence: float
    severity: str
    status: str

class DetectionInferResult(BaseModel):
    sampleId: str
    predictionAvailable: bool
    confidence: float
    spillAreaKm2: float
    maskUrl: str
    modelName: str
    modelVersion: str

class Vessel(BaseModel):
    mmsi: int
    name: str
    type: str
    position: Location
    speed: float
    heading: float
    course: float
    timestamp: str
    riskScore: Optional[float] = None
    distanceToSpill: Optional[float] = None

class TrajectoryPoint(BaseModel):
    timeOffsetHours: int
    coordinates: Location
    uncertaintyRadiusKm: float
