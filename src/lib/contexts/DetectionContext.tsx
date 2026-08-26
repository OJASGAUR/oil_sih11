"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { DetectionResponse } from "@/data/types"

interface DetectionState {
  file: File | null
  setFile: (file: File | null) => void
  status: "IDLE" | "PROCESSING" | "RESULT" | "ERROR"
  setStatus: (status: "IDLE" | "PROCESSING" | "RESULT" | "ERROR") => void
  progressMsg: string
  setProgressMsg: (msg: string) => void
  progressValue: number
  setProgressValue: (val: number) => void
  result: DetectionResponse | null
  setResult: (res: DetectionResponse | null) => void
  errorMsg: string
  setErrorMsg: (msg: string) => void
  threshold: string
  setThreshold: (val: string) => void
  lat: string
  setLat: (val: string) => void
  lon: string
  setLon: (val: string) => void
  timestamp: string
  setTimestamp: (val: string) => void
}

const DetectionContext = createContext<DetectionState | undefined>(undefined)

export function DetectionProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "RESULT" | "ERROR">("IDLE")
  const [progressMsg, setProgressMsg] = useState("")
  const [progressValue, setProgressValue] = useState(0)
  const [result, setResult] = useState<DetectionResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [threshold, setThreshold] = useState("0.50")
  const [lat, setLat] = useState("15.42")
  const [lon, setLon] = useState("67.83")
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().slice(0, 16))

  return (
    <DetectionContext.Provider value={{
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
    }}>
      {children}
    </DetectionContext.Provider>
  )
}

export function useDetection() {
  const context = useContext(DetectionContext)
  if (context === undefined) {
    throw new Error("useDetection must be used within a DetectionProvider")
  }
  return context
}
