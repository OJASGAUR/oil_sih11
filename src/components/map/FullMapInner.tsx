"use client"
import { useEffect, useState } from "react"
import { Incident, Vessel, TrajectoryPoint } from "@/data/types"
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet"
import { Badge } from "@/components/ui/badge"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import Link from "next/link"

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const vesselIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div style="background-color: #06b6d4; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

interface FullMapInnerProps {
  incidents: Incident[]
  vessels: Vessel[]
  trajectory: TrajectoryPoint[]
}

export default function FullMapInner({ incidents, vessels, trajectory }: FullMapInnerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-full w-full bg-secondary flex items-center justify-center text-muted-foreground animate-pulse">Loading map environment...</div>
  }

  const activeIncident = incidents.length > 0 ? incidents[0] : null
  const center = { 
    lat: activeIncident?.location?.lat || 15.42, 
    lng: activeIncident?.location?.lon || 67.83 
  }
  const trajectoryPositions: [number, number][] = trajectory.map(t => [t.coordinates.lat, t.coordinates.lon])

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden border border-border">
      <MapContainer 
        key={`${center.lat}-${center.lng}`} // Force re-render when center changes
        center={[center.lat, center.lng]} 
        zoom={9} 
        className="h-full w-full z-0"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Incidents */}
        {incidents.map((incident) => (
          <Marker 
            key={incident.id} 
            position={[incident.location?.lat || 0, incident.location?.lon || 0]}
            icon={icon}
          >
            <Popup className="text-foreground">
              <div className="font-semibold">{incident.id}</div>
              <div className="text-xs text-muted-foreground mb-2">{incident.location?.lat}°, {incident.location?.lon}°</div>
              <Badge variant={incident.severity === 'CRITICAL' ? 'destructive' : 'warning'} className="mb-2">
                {incident.severity}
              </Badge>
              <br/>
              <Link href={`/analysis/${incident.id}`} className="text-primary text-xs hover:underline">
                View Analysis &rarr;
              </Link>
            </Popup>
            <Circle 
              center={[incident.location?.lat || 0, incident.location?.lon || 0]}
              radius={Math.sqrt((incident.areaKm2 || 0) / Math.PI) * 1000}
              pathOptions={{ color: incident.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', fillColor: incident.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', fillOpacity: 0.4 }}
            />
          </Marker>
        ))}

        {/* Vessels */}
        {vessels.map((vessel) => (
          <Marker
            key={vessel.mmsi}
            position={[vessel.position?.lat || 0, vessel.position?.lon || 0]}
            icon={vesselIcon}
          >
            <Popup className="text-foreground">
              <div className="font-semibold text-primary">{vessel.name}</div>
              <div className="text-xs text-muted-foreground mb-1">MMSI: {vessel.mmsi}</div>
              <div className="text-xs font-semibold">{vessel.type}</div>
              <div className="text-xs mt-1 text-muted-foreground">Speed: {vessel.speed} kn | Heading: {vessel.heading}°</div>
              <div className="text-xs mt-1">Risk Score: <strong>{vessel.riskScore}%</strong></div>
            </Popup>
          </Marker>
        ))}

        {/* Trajectory */}
        <Polyline positions={trajectoryPositions} pathOptions={{ color: '#8b5cf6', weight: 3, dashArray: '5, 5' }} />
        {trajectory.map((t, i) => (
          <Circle
            key={i}
            center={[t.coordinates.lat, t.coordinates.lon]}
            radius={t.uncertaintyRadiusKm * 1000}
            pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.1, weight: 1 }}
          />
        ))}

      </MapContainer>

      {/* Map Legend overlay */}
      <div className="absolute bottom-6 right-6 z-10 bg-black/80 backdrop-blur border border-border p-4 rounded-lg shadow-lg">
        <h4 className="text-sm font-semibold mb-3 border-b border-border/50 pb-2">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
            <span>Critical Spill</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning/80"></div>
            <span>Medium Spill</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-white bg-primary"></div>
            <span>AIS Vessel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 border-t-2 border-dashed border-ai mt-1"></div>
            <span>Predicted Drift (OpenDrift)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
