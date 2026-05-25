"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteShell, SiteNav, SiteFooter } from "@/components/layout/site-shell";
import { StepIndicator } from "@/components/layout/step-indicator";
import { Upload, ShieldCheck, Zap, FileText, Check, ArrowRight } from "lucide-react";

const HARDCODED_ISSUES = [
  {
    column: "country",
    issue_type: "Format standardise",
    description: "Mixed values found: US, USA, United States in the same column.",
    suggested_fix: "Standardise all values to ISO 3166-1 alpha-2 two-letter codes.",
    confidence: 0.97,
  },
  {
    column: "email",
    issue_type: "Null fill",
    description: "34 missing values detected in the email column.",
    suggested_fix: "Drop rows where email is null.",
    confidence: 0.88,
  },
  {
    column: "signup_date",
    issue_type: "Type coerce",
    description: "Dates are stored as plain strings in three different formats.",
    suggested_fix: "Parse all values to ISO 8601 YYYY-MM-DD format.",
    confidence: 0.95,
  },
  {
    column: "user_id",
    issue_type: "Duplicate flag",
    description: "12 rows appear to be exact duplicates of other rows.",
    suggested_fix: "Remove duplicate rows, keeping the first occurrence.",
    confidence: 0.91,
  },
  {
    column: "revenue",
    issue_type: "Outlier flag",
    description: "3 values are more than 4 standard deviations from the mean.",
    suggested_fix: "Review these rows manually before deciding to remove them.",
    confidence: 0.74,
  },
];

const FEATURES = [
  {
    title: "Plain-language fixes",
    body: "Each issue ships with a short explanation — no jargon wall.",
  },
  {
    title: "You approve everything",
    body: "Accept or skip per row. Nothing mutates without a click.",
  },
  {
    title: "Audit on export",
    body: "Download the cleaned CSV plus a JSON log of every change.",
  },
];

