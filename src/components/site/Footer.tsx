import { Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  const sections: { title: string; links: { label: string; to: string }[] }[] = [
    {
      title: "المنصة",
      links: [
        { label: "كيف تعمل", to: "/" },
        { label: "الأسعار", to: "/pricing" },
        { label: "خدمات سريعة", to: "/fast-services" },
        { label: "اختبارات المهارات", to: "/skills-test" },
        { label: "المدونة", to: "/blog" },
      ],
    },
    {
      title: "التصنيفات",
      links: [
        { label: "برمجة وتطوير", to: "/services" },
        { label: "تصميم", to: "/services" },
        { label: "تسويق", to: "/services" },
        { label: "كتابة وترجمة", to: "/services" },
        { label: "فيديو وصوت", to: "/services" },
      ],
    },
    {
      title: "الدعم",
      links: [
        { label: "مركز المساعدة", to: "/help" },
        { label: "تواصل معنا", to: "/contact" },
        { label: "الشروط والأحكام", to: "/terms" },
        { label: "سياسة الخصوصية", to: "/privacy" },
        { label: "الأمان", to: "/security" },
      ],
    },
  ];
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-4 lg:px-6">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-accent shadow-glow">
              <Sparkles className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-2xl font-extrabold">سرعات</span>
          </div>
          <p className="text-sm text-primary-foreground/70">
            منصة سرعات تجمع الخدمات الجاهزة والمشاريع المخصصة في مكان واحد. سوق العمل الحر العربي بمعايير عالمية.
          </p>
        </div>
        {sections.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-base font-bold">{col.title}</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/70">
              {col.links.map((l) => (
                <li key={l.label}><Link to={l.to} className="hover:text-accent">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-5 text-center text-sm text-primary-foreground/60 lg:px-6">
          <p>© 2026 سرعات. جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  );
}
