import { Link } from "@tanstack/react-router";
import { Search, Menu, Bell, Briefcase, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Mode = "services" | "projects";

interface HeaderProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function Header({ mode, onModeChange }: HeaderProps) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent shadow-glow">
            <Sparkles className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-primary">سرعات</span>
        </Link>

        <div className="hidden items-center rounded-full bg-muted p-1 md:flex">
          <button
            onClick={() => onModeChange("services")}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-bold transition-all",
              mode === "services"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            خدمات
          </button>
          <button
            onClick={() => onModeChange("projects")}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-bold transition-all",
              mode === "projects"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            مشاريع
          </button>
        </div>

        <div className="relative hidden flex-1 max-w-md lg:block">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={mode === "services" ? "ابحث عن خدمة..." : "ابحث عن مشروع..."}
            className="h-10 w-full rounded-full border border-input bg-card pr-10 pl-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
          <Link to="/" className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">التصنيفات</Link>
          <Link to="/" className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">كيف يعمل</Link>
          <Link to="/" className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">الأسعار</Link>
        </nav>

        <div className="mr-auto flex items-center gap-2">
          <Button variant="hero" size="default" className="hidden md:inline-flex">
            <Briefcase className="h-4 w-4" />
            انشر مشروعك
          </Button>
          <Button variant="ghost" size="default" className="hidden sm:inline-flex">دخول</Button>
          <Button variant="navy" size="default">سجل الآن</Button>
          <button onClick={() => setOpen(!open)} className="rounded-md p-2 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-card px-4 py-4 lg:hidden">
          <div className="flex items-center rounded-full bg-muted p-1 md:hidden">
            <button
              onClick={() => onModeChange("services")}
              className={cn(
                "flex-1 rounded-full px-5 py-2 text-sm font-bold transition-all",
                mode === "services" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >خدمات</button>
            <button
              onClick={() => onModeChange("projects")}
              className={cn(
                "flex-1 rounded-full px-5 py-2 text-sm font-bold transition-all",
                mode === "projects" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >مشاريع</button>
          </div>
        </div>
      )}
    </header>
  );
}
