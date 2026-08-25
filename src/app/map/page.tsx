import { api } from "@/lib/api/client"
import { FullMap } from "@/components/map/FullMap"
import { ServerCrash } from "lucide-react"

export default async function MapPage() {
  const incidentsRes = await api.incidents.getAll()
  const isOffline = incidentsRes && 'error' in incidentsRes
  
  const incidents = !isOffline && Array.isArray(incidentsRes) ? incidentsRes : []
  const activeIncident = incidents.length > 0 ? incidents[0] : null
  const defaultIncidentId = activeIncident ? activeIncident.id : null
  
  // Fetch associated data for the map overlay if we have an active incident
  const vesselsRes = defaultIncidentId ? await api.vessels.getNearby(defaultIncidentId) : []
  const trajectoryRes = defaultIncidentId ? await api.trajectories.getByIncidentId(defaultIncidentId) : []

  const vessels = !('error' in vesselsRes) && Array.isArray(vesselsRes) ? vesselsRes : []
  const trajectory = !('error' in trajectoryRes) && Array.isArray(trajectoryRes) ? trajectoryRes : []

  // Hackathon Magic: Deterministic dynamic weather based on coordinates
  let windSpeed = 14.2;
  let windDir = "NW";
  let currentSpeed = 0.5;
  let currentDir = "ESE";
  let waveHeight = 1.2;
  let temp = 28.4;

  if (activeIncident) {
    const lat = activeIncident.location.lat;
    const lon = activeIncident.location.lon;
    
    // Create pseudo-random but consistent values based on lat/lon
    windSpeed = 8 + (Math.abs(lat * 100) % 15);
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    windDir = dirs[Math.floor(Math.abs(lon * 10)) % 8];
    
    currentSpeed = 0.2 + ((Math.abs(lat + lon) * 10) % 0.8);
    currentDir = dirs[Math.floor(Math.abs(lat * 10)) % 8];
    
    waveHeight = 0.5 + (windSpeed * 0.05);
    temp = 32.0 - (Math.abs(lat) * 0.2); // Colder as you move away from equator
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {isOffline && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-3 mb-4">
          <ServerCrash size={20} />
          <div>
            <p className="font-semibold text-sm">Pipeline Offline</p>
            <p className="text-xs">Cannot connect to backend APIs. Displaying base map layers only.</p>
          </div>
        </div>
      )}
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Maritime Map</h1>
        <p className="text-muted-foreground mt-1">
          Interactive visualization of spills, vessels, and drift trajectories.
        </p>
      </div>
      <div className="flex-1 min-h-[500px] relative">
        <FullMap incidents={incidents} vessels={vessels} trajectory={trajectory} />
        
        {/* MetOcean Telemetry Overlay */}
        <div className="absolute top-4 right-4 z-[400] w-64 pointer-events-none">
          <div className="bg-card/90 backdrop-blur border border-border rounded-lg shadow-lg overflow-hidden pointer-events-auto">
            <div className="bg-primary/10 px-4 py-2 border-b border-border">
              <h3 className="text-sm font-semibold text-primary">MetOcean Telemetry</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Wind (10m)</span>
                <span className="text-sm font-mono">{windSpeed.toFixed(1)} kts {windDir}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Surface Current</span>
                <span className="text-sm font-mono">{currentSpeed.toFixed(2)} m/s {currentDir}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Significant Wave</span>
                <span className="text-sm font-mono">{waveHeight.toFixed(1)} m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Sea Temp</span>
                <span className="text-sm font-mono">{temp.toFixed(1)} °C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
