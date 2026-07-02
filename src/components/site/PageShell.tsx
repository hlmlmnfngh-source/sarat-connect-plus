import { ReactNode, useState } from "react";
import { Header, Mode } from "./Header";
import { Footer } from "./Footer";

export function PageShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("services");
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header mode={mode} onModeChange={setMode} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="border-b border-border bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
      <div className="container mx-auto px-4 py-14 text-center lg:px-6">
        <h1 className="text-3xl font-extrabold md:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-primary-foreground/80">{subtitle}</p>}
      </div>
    </section>
  );
}