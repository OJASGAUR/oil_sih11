"use client"
import { useState } from "react"
import { Upload, FileImage, Settings, Play, ServerCrash, Layers, Brain, Eye, ShieldAlert, Wind, MapPin, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import { useDetection } from "@/lib/contexts/DetectionContext"
import { DetectionResponse } from "@/data/types"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export default function DetectionPage() {
  const {
    file, setFile,
    status, setStatus,
    progressMsg, setProgressMsg,
    progressValue, setProgressValue,
    result, setResult,
    errorMsg, setErrorMsg,
    threshold, setThreshold,
    lat, setLat,
    lon, setLon,
    timestamp, setTimestamp
  } = useDetection()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      
      // Auto-set acquisition time to time of upload (current local time)
      const now = new Date()
      const formattedTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      setTimestamp(formattedTime)
    }
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
        <h1 className="text-3xl font-bold tracking-tight text-primary">Oil Spill Detection</h1>
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
                <div className="flex mt-4">
                  <Button disabled={!file} onClick={runDetection} className="gap-2 w-full">
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
                <div>
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

          <div className="flex flex-col gap-6">
            {/* Image Viewer with Tabs */}
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2"><Eye size={18} /> Visual Analysis</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { setFile(null); setStatus("IDLE"); setResult(null) }}>
                  Analyze Another Scene
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overlay">
                  <TabsList className="mb-4">
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="overlay">Detection Overlay</TabsTrigger>
                    <TabsTrigger value="mask">Binary Mask</TabsTrigger>
                  </TabsList>
                  <TabsContent value="original" className="relative aspect-[21/9] bg-black rounded-lg overflow-hidden border border-border">
                    <img src={`data:image/png;base64,${result.cvResult.originalBase64}`} alt="Original SAR Image" className="w-full h-full object-contain" />
                    <Badge className="absolute top-4 left-4 bg-black/70 text-white border-none">Original SAR Scene</Badge>
                  </TabsContent>
                  <TabsContent value="overlay" className="relative aspect-[21/9] bg-black rounded-lg overflow-hidden border border-border">
                    <img src={`data:image/png;base64,${result.cvResult.overlayBase64}`} alt="Detection Overlay" className="w-full h-full object-contain" />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge variant="ai">OpenCV Detection Overlay</Badge>
                    </div>
                  </TabsContent>
                  <TabsContent value="mask" className="relative aspect-[21/9] bg-black rounded-lg overflow-hidden border border-border">
                    <img src={`data:image/png;base64,${result.cvResult.maskBase64}`} alt="Binary Mask" className="w-full h-full object-contain" />
                    <Badge className="absolute top-4 left-4 bg-black/70 text-white border-none">Segmentation Mask</Badge>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
