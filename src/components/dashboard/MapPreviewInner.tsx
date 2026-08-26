"use client"
import { Incident } from "@/data/types"
import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Fix for default leaflet icons in Next.js
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

export default function MapPreviewInner({ incidents }: { incidents: Incident[] }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-full w-full bg-secondary flex items-center justify-center text-muted-foreground">Loading Map...</div>
  }

  // Default to Arabian Sea
  const center = { lat: 15.42, lng: 67.83 }

  return (
    <MapContainer 
      center={[center.lat, center.lng]} 
      zoom={5} 
      className="h-full w-full z-0"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={9}
        maxZoom={18}
      />
      {incidents.map((incident) => (
        <Marker 
          key={incident.id} 
          position={[incident.location?.lat || 0, incident.location?.lon || 0]}
          icon={icon}
        >
          <Popup className="text-foreground">
            <strong>{incident.id}</strong><br/>
            Severity: {incident.severity}
          </Popup>
          <Circle 
            center={[incident.location?.lat || 0, incident.location?.lon || 0]}
            radius={Math.sqrt((incident.areaKm2 || 0) / Math.PI) * 1000} // Rough radius estimation
            pathOptions={{ color: incident.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', fillColor: incident.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b', fillOpacity: 0.5 }}
          />
        </Marker>
      ))}
    </MapContainer>
  )
}