const STEPS = [
  { n: 1, title: "Upload your file", body: "CSV or Excel. No signup." },
  { n: 2, title: "AI surfaces issues", body: "Nulls, types, dupes, formats — ranked by confidence." },
  { n: 3, title: "Pick your fixes", body: "Toggle accept per finding. Skip what you disagree with." },
  { n: 4, title: "Export clean data", body: "Get the file and a change log you can share." },
];

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Reading your file...");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading) {
      const messages = [
        "Reading your file...",
        "Profiling columns...",
        "Scanning for patterns...",
        "Almost done...",
      ];
      let idx = 0;
      setLoadingMessage(messages[0]);
      const interval = setInterval(() => {
        idx = (idx + 1) % messages.length;
        setLoadingMessage(messages[idx]);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading && file) {
      const timer = setTimeout(() => {
        localStorage.setItem("dp_issues", JSON.stringify(HARDCODED_ISSUES));
        localStorage.setItem("dp_filename", file.name);
        setIsLoading(false);
        router.push("/issues");
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, file, router]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const dropped = e.dataTransfer.files[0];
      const ext = dropped.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "xlsx") setFile(dropped);
      else alert("Only CSV and XLSX files are accepted.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "xlsx") setFile(selected);
      else alert("Only CSV and XLSX files are accepted.");
    }
  };

  const handleButtonClick = () => fileInputRef.current?.click();

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => handleButtonClick(), 400);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <SiteShell>
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-8">
        {/* Hero — full viewport feel on mobile, compact on desktop */}
        <section className="grid gap-10 py-10 md:grid-cols-12 md:gap-12 md:py-14 lg:py-16">
          <div className="flex flex-col justify-center gap-5 md:col-span-6 lg:col-span-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">
              Data cleaning · Preview
            </p>
            <h1 className="font-display text-[clamp(1.75rem,4vw,2.65rem)] font-semibold leading-[1.15] tracking-tight text-stone-900">
              Messy spreadsheets,{" "}
              <span className="text-teal-800">fixed in one pass</span>
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-stone-600">
              Upload a CSV, review what the model found, accept only the fixes you
              trust — then export with a full audit trail.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={scrollToUpload}
                className="h-10 rounded-lg bg-teal-800 px-5 text-sm font-medium text-white shadow-none transition-all duration-200 hover:bg-teal-900 hover:scale-[1.02] active:scale-[0.98]"
              >
                Upload a file
                <ArrowRight className="ml-1 h-3.5 w-3.5 opacity-80" />
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="h-10 rounded-lg border-stone-200 bg-white/50 text-sm text-stone-700 shadow-none transition-all duration-200 hover:bg-white hover:scale-[1.02] active:scale-[0.98]"
              >
                See how it works
              </Button>
            </div>
            <div className="flex flex-wrap gap-5 pt-1 text-[12px] text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-stone-400" />
                Nothing stored server-side
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-stone-400" />
                ~10s typical run
              </span>
            </div>
          </div>

          {/* Upload card */}
          <div ref={uploadRef} className="md:col-span-6 lg:col-span-7 scroll-mt-20">
            <Card className="overflow-hidden rounded-2xl border-stone-200/90 bg-white/80 shadow-[0_8px_30px_oklch(0.2_0_0/0.06)] backdrop-blur-sm">
              <StepIndicator current={1} />
              <CardContent className="p-5 sm:p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-teal-700" />
                    <div>
                      <p className="text-sm font-medium text-stone-700">{loadingMessage}</p>
                      <p className="mt-1 text-xs text-stone-400">Usually under ten seconds</p>
                    </div>
                  </div>
                ) : !file ? (
                  <>
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={handleButtonClick}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 transition-colors sm:py-14 ${
                        dragActive
                          ? "border-teal-600/50 bg-teal-50/40"
                          : "border-stone-200 bg-stone-50/50 hover:border-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Upload className="mb-3 h-8 w-8 text-stone-300" strokeWidth={1.25} />
                      <p className="text-sm font-medium text-stone-800">Drop file here</p>
                      <p className="mt-0.5 text-xs text-stone-400">or click to browse</p>
                      <div className="mt-4 flex gap-2">
                        {["CSV", "XLSX"].map((fmt) => (
                          <span
                            key={fmt}
                            className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-stone-500 ring-1 ring-stone-200/80"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-teal-200/80 bg-teal-50/50 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-teal-800" />
                        <span className="truncate text-sm font-medium text-teal-950">
                          {file.name}
                        </span>
                        <span className="shrink-0 text-xs text-teal-700/80">
                          {formatBytes(file.size)}
                        </span>
                      </div>
                      <Check className="h-4 w-4 shrink-0 text-teal-700" />
                    </div>
                    <Button
                      onClick={() => setIsLoading(true)}
                      className="h-10 w-full rounded-lg bg-teal-800 text-sm font-medium hover:bg-teal-900"
                    >
                      Run analysis
                    </Button>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-center text-xs text-stone-400 transition-colors hover:text-stone-600"
                    >
                      Choose a different file
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Minimal features — scroll target */}
        <section
          id="features"
          className="scroll-mt-20 border-t border-stone-200/60 py-14 md:py-16"
        >
          <div className="mb-8 max-w-lg">
            <h2 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">
              Built for reviewers, not black boxes
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Three things we cared about for the hackathon demo — nothing extra on
              the landing page.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className="rounded-xl border border-stone-200/80 bg-white/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_oklch(0.2_0_0/0.06)] hover:bg-white"
              >
                <span className="text-[11px] tabular-nums text-stone-350">
                  0{i + 1}
                </span>
                <h3 className="mt-2 text-[15px] font-medium text-stone-900">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-t border-stone-200/60 py-14 md:py-16"
        >
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">
                How it works
              </h2>
              <p className="mt-2 max-w-sm text-sm text-stone-500">
                Four steps from upload to export. The review screen is where you
                spend most of your time.
              </p>
            </div>
            <ol className="flex flex-col gap-0">
              {STEPS.map((step, i) => (
                <li key={step.n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-medium text-stone-700 ring-1 ring-stone-200/90">
                      {step.n}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className="my-1 w-px flex-1 min-h-[1.25rem] bg-stone-200" />
                    )}
                  </div>
                  <div className={i < STEPS.length - 1 ? "pb-6" : "pb-0"}>
                    <h3 className="text-sm font-medium text-stone-900">{step.title}</h3>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-stone-500">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Privacy & Trust Section */}
        <section className="border-t border-stone-200/60 py-16 text-center">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">
              Private & secure by design
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-500">
              DataPulse processes spreadsheets entirely inside your browser session. Your dataset is never uploaded to, stored on, or shared with external servers.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13px] text-stone-550">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                No server-side uploads
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                No persistent cookies
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                100% browser sandbox execution
              </span>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </SiteShell>
  );
}
