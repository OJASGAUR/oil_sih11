import { api } from "@/lib/api/client"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MapPin, Calendar, Clock, Crosshair, Map, Activity, ShieldAlert, ArrowLeft, ServerCrash, Ship } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AnalysisPage({ params }: { params: Promise<{ incidentId: string }> }) {
  const resolvedParams = await params
  const incidentRes = await api.incidents.getById(resolvedParams.incidentId)
  
  const isOffline = incidentRes && 'error' in incidentRes
  const incident = !isOffline && incidentRes && !('error' in incidentRes) ? incidentRes : null

  if (isOffline) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-12 rounded-xl flex flex-col items-center justify-center text-center gap-4">
          <ServerCrash size={48} className="text-destructive/80" />
          <h2 className="text-2xl font-bold">Pipeline Offline</h2>
          <p className="max-w-md">
            Unable to fetch analysis for incident <span className="font-mono text-primary">{resolvedParams.incidentId}</span>. The backend pipeline is currently offline or unreachable.
          </p>
        <Link href="/">
          <Button variant="outline" className="mt-4 gap-2"><ArrowLeft size={16} /> Return to Dashboard</Button>
        </Link>
      </div>
      </div>
    )
  }



  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return <Badge variant="destructive">CRITICAL</Badge>
      case "HIGH": return <Badge variant="destructive">HIGH</Badge>
      case "MEDIUM": return <Badge variant="warning">MEDIUM</Badge>
      default: return <Badge variant="safe">LOW</Badge>
    }
  }

  const date = new Date(incident.timestamp || 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-4">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-primary">{incident.id}</h1>
              {getSeverityBadge(incident.severity)}
              <Badge variant="secondary">{incident.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <MapPin size={16} /> {incident.location?.lat}°, {incident.location?.lon}°
            </p>
          </div>
          <Link href={`/vessels?incidentId=${incident.id}`}>
             <Button className="gap-2">
               <Crosshair size={16} /> Correlate AIS Data
             </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} /> Detection Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{date.toLocaleDateString()}</p>
            <p className="text-sm text-muted-foreground">{date.toLocaleTimeString()} UTC</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
              <Map size={14} /> Spill Area
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-lg">{incident.areaKm2?.toFixed(1) || 0} km²</p>
            <p className="text-sm text-muted-foreground">Estimated extent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={14} /> AI Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-lg text-destructive">{incident.confidence?.toFixed(1) || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} /> Satellite Pass
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">Sentinel-1</p>
            <p className="text-sm text-muted-foreground">SAR VV/VH</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Satellite Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overlay">
                <TabsList className="mb-4">
                  <TabsTrigger value="original">Original</TabsTrigger>
                  <TabsTrigger value="vv">VV Polarization</TabsTrigger>
                  <TabsTrigger value="vh">VH Polarization</TabsTrigger>
                  <TabsTrigger value="prediction">Prediction Mask</TabsTrigger>
                  <TabsTrigger value="overlay">Overlay</TabsTrigger>
                </TabsList>
                
                {/* Same UI structure but awaiting data for background images */}
                <TabsContent value="original" className="relative aspect-[4/3] bg-secondary flex items-center justify-center rounded-lg overflow-hidden border border-border">
                  <p className="text-muted-foreground">Awaiting SAR imagery data</p>
                  <Badge className="absolute top-4 left-4 bg-black/60 text-white border-none">SAR Composite</Badge>
                </TabsContent>
                
                <TabsContent value="vv" className="relative aspect-[4/3] bg-secondary flex items-center justify-center rounded-lg overflow-hidden border border-border">
                  <p className="text-muted-foreground">Awaiting SAR imagery data</p>
                  <Badge className="absolute top-4 left-4 bg-black/60 text-white border-none">VV Polarization (Sigma0)</Badge>
                </TabsContent>

                <TabsContent value="vh" className="relative aspect-[4/3] bg-secondary flex items-center justify-center rounded-lg overflow-hidden border border-border">
                  <p className="text-muted-foreground">Awaiting SAR imagery data</p>
                  <Badge className="absolute top-4 left-4 bg-black/60 text-white border-none">VH Polarization (Sigma0)</Badge>
                </TabsContent>

                <TabsContent value="prediction" className="relative aspect-[4/3] bg-secondary flex items-center justify-center rounded-lg overflow-hidden border border-border bg-black">
                  <p className="text-muted-foreground">Awaiting Prediction Mask</p>
                  <Badge className="absolute top-4 left-4 bg-black/60 text-white border-none">Segmentation Mask</Badge>
                </TabsContent>

                <TabsContent value="overlay" className="relative aspect-[4/3] bg-secondary flex items-center justify-center rounded-lg overflow-hidden border border-border group">
                  <p className="text-muted-foreground">Awaiting Overlay Analysis</p>
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge variant="ai">Overlay Analysis</Badge>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Probability</span>
                  <span className="font-semibold text-destructive">{incident.confidence?.toFixed(1) || 0}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-destructive transition-all" style={{ width: `${incident.confidence || 0}%` }}></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Threshold</span>
                  <span className="font-semibold">Awaiting API</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-muted-foreground"></div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Model Version</span>
                  <span>Awaiting Data</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Inference Status</span>
                  <Badge variant="safe">Completed</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AIS Correlation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Identified potential source vessels in the vicinity of the spill area based on AIS trajectories.
              </p>
              <Link href={`/vessels?incidentId=${incident.id}`}>
                <Button className="w-full gap-2" variant="outline">
                  <Ship size={16} /> View Vessel Intelligence
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
