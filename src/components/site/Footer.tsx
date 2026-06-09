import { Sparkles, Twitter, Instagram, Linkedin, Youtube } from "lucide-react";

export function Footer() {
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
          <div className="mt-5 flex gap-3">
            {[Twitter, Instagram, Linkedin, Youtube].map((I, i) => (
              <a key={i} href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-accent">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {[
          { title: "المنصة", links: ["كيف تعمل", "الأسعار", "خدمات سريعة", "اختبارات المهارات", "المدونة"] },
          { title: "التصنيفات", links: ["برمجة وتطوير", "تصميم", "تسويق", "كتابة وترجمة", "فيديو وصوت"] },
          { title: "الدعم", links: ["مركز المساعدة", "تواصل معنا", "الشروط والأحكام", "سياسة الخصوصية", "الأمان"] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-base font-bold">{col.title}</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/70">
              {col.links.map((l) => (
                <li key={l}><a href="#" className="hover:text-accent">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-5 text-sm text-primary-foreground/60 md:flex-row lg:px-6">
          <p>© {new Date().getFullYear()} سرعات. جميع الحقوق محفوظة.</p>
          <p>صُنع بحب في المملكة العربية السعودية 🇸🇦</p>
        </div>
      </div>
    </footer>
  );
}
