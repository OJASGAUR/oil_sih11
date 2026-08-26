import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OILWATCH AI | Maritime Intelligence",
  description: "AI-assisted maritime surveillance and oil spill detection",
}

import { DetectionProvider } from "@/lib/contexts/DetectionContext"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <DetectionProvider>
          <AppShell>
            {children}
          </AppShell>
        </DetectionProvider>
      </body>
    </html>
  )
}
