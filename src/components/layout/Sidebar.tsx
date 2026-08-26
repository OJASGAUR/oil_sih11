"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Target, Activity, Ship, Map as MapIcon, FileText, Settings, Menu, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Detection", href: "/detection", icon: Target },
  { name: "Analysis", href: "/analysis", icon: Activity },
  { name: "Vessel Intelligence", href: "/vessels", icon: Ship },
  { name: "Maritime Map", href: "/map", icon: MapIcon },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside className={cn(
      "flex-col hidden md:flex border-r border-border bg-card transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={cn("flex items-center border-b border-border p-4", isCollapsed ? "justify-center" : "justify-end")}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className={cn("space-y-2", isCollapsed ? "px-2" : "px-4")}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md py-2.5 transition-colors font-medium text-sm",
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon size={18} className={cn(
                  isActive ? "text-primary" : "text-muted-foreground",
                  isCollapsed ? "mx-auto" : ""
                )} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
