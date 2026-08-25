import { Bell, Menu, User, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
      <button className="md:hidden text-muted-foreground hover:text-foreground">
        <Menu size={20} />
      </button>
      
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Header left area cleared per request */}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-safe"></div>
            <span className="text-muted-foreground hidden sm:inline-block">System Online</span>
          </div>
          <button className="relative text-muted-foreground hover:text-foreground transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] text-destructive-foreground">
              3
            </span>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground border border-border">
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  )
}
