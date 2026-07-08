import { Link } from "@tanstack/react-router";
import { Search, Menu, Briefcase, Sparkles, MessageCircle, LogOut, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export type Mode = "services" | "projects";

interface HeaderProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function Header({ mode, onModeChange }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/" });
  };

  // استخراج نوع الحساب من metadata
  const accountType = user?.user_metadata?.account_type;
  const isSeller = accountType === "seller";

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
          <Link to="/services" search={{ q: undefined, category: undefined }} className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">الخدمات</Link>
          <Link to="/projects" className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">المشاريع</Link>
          <Link to="/" hash="how" className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">كيف يعمل</Link>
        </nav>

        <div className="mr-auto flex items-center gap-2">

          {/* زر انشر مشروعك للمشتري أو غير مسجل */}
          {!isSeller && (
            <Link to="/projects" className="hidden md:inline-flex">
              <Button variant="hero" size="default">
                <Briefcase className="h-4 w-4" />
                انشر مشروعك
              </Button>
            </Link>
          )}

          {/* زر أضف خدمة للبائع */}
          {user && isSeller && (
            <Link to="/create-service" className="hidden md:inline-flex">
              <Button variant="hero" size="default">
                <Plus className="h-4 w-4" />
                أضف خدمة
              </Button>
            </Link>
          )}

          {user ? (
            <>
              <Link to="/messages" className="hidden h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:bg-muted sm:inline-flex">
                <MessageCircle className="h-5 w-5" />
              </Link>
              <Link to="/dashboard/seller">
                <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-accent text-sm font-bold text-accent-foreground sm:inline-flex cursor-pointer hover:opacity-90">
                  {(user.user_metadata?.full_name ?? user.email ?? "?")[0].toUpperCase()}
                </div>
              </Link>
              <Button variant="ghost" size="default" onClick={handleSignOut} className="hidden sm:inline-flex">
                <LogOut className="h-4 w-4" />
                خروج
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="default" className="hidden sm:inline-flex">دخول</Button></Link>
              <Link to="/auth"><Button variant="navy" size="default">سجل الآن</Button></Link>
            </>
          )}
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

          {/* قائمة الموبايل */}
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/services" search={{ q: undefined, category: undefined }} className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">الخدمات</Link>
            <Link to="/projects" className="rounded-md px-3 py-2 text-foreground/80 hover:text-foreground">المشاريع</Link>
            {user && isSeller && (
              <Link to="/create-service" className="rounded-md px-3 py-2 font-bold text-accent">+ أضف خدمة</Link>
            )}
            {!user && (
              <Link to="/auth" className="rounded-md px-3 py-2 font-bold text-accent">تسجيل الدخول</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
