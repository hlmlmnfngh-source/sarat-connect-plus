import { useState, useEffect } from "react";
import {
  Code2, Palette, Megaphone, PenTool, Video, Music, Languages, Briefcase, Bot, BarChart3,
  Search, ArrowLeft, CheckCircle2, Star, TrendingUp, Users, Zap, Shield, Clock,
  Sparkles, Quote, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header, type Mode } from "./Header";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { icon: Code2, name: "البرمجة والتطوير", count: "4,820", color: "from-blue-500/10 to-blue-500/5" },
  { icon: Palette, name: "التصميم", count: "3,140", color: "from-pink-500/10 to-pink-500/5" },
  { icon: Megaphone, name: "التسويق الرقمي", count: "2,560", color: "from-orange-500/10 to-orange-500/5" },
  { icon: PenTool, name: "الكتابة والمحتوى", count: "1,980", color: "from-violet-500/10 to-violet-500/5" },
  { icon: Video, name: "فيديو ومونتاج", count: "1,450", color: "from-red-500/10 to-red-500/5" },
  { icon: Music, name: "صوتيات", count: "890", color: "from-emerald-500/10 to-emerald-500/5" },
  { icon: Languages, name: "ترجمة", count: "1,210", color: "from-cyan-500/10 to-cyan-500/5" },
  { icon: Briefcase, name: "أعمال واستشارات", count: "760", color: "from-amber-500/10 to-amber-500/5" },
  { icon: Bot, name: "خدمات الذكاء الاصطناعي", count: "520", color: "from-indigo-500/10 to-indigo-500/5" },
  { icon: BarChart3, name: "تحليل البيانات", count: "640", color: "from-teal-500/10 to-teal-500/5" },
];

const SERVICES = [
  { title: "تصميم هوية بصرية احترافية وشعار مميز", seller: "نورة العتيبي", level: "نخبة", rating: 4.9, reviews: 312, price: 350, days: 3, badge: "الأكثر طلباً" },
  { title: "تطوير موقع ويب متكامل بأحدث التقنيات", seller: "محمد الزهراني", level: "محترف", rating: 4.8, reviews: 187, price: 1200, days: 7, badge: "موصى به" },
  { title: "حملة إعلانية احترافية على جوجل وميتا", seller: "سارة القحطاني", level: "محترف", rating: 5.0, reviews: 94, price: 800, days: 5 },
  { title: "كتابة محتوى تسويقي SEO عربي", seller: "خالد المطيري", level: "نشيط", rating: 4.7, reviews: 156, price: 200, days: 2 },
  { title: "مونتاج فيديوهات سوشيال ميديا احترافي", seller: "ريم الدوسري", level: "نخبة", rating: 4.9, reviews: 245, price: 450, days: 3, badge: "خدمة سريعة" },
  { title: "تطبيق جوال iOS و Android بـ React Native", seller: "عبدالله الشهري", level: "نخبة", rating: 5.0, reviews: 78, price: 3500, days: 14 },
];

const PROJECTS = [
  { title: "تطوير منصة تجارة إلكترونية بلوحة تحكم متكاملة", budget: "8,000 - 15,000", skills: ["React", "Node.js", "Supabase"], proposals: 23, time: "قبل ساعتين" },
  { title: "تصميم هوية بصرية كاملة لمطعم جديد", budget: "1,500 - 3,000", skills: ["Illustrator", "Photoshop"], proposals: 41, time: "قبل 5 ساعات" },
  { title: "حملة تسويق رقمي شاملة لإطلاق منتج", budget: "5,000 - 10,000", skills: ["Google Ads", "Meta Ads", "SEO"], proposals: 18, time: "قبل يوم" },
  { title: "كتابة 20 مقال عربي محسّن لمحركات البحث", budget: "1,000 - 2,000", skills: ["SEO", "كتابة محتوى"], proposals: 67, time: "قبل 3 أيام" },
];

const TOP_FREELANCERS = [
  { name: "نورة العتيبي", title: "مصممة جرافيك ومدير فني", rating: 4.9, orders: 312, level: "نخبة" },
  { name: "محمد الزهراني", title: "مطور Full-Stack", rating: 4.8, orders: 187, level: "محترف" },
  { name: "ريم الدوسري", title: "محررة فيديو ومنتجة", rating: 4.9, orders: 245, level: "نخبة" },
  { name: "عبدالله الشهري", title: "مطور تطبيقات الجوال", rating: 5.0, orders: 78, level: "نخبة" },
];

