"use client"
import { useState } from "react"
import { Upload, FileImage, Settings, Play, ServerCrash, Layers, Brain, Eye, ShieldAlert, Wind, MapPin, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

interface DetectionResponse {
  sampleId: string
  predictionAvailable: boolean
  confidence: number
  spillAreaKm2: number
  modelName: string
  modelVersion: string
  cvResult: {
    overlayBase64: string
    maskBase64: string
    originalBase64: string
    contoursCount: number
    coveragePercent: number
    darkPixels: number
    imageWidth: number
    imageHeight: number
    overlayUrl: string
    maskUrl: string
  }
  aiAnalysis: {
    spillDetected: boolean | null
    severity: string
    characteristics: string
    likelySource: string
    recommendedAction: string
    windSeaConditions: string
    estimatedArea: string
  }
}

export default function DetectionPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "RESULT" | "ERROR">("IDLE")
  const [progressMsg, setProgressMsg] = useState("")
  const [progressValue, setProgressValue] = useState(0)
  const [result, setResult] = useState<DetectionResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [threshold, setThreshold] = useState("0.50")
  
  // Metadata overrides for the demo
  const [lat, setLat] = useState("15.42")
  const [lon, setLon] = useState("67.83")
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16))

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUseDemo = () => {
    const demoFile = new File(["demo"], "S1A_IW_GRDH_1SDV_20260825_ArabianSea.tif", { type: "image/tiff" })
    setFile(demoFile)
  }

  const runDetection = async () => {
    if (!file) return
    setStatus("PROCESSING")
    setProgressValue(10)
    setProgressMsg("Uploading image to backend...")

    try {
      setProgressValue(30)
      setProgressMsg("Running OpenCV dark-spot detection...")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("config", JSON.stringify({ 
        threshold: parseFloat(threshold),
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        timestamp: new Date(timestamp).toISOString()
      }))

      const res = await fetch(`${API_BASE}/api/detection/infer`, {
        method: "POST",
        body: formData
      })

      setProgressValue(60)
      setProgressMsg("Waiting for DeepSea AI scene analysis...")

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Unknown error" }))
        throw new Error(errData.detail || `HTTP ${res.status}`)
      }

      setProgressValue(90)
      setProgressMsg("Processing results...")

      const data: DetectionResponse = await res.json()
      setResult(data)
      setStatus("RESULT")
    } catch (e: any) {
      setErrorMsg(e.message || "Detection failed")
      setStatus("ERROR")
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "destructive"
      case "HIGH": return "destructive"
      case "MEDIUM": return "warning"
      default: return "safe"
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">AI Oil Spill Detection</h1>
        <p className="text-muted-foreground mt-1">
          Analyze satellite imagery using OpenCV + DeepSea AI hybrid pipeline.
        </p>
      </div>

      {/* ── IDLE / UPLOAD STATE ────────────────────────────── */}
      {status === "IDLE" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Image Upload</CardTitle>
                <CardDescription>Upload Sentinel-1 SAR imagery (.tif, .png, .jpg)</CardDescription>
              </CardHeader>
              <CardContent>
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center bg-secondary/20 hover:bg-secondary/40 transition-colors">
                    <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                    {file ? (
                      <div className="flex items-center gap-2 text-primary font-medium mb-4">
                        <FileImage size={20} />
                        {file.name}
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold mb-1">Drag and drop file here</h3>
                        <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                      </>
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*,.tif,.tiff" onChange={handleFileSelect} />
                </label>
                <div className="flex gap-4 mt-4">
                  <Button variant="outline" onClick={handleUseDemo}>Select Placeholder Scene</Button>
                  <Button disabled={!file} onClick={runDetection} className="gap-2">
                    <Play size={16} /> Run Detection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings size={18} /> Model Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Pipeline</p>
                  <p className="font-semibold text-sm">DeepSea Vision AI + OpenCV</p>
                  <Badge variant="ai" className="mt-1">Hybrid AI</Badge>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-medium">Detection Threshold</p>
                    <p className="text-sm text-muted-foreground font-mono">{threshold}</p>
                  </div>
                  <input type="range" className="w-full accent-primary" min="0" max="1" step="0.05" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                </div>
                
                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-sm font-medium">Scene Metadata (Override)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Latitude</label>
                      <input type="number" step="0.01" className="w-full bg-background border border-border rounded px-2 py-1 text-sm mt-1" value={lat} onChange={(e) => setLat(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Longitude</label>
                      <input type="number" step="0.01" className="w-full bg-background border border-border rounded px-2 py-1 text-sm mt-1" value={lon} onChange={(e) => setLon(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Acquisition Time</label>
                    <input type="datetime-local" className="w-full bg-background border border-border rounded px-2 py-1 text-sm mt-1" value={timestamp} onChange={(e) => setTimestamp(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── PROCESSING STATE ──────────────────────────────── */}
      {status === "PROCESSING" && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center space-y-6">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-secondary"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Layers className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2 w-full max-w-md">
              <h3 className="font-medium text-lg">{progressMsg}</h3>
              <Progress value={progressValue} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ERROR STATE ───────────────────────────────────── */}
      {status === "ERROR" && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center">
              <ServerCrash className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-destructive mb-2">Detection Failed</h3>
              <p className="text-muted-foreground text-sm max-w-sm">{errorMsg}</p>
            </div>
            <Button variant="outline" onClick={() => { setFile(null); setStatus("IDLE") }}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {/* ── RESULT STATE ──────────────────────────────────── */}
      {status === "RESULT" && result && (
        <div className="space-y-6">
          {/* Top Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Confidence</p>
                <p className="text-2xl font-bold text-primary">{result.confidence.toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Severity</p>
                <Badge variant={getSeverityColor(result.aiAnalysis.severity) as any} className="mt-1 text-sm">
                  {result.aiAnalysis.severity}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Spill Area</p>
                <p className="text-2xl font-bold">{result.spillAreaKm2} km²</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Regions Found</p>
                <p className="text-2xl font-bold">{result.cvResult.contoursCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Coverage</p>
                <p className="text-2xl font-bold">{result.cvResult.coveragePercent}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image Viewer with Tabs */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Eye size={18} /> Visual Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overlay">
                    <TabsList className="mb-4">
                      <TabsTrigger value="original">Original</TabsTrigger>
                      <TabsTrigger value="overlay">Detection Overlay</TabsTrigger>
                      <TabsTrigger value="mask">Binary Mask</TabsTrigger>
                    </TabsList>
                    <TabsContent value="original" className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden border border-border">
                      <img src={`data:image/png;base64,${result.cvResult.originalBase64}`} alt="Original SAR Image" className="w-full h-full object-contain" />
                      <Badge className="absolute top-4 left-4 bg-black/70 text-white border-none">Original SAR Scene</Badge>
                    </TabsContent>
                    <TabsContent value="overlay" className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden border border-border">
                      <img src={`data:image/png;base64,${result.cvResult.overlayBase64}`} alt="Detection Overlay" className="w-full h-full object-contain" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <Badge variant="ai">OpenCV Detection Overlay</Badge>
                      </div>
                    </TabsContent>
                    <TabsContent value="mask" className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden border border-border">
                      <img src={`data:image/png;base64,${result.cvResult.maskBase64}`} alt="Binary Mask" className="w-full h-full object-contain" />
                      <Badge className="absolute top-4 left-4 bg-black/70 text-white border-none">Segmentation Mask</Badge>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* AI Analysis Panel */}
            <div className="space-y-4">
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2"><Brain size={18} /> DeepSea AI Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1 mb-1"><ShieldAlert size={14} /> Characteristics</p>
                    <p>{result.aiAnalysis.characteristics || "N/A"}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-muted-foreground flex items-center gap-1 mb-1"><MapPin size={14} /> Likely Source</p>
                    <p className="font-semibold">{result.aiAnalysis.likelySource || "Unknown"}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-muted-foreground flex items-center gap-1 mb-1"><BarChart3 size={14} /> Estimated Area</p>
                    <p>{result.aiAnalysis.estimatedArea || "N/A"}</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-muted-foreground flex items-center gap-1 mb-1"><Wind size={14} /> Sea Conditions</p>
                    <p>{result.aiAnalysis.windSeaConditions || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Recommended Action</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{result.aiAnalysis.recommendedAction || "No recommendation available"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Sample ID</span><span className="font-mono">{result.sampleId}</span></div>
                  <div className="flex justify-between"><span>Model</span><span>{result.modelName}</span></div>
                  <div className="flex justify-between"><span>Version</span><span>{result.modelVersion}</span></div>
                  <div className="flex justify-between"><span>Image Size</span><span>{result.cvResult.imageWidth}×{result.cvResult.imageHeight}px</span></div>
                </CardContent>
              </Card>

              <Button className="w-full" variant="outline" onClick={() => { setFile(null); setStatus("IDLE"); setResult(null) }}>
                Analyze Another Scene
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
