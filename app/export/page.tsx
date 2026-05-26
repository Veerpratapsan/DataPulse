"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteShell, SiteNav, SiteFooter } from "@/components/layout/site-shell";
import { StepIndicator } from "@/components/layout/step-indicator";
import { getIssueBadgeClasses } from "@/lib/issue-styles";

const FALLBACK_CHANGES = [
  {
    column: "country",
    issue_type: "Format standardise",
    description: "Mixed values found: US, USA, United States in the same column.",
  },
  {
    column: "email",
    issue_type: "Null fill",
    description: "34 missing values detected in the email column.",
  },
  {
    column: "signup_date",
    issue_type: "Type coerce",
    description: "Dates are stored as plain strings in three different formats.",
  },
  {
    column: "user_id",
    issue_type: "Duplicate flag",
    description: "12 rows appear to be exact duplicates of other rows.",
  },
  {
    column: "revenue",
    issue_type: "Outlier flag",
    description: "3 values are more than 4 standard deviations from the mean.",
  },
];

export default function ExportPage() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();
  const [auditData, setAuditData] = useState<Record<string, unknown> | null>(null);
  const [filename, setFilename] = useState<string>("test.csv");

  useEffect(() => {
    const storedAudit = localStorage.getItem("dp_audit");
    if (storedAudit) {
      try {
        setAuditData(JSON.parse(storedAudit));
      } catch (e) {
        console.error("Failed to parse dp_audit", e);
      }
    }

    const storedFilename = localStorage.getItem("dp_filename");
    if (storedFilename) setFilename(storedFilename);
  }, []);

  const handleStartOver = () => {
    localStorage.removeItem("dp_issues");
    localStorage.removeItem("dp_filename");
    localStorage.removeItem("dp_audit");
    localStorage.removeItem("dp_profile");
    router.push("/");
  };

  const auditLog = auditData?.audit_log as Record<string, unknown> | undefined;
  const cleanedFilename =
    (auditData?.cleaned_filename as string) || `cleaned_${filename}`;

  const rowsInput = (auditLog?.rows_input as number) ?? 4821;
  const rowsOutput = (auditLog?.rows_output as number) ?? 4798;
  const rowsRemoved = auditLog ? Math.max(0, rowsInput - rowsOutput) : 23;
  const changes = (auditLog?.changes as typeof FALLBACK_CHANGES) ?? FALLBACK_CHANGES;
  const issuesFixed = auditLog ? changes.length : 5;

  const handleDownloadAuditLog = () => {
    const logData =
      auditLog || { info: "Demo audit log", changes: FALLBACK_CHANGES };
    const blob = new Blob([JSON.stringify(logData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_log.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = [
    { label: "Rows removed", value: rowsRemoved, accent: "text-teal-800" },
    { label: "Issues fixed", value: issuesFixed, accent: "text-stone-800" },
    { label: "Original rows", value: rowsInput, accent: "text-stone-600" },
  ];

  return (
    <SiteShell>
      <SiteNav activeStep={3} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">
            Export ready
          </h1>
          <p className="mt-1 font-mono text-[13px] text-stone-400">{filename}</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <StepIndicator current={3} />

            <div className="grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-stone-200/80 bg-white/70 p-4 text-center"
                >
                  <span className={`block text-2xl font-medium tabular-nums ${s.accent}`}>
                    {s.value}
                  </span>
                  <span className="mt-1 block text-[11px] text-stone-400">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-10 flex-1 rounded-lg bg-teal-800 text-sm font-medium hover:bg-teal-900"
              >
                <a
                  href={API ? `${API}/download/${cleanedFilename}` : "#"}
                  download
                >
                  Download clean {filename.toLowerCase().endsWith(".csv") ? "CSV" : "Excel"}
                </a>
              </Button>
              <Button
                onClick={handleDownloadAuditLog}
                variant="outline"
                className="h-10 flex-1 rounded-lg border-stone-200 text-sm text-stone-700 shadow-none hover:bg-white"
              >
                Download audit log
              </Button>
            </div>

            <button
              type="button"
              onClick={handleStartOver}
              className="self-center text-xs text-stone-400 transition-colors hover:text-stone-600"
            >
              Start over with a new file
            </button>
          </div>

          <div className="lg:col-span-5">
            <Card className="rounded-2xl border-stone-200/90 bg-white/80 p-5 shadow-[0_1px_3px_oklch(0.2_0_0/0.04)]">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.15em] text-stone-400">
                Change log
              </h2>
              <ul className="mt-4 flex flex-col divide-y divide-stone-100">
                {changes.map((change, idx) => (
                  <li key={idx} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <Badge
                      variant="outline"
                      className="mt-0.5 shrink-0 rounded-md border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[10px] text-stone-600"
                    >
                      {change.column || "Dataset"}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${getIssueBadgeClasses(change.issue_type)}`}
                      >
                        {change.issue_type}
                      </span>
                      <p className="mt-1.5 text-xs leading-relaxed text-stone-600">
                        {change.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </main>

      <SiteFooter />
    </SiteShell>
  );
}