const TESTIMONIALS = [
  { name: "أحمد السعيد", role: "مؤسس متجر إلكتروني", text: "سرعات غيرت طريقة عملي بالكامل. وجدت أفضل المصممين والمطورين خلال ساعات. الجودة استثنائية والأسعار منافسة." },
  { name: "هند المالكي", role: "مديرة تسويق", text: "كمشترية، أقدّر نظام المراجعات الشفاف ومستويات البائعين. أعرف بالضبط مع من أتعامل قبل البدء." },
  { name: "فيصل الراشد", role: "مستقل محترف", text: "بصفتي مستقل، سرعات وفّرت لي تدفقاً مستمراً من المشاريع. النظام عادل والمدفوعات تصل في موعدها." },
];

function Counter({ to, suffix = "+" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(); const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.floor(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span>{n.toLocaleString("ar-SA")}{suffix}</span>;
}

export function Landing() {
  const [mode, setMode] = useState<Mode>("services");
  const [animatedText, setAnimatedText] = useState(0);
  const headlines = mode === "services"
    ? ["اعثر على الخدمة المثالية", "بأسعار تبدأ من 50 ريال", "وتسليم خلال 24 ساعة"]
    : ["انشر مشروعك الآن", "واستقبل عروض المستقلين", "خلال دقائق معدودة"];

  useEffect(() => {
    const id = setInterval(() => setAnimatedText((i) => (i + 1) % headlines.length), 2800);
    return () => clearInterval(id);
  }, [headlines.length]);

  return (
    <div className="min-h-screen bg-background">
      <Header mode={mode} onModeChange={setMode} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-primary-glow/30 blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 py-20 lg:px-6 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>أكثر من 12,000 مستقل عربي محترف</span>
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-[1.15] tracking-tight md:text-6xl">
                <span className="block min-h-[1.3em] transition-all duration-500" key={animatedText}>
                  <span className="bg-gradient-to-l from-accent to-amber-300 bg-clip-text text-transparent">
                    {headlines[animatedText]}
                  </span>
                </span>
                <span className="mt-2 block text-white/90">على منصة سرعات</span>
              </h1>
              <p className="mb-8 max-w-xl text-lg text-white/70">
                منصة واحدة تجمع الخدمات الجاهزة والمشاريع المخصصة. اشترِ خدمة بسعر ثابت، أو انشر مشروعك واستقبل عروض أفضل المستقلين العرب.
              </p>

              {/* Mode toggle big */}
              <div className="mb-5 inline-flex rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur">
                <button
                  onClick={() => setMode("services")}
                  className={cn(
                    "rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                    mode === "services" ? "bg-accent text-accent-foreground shadow-glow" : "text-white/70 hover:text-white",
                  )}
                >
                  أبحث عن خدمة
                </button>
                <button
                  onClick={() => setMode("projects")}
                  className={cn(
                    "rounded-xl px-6 py-2.5 text-sm font-bold transition-all",
                    mode === "projects" ? "bg-accent text-accent-foreground shadow-glow" : "text-white/70 hover:text-white",
                  )}
                >
                  لدي مشروع
                </button>
              </div>

              {/* Search bar */}
              <div className="flex flex-col gap-3 rounded-2xl bg-white/95 p-2 shadow-elevated sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder={mode === "services" ? "جرّب: تصميم شعار، تطوير موقع، حملة إعلانية..." : "جرّب: متجر إلكتروني، تطبيق جوال..."}
                    className="h-12 w-full rounded-xl border-0 bg-transparent pr-12 pl-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button variant="hero" size="xl" className="rounded-xl">
                  بحث
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                <span className="font-semibold text-white/90">الأكثر طلباً:</span>
                {["تصميم شعار", "موقع إلكتروني", "حملة إعلانية", "تطبيق جوال"].map((t) => (
                  <a key={t} href="#" className="rounded-full border border-white/15 px-3 py-1 hover:border-accent hover:text-accent">{t}</a>
                ))}
              </div>
            </div>

            {/* Floating cards preview */}
            <div className="relative hidden h-[480px] lg:block">
              <div className="absolute right-0 top-4 w-72 rounded-2xl border border-white/10 bg-white/95 p-5 text-foreground shadow-elevated">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-accent font-bold text-accent-foreground">ن</div>
                  <div>
                    <div className="text-sm font-bold">نورة العتيبي</div>
                    <div className="text-xs text-muted-foreground">مستقلة نخبة ✓</div>
                  </div>
                </div>
                <div className="mb-3 font-semibold leading-snug">تصميم هوية بصرية احترافية وشعار مميز</div>
                <div className="mb-3 flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="font-bold">4.9</span>
                  <span className="text-muted-foreground">(312 تقييم)</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">يبدأ من</span>
                  <span className="text-xl font-extrabold text-accent">350 ر.س</span>
                </div>
              </div>

              <div className="absolute right-16 top-56 w-72 rounded-2xl bg-gradient-accent p-5 text-accent-foreground shadow-glow">
                <div className="mb-2 text-xs font-semibold opacity-90">مشروع جديد</div>
                <div className="mb-3 font-bold leading-snug">تطوير منصة تجارة إلكترونية</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="rounded-full bg-white/20 px-3 py-1 font-bold">8,000 - 15,000 ر.س</span>
                  <span className="opacity-90">23 عرض</span>
                </div>
              </div>

              <div className="absolute left-0 bottom-4 w-64 rounded-2xl border border-white/10 bg-white/95 p-4 text-foreground shadow-elevated">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-9 w-9 text-success" />
                  <div>
                    <div className="text-sm font-bold">تم التسليم</div>
                    <div className="text-xs text-muted-foreground">دفعة 1,200 ر.س محرّرة</div>
                  </div>
                </div>
              </div>

              <div className="absolute left-12 top-0 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Sparkles className="h-8 w-8 text-accent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border bg-card">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-12 md:grid-cols-4 lg:px-6">
          {[
            { value: 12500, label: "مستقل محترف", icon: Users },
            { value: 38000, label: "خدمة منشورة", icon: Briefcase },
            { value: 95000, label: "مشروع مكتمل", icon: CheckCircle2 },
            { value: 4800, label: "عميل سعيد", icon: Star },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft">
                <s.icon className="h-6 w-6 text-accent" />
              </div>
              <div className="text-3xl font-extrabold text-primary md:text-4xl"><Counter to={s.value} /></div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4 py-20 lg:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-extrabold text-primary md:text-4xl">تصفّح حسب التصنيف</h2>
            <p className="text-muted-foreground">عشرات التصنيفات لتلبية كل احتياجاتك المهنية</p>
          </div>
          <a href="#" className="hidden items-center gap-1 text-sm font-bold text-accent hover:underline md:inline-flex">
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <a key={c.name} href="#" className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-5 transition-all hover:-translate-y-1 hover:shadow-elevated",
              c.color,
            )}>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-soft transition-transform group-hover:scale-110">
                <c.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="font-bold text-primary">{c.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.count} خدمة</div>
            </a>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-extrabold text-primary md:text-4xl">كيف تعمل سرعات؟</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              {mode === "services" ? "ثلاث خطوات بسيطة للحصول على خدمتك" : "ثلاث خطوات لنشر مشروعك واستقبال العروض"}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {(mode === "services"
              ? [
                  { icon: Search, title: "1. ابحث واكتشف", text: "تصفّح آلاف الخدمات من أفضل المستقلين العرب أو ابحث بالكلمة المفتاحية." },
                  { icon: Zap, title: "2. اطلب الخدمة", text: "اختر الباقة المناسبة، أرسل المتطلبات، وتابع التقدم لحظة بلحظة." },
                  { icon: CheckCircle2, title: "3. استلم وقيّم", text: "استلم العمل، اطلب تعديلات إن لزم، ثم قيّم المستقل لمساعدة الآخرين." },
                ]
              : [
                  { icon: PenTool, title: "1. انشر مشروعك", text: "اكتب وصفاً واضحاً، حدّد الميزانية والمدة، واختر المهارات المطلوبة." },
                  { icon: Users, title: "2. استقبل العروض", text: "يتقدم المستقلون بعروض مفصلة، قارن بينها وراجع ملفاتهم الشخصية." },
                  { icon: TrendingUp, title: "3. ابدأ وأنجز", text: "اختر المستقل المناسب، تابع المشروع عبر لوحة الإدارة، وادفع بأمان." },
                ]
            ).map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-gradient-card p-7 shadow-soft transition hover:shadow-elevated">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow">
                  <s.icon className="h-7 w-7 text-accent-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-primary">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED SERVICES */}
      <section className="container mx-auto px-4 py-20 lg:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-extrabold text-primary md:text-4xl">خدمات مميزة</h2>
            <p className="text-muted-foreground">أعلى الخدمات تقييماً هذا الأسبوع</p>
          </div>
          <a href="#" className="hidden items-center gap-1 text-sm font-bold text-accent hover:underline md:inline-flex">
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </a>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <article key={i} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-elevated">
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/90 to-primary-glow">
                <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/10">سرعات</div>
                {s.badge && (
                  <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-glow">
                    {s.badge}
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-accent text-sm font-bold text-accent-foreground">
                    {s.seller[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{s.seller}</div>
                    <div className="text-xs text-muted-foreground">{s.level} ✓</div>
                  </div>
                </div>
                <h3 className="mb-3 line-clamp-2 min-h-[3rem] font-semibold leading-snug text-foreground group-hover:text-accent">
                  {s.title}
                </h3>
                <div className="mb-4 flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="font-bold">{s.rating}</span>
                  <span className="text-muted-foreground">({s.reviews})</span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{s.days} أيام</span>
                </div>
                <div className="flex items-end justify-between border-t border-border pt-4">
                  <div>
                    <div className="text-xs text-muted-foreground">يبدأ من</div>
                    <div className="text-2xl font-extrabold text-accent">{s.price} <span className="text-sm">ر.س</span></div>
                  </div>
                  <Button variant="navy" size="sm">اطلب الآن</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* LATEST PROJECTS */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-extrabold text-primary md:text-4xl">أحدث المشاريع</h2>
              <p className="text-muted-foreground">فرص جديدة تنتظر المستقلين الموهوبين</p>
            </div>
            <Button variant="hero">انشر مشروعك</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {PROJECTS.map((p, i) => (
              <article key={i} className="rounded-2xl border border-border bg-background p-6 shadow-soft transition hover:border-accent/40 hover:shadow-elevated">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold leading-snug text-primary">{p.title}</h3>
                  <span className="shrink-0 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">مفتوح</span>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {p.skills.map((s) => (
                    <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground/70">{s}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">الميزانية</div>
                    <div className="font-extrabold text-accent">{p.budget} ر.س</div>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {p.proposals} عرض</span>
                    <span>{p.time}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TOP FREELANCERS */}
      <section className="container mx-auto px-4 py-20 lg:px-6">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-extrabold text-primary md:text-4xl">نخبة المستقلين</h2>
          <p className="text-muted-foreground">تعرّف على أفضل المواهب على المنصة</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TOP_FREELANCERS.map((f, i) => (
            <div key={i} className="group rounded-2xl border border-border bg-card p-6 text-center shadow-soft transition hover:-translate-y-1 hover:shadow-elevated">
              <div className="relative mx-auto mb-4 h-20 w-20">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-accent text-2xl font-extrabold text-accent-foreground shadow-glow">
                  {f.name[0]}
                </div>
                <span className="absolute -bottom-1 -left-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{f.level}</span>
              </div>
              <div className="mb-1 font-bold text-primary">{f.name}</div>
              <div className="mb-3 text-xs text-muted-foreground">{f.title}</div>
              <div className="flex items-center justify-center gap-3 border-t border-border pt-3 text-sm">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" /> {f.rating}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{f.orders} طلب</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-gradient-hero py-20 text-primary-foreground">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-extrabold md:text-4xl">لماذا سرعات؟</h2>
            <p className="mx-auto max-w-xl text-white/70">ميزات مصممة لتجربة عمل حر استثنائية</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Shield, title: "حماية الدفع", text: "نظام ضمان آمن يحمي حقوق المشتري والبائع في كل صفقة." },
              { icon: Bot, title: "مساعد ذكي", text: "ذكاء اصطناعي يساعدك على كتابة وصف خدمتك واقتراح أفضل سعر." },
              { icon: Zap, title: "خدمات سريعة", text: "قسم مخصص للخدمات التي تُسلَّم خلال 24 ساعة فقط." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-glow">
                  <f.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{f.title}</h3>
                <p className="text-white/70 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container mx-auto px-4 py-20 lg:px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-extrabold text-primary md:text-4xl">ماذا يقول مستخدمونا</h2>
          <p className="text-muted-foreground">آلاف القصص الناجحة على منصة سرعات</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="relative rounded-2xl border border-border bg-card p-7 shadow-soft">
              <Quote className="absolute right-6 top-6 h-8 w-8 rotate-180 text-accent/20" />
              <p className="mb-6 leading-relaxed text-foreground/90">{t.text}</p>
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-accent font-bold text-accent-foreground">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-bold text-primary">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20 lg:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center text-primary-foreground shadow-elevated md:p-16">
          <div className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <h2 className="mb-4 text-3xl font-extrabold md:text-5xl">ابدأ رحلتك مع سرعات اليوم</h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-white/80">
              انضم لآلاف المستقلين وأصحاب الأعمال الذين يحققون نجاحات يومية على منصتنا.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="hero" size="xl">سجّل كمستقل</Button>
              <Button variant="heroOutline" size="xl">انشر مشروعاً</Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
