import sqlite3
import json
import os

DB_PATH = "oilwatch.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Create incidents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        lat REAL,
        lon REAL,
        areaKm2 REAL,
        confidence REAL,
        severity TEXT,
        status TEXT
    )
    """)
    
    # Create vessels table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vessels (
        mmsi INTEGER PRIMARY KEY,
        name TEXT,
        type TEXT,
        lat REAL,
        lon REAL,
        speed REAL,
        heading REAL,
        course REAL,
        timestamp TEXT,
        riskScore REAL
    )
    """)
    
    conn.commit()
    
    # Check if empty, then seed
    cursor.execute("SELECT COUNT(*) FROM incidents")
    if cursor.fetchone()[0] == 0:
        seed_db(conn)
        
    conn.close()

def seed_db(conn):
    cursor = conn.cursor()
    
    # Seed mock incidents
    mock_incidents = [
        ("INC-232843", "2026-08-25T14:30:00Z", 15.452, 67.834, 55.1, 95.0, "CRITICAL", "DETECTED"),
        ("INC-232842", "2026-08-25T08:15:00Z", 15.110, 68.012, 12.4, 88.5, "HIGH", "ANALYZING"),
        ("INC-232841", "2026-08-24T18:45:00Z", 14.890, 67.550, 4.2, 72.0, "MEDIUM", "RESOLVED")
    ]
    
    cursor.executemany("""
    INSERT INTO incidents (id, timestamp, lat, lon, areaKm2, confidence, severity, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, mock_incidents)
    
    # Seed mock vessels
    mock_vessels = [
        (419000123, "MT ARABIAN STAR", "Oil Tanker", 15.45, 67.80, 2.1, 145.0, 145.0, "2026-08-25T14:15:00Z", 93.1),
        (419000789, "MT GULF PRIDE", "Oil Tanker", 15.42, 67.89, 14.5, 92.0, 95.0, "2026-08-25T14:55:00Z", 85.5),
        (419000456, "MV PACIFIC VOYAGER", "Cargo Ship", 15.30, 67.75, 18.2, 270.0, 271.0, "2026-08-25T14:40:00Z", 18.6),
        (419001012, "MV OCEAN LIBERTY", "Bulk Carrier", 15.60, 67.95, 12.8, 30.0, 31.0, "2026-08-25T14:25:00Z", 15.0)
    ]
    
    cursor.executemany("""
    INSERT INTO vessels (mmsi, name, type, lat, lon, speed, heading, course, timestamp, riskScore)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, mock_vessels)
    
    conn.commit()

# Initialize on import
init_db()
