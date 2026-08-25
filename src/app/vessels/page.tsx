import { api } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Map, Navigation, Ship, Radio, AlertTriangle, ServerCrash } from "lucide-react"
import { Vessel } from "@/data/types"

export default async function VesselsPage({
  searchParams,
}: {
  searchParams: { incidentId?: string }
}) {
  let incidentId = searchParams.incidentId
  
  // Auto-select latest incident if none provided
  if (!incidentId) {
    const incidentsRes = await api.incidents.getAll()
    if (incidentsRes && !('error' in incidentsRes) && incidentsRes.length > 0) {
      incidentId = incidentsRes[0].id
    } else {
      incidentId = "Awaiting Incident"
    }
  }
  
  const vesselsRes = incidentId !== "Awaiting Incident" ? await api.vessels.getNearby(incidentId) : null
  
  const isOffline = vesselsRes && 'error' in vesselsRes
  const vessels: Vessel[] = !isOffline && vesselsRes && Array.isArray(vesselsRes) ? vesselsRes : []
  
  // Sort by risk score
  const sortedVessels = [...vessels].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))

  return (
    <div className="flex flex-col gap-6">
      {isOffline && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-3">
          <ServerCrash size={20} />
          <div>
            <p className="font-semibold text-sm">Pipeline Offline</p>
            <p className="text-xs">Cannot connect to AIS intelligence backend.</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Vessel Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          AIS correlation and potential source identification for <span className="text-primary font-medium">{incidentId}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Potential Source Vessels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Rank</th>
                      <th className="px-4 py-3 font-medium">Vessel / MMSI</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Distance</th>
                      <th className="px-4 py-3 font-medium">Last Seen</th>
                      <th className="px-4 py-3 font-medium">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sortedVessels.map((vessel, idx) => (
                      <tr key={vessel.mmsi} className="hover:bg-secondary/20 transition-colors cursor-pointer">
                        <td className="px-4 py-3 font-medium text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-primary">{vessel.name}</p>
                          <p className="text-xs text-muted-foreground">{vessel.mmsi}</p>
                        </td>
                        <td className="px-4 py-3">{vessel.type}</td>
                        <td className="px-4 py-3">{vessel.distanceToSpill !== undefined ? `${vessel.distanceToSpill} km` : 'N/A'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                           {new Date(vessel.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant={(vessel.riskScore || 0) > 80 ? "destructive" : (vessel.riskScore || 0) > 50 ? "warning" : "safe"}
                            className="font-mono text-sm"
                          >
                            {vessel.riskScore || 0}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {sortedVessels.length === 0 && (
                       <tr>
                         <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                           {isOffline ? "Awaiting data — Pipeline offline" : !searchParams.incidentId ? "Select an incident to view correlated vessels." : "No vessels found."}
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 border border-destructive/20 bg-destructive/10 rounded-md flex gap-3 text-sm text-destructive-foreground">
                <AlertTriangle size={18} className="text-destructive shrink-0" />
                <p>
                  <strong>Note:</strong> Source attribution is probabilistic and based on AIS trajectory intersection with the detected spill polygon.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="flex items-center gap-2">
                <Ship size={18} /> Vessel Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {sortedVessels.length > 0 ? (
                <>
                  <div>
                    <h3 className="text-xl font-bold text-primary">{sortedVessels[0].name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                      <Radio size={14} /> MMSI: {sortedVessels[0].mmsi}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-semibold">{sortedVessels[0].type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Speed / Heading</p>
                      <p className="font-semibold">{sortedVessels[0].speed} kn / {sortedVessels[0].heading}°</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coordinates</p>
                      <p className="font-semibold">{sortedVessels[0].position.lat}°, {sortedVessels[0].position.lon}°</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Risk Level</p>
                      <Badge variant="destructive" className="mt-1">HIGH ({sortedVessels[0].riskScore}%)</Badge>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Awaiting vessel selection
                </div>
              )}

              <div className="pt-4 border-t border-border mt-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Navigation size={14} /> Trajectory History
                </div>
                <div className="relative h-32 bg-secondary rounded-md overflow-hidden border border-border flex items-center justify-center group">
                  <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
                  <span className="text-muted-foreground text-sm z-10 relative">Awaiting Trajectory Data</span>
                  <Badge className="absolute top-2 left-2 bg-black/60 text-white border-none z-10 relative">AIS Track</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
