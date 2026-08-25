export interface DashboardStats {
  activeIncidents: number
  detectedSpillAreaKm2: number
  highRiskAlerts: number
  vesselsAnalyzed: number
}

export interface Incident {
  id: string
  timestamp: string
  location: {
    lat: number
    lon: number // user used lon instead of lng
  }
  areaKm2: number // user used areaKm2
  confidence: number // Number instead of HIGH/LOW for raw confidence
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN"
  status: "DETECTED" | "INVESTIGATING" | "RESOLVED"
}

export interface DetectionInferResult {
  sampleId: string
  predictionAvailable: boolean
  confidence: number
  spillAreaKm2: number
  maskUrl: string
  modelName: string
  modelVersion: string
}

export interface Vessel {
  mmsi: number
  name: string
  type: string
  position: {
    lat: number
    lon: number
  }
  speed: number
  heading: number
  course: number
  timestamp: string
  riskScore?: number // Calculated by backend
  distanceToSpill?: number
}

export interface TrajectoryPoint {
  timeOffsetHours: number
  coordinates: {
    lat: number
    lon: number
  }
  uncertaintyRadiusKm: number
}

// Global API error interface to standardize handling
export interface ApiError {
  error: true
  message: string
}
