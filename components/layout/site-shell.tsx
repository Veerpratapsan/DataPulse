"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-screen bg-background transition-colors duration-300", className)}>
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -right-[20%] -top-[30%] h-[55vh] w-[55vw] rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.52_0.08_195/0.12),transparent_68%)]" />
        <div className="absolute -left-[15%] top-[45%] h-[40vh] w-[45vw] rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.04_195/0.08),transparent_70%)]" />
      </div>
      {children}
    </div>
  );
}

export function SiteNav({ activeStep }: { activeStep?: 1 | 2 | 3 }) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 text-lg sm:text-2xl font-bold tracking-tight text-stone-900 transition-transform duration-200 hover:scale-[1.02]"
        >
          <span className="relative flex h-3.5 w-3.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-600/30 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-teal-700" />
          </span>
          DataPulse
        </Link>

        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="/#how-it-works"
              className="text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-800"
            >
              How it works
            </a>
            <a
              href="/#features"
              className="text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-800"
            >
              Features
            </a>
          </div>
          {activeStep !== undefined && (
            <span className="hidden text-[11px] tabular-nums text-stone-400 sm:inline">
              Step {activeStep} of 3
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200/70 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:px-8">
        <p className="text-[12px] leading-relaxed text-stone-400">
          Hackathon Track 04 — AI Meets Data
          <span className="mx-2 text-stone-300">·</span>
          Preview build, no account required
        </p>
      </div>
    </footer>
  );
}
