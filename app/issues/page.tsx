"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteShell, SiteNav } from "@/components/layout/site-shell";
import { StepIndicator } from "@/components/layout/step-indicator";
import { getIssueBadgeClasses } from "@/lib/issue-styles";
import { Check } from "lucide-react";

interface Issue {
  column: string;
  issue_type: string;
  description: string;
  suggested_fix: string;
  confidence: number;
}

const FALLBACK_ISSUES: Issue[] = [
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

export default function IssuesPage() {
  const router = useRouter();
  const [filename, setFilename] = useState<string>("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [acceptedIndices, setAcceptedIndices] = useState<number[]>([]);
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    const storedIssues = localStorage.getItem("dp_issues");
    const storedFilename = localStorage.getItem("dp_filename");

    if (storedIssues) {
      try {
        const parsed = JSON.parse(storedIssues);
        setIssues(parsed.length > 0 ? parsed : FALLBACK_ISSUES);
      } catch {
        setIssues(FALLBACK_ISSUES);
      }
    } else {
      setIssues(FALLBACK_ISSUES);
    }

    setFilename(storedFilename || "untitled.csv");
  }, []);

  const handleAccept = (idx: number) => {
    if (!acceptedIndices.includes(idx)) {
      setAcceptedIndices((prev) => [...prev, idx]);
    }
  };

  const handleSkip = (idx: number) => {
    if (!skippedIndices.includes(idx)) {
      setSkippedIndices((prev) => [...prev, idx]);
    }
  };

  const handleApplyFixes = async () => {
    if (!filename || acceptedIndices.length === 0) return;
    setIsApplying(true);
    setApplyError(null);

    const acceptedIssuesList = acceptedIndices.map((idx) => issues[idx]);
    const fallbackAudit = {
      cleaned_filename: `cleaned_${filename}`,
      audit_log: {
        rows_input: 4821,
        rows_output: 4821 - acceptedIssuesList.length,
        changes: acceptedIssuesList.map((issue) => ({
          column: issue.column,
          issue_type: issue.issue_type,
          description: issue.description,
        })),
      },
    };

    const API = process.env.NEXT_PUBLIC_API_URL;
    if (!API) {
      setApplyError("NEXT_PUBLIC_API_URL is not set.");
      setIsApplying(false);
      return;
    }

    try {
      const response = await fetch(`${API}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          accepted_issues: acceptedIssuesList,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          localStorage.setItem("dp_audit", JSON.stringify(fallbackAudit));
          setApplyError("Backend /apply endpoint not found. Showing demo export data.");
          router.push("/export");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      localStorage.setItem("dp_audit", JSON.stringify(data));
      router.push("/export");
    } catch (error) {
      // If API is offline/unreachable, keep the demo flow usable.
      localStorage.setItem("dp_audit", JSON.stringify(fallbackAudit));
      setApplyError("Backend is unreachable. Showing demo export data.");
      console.error("Failed to apply fixes, using fallback audit:", error);
      router.push("/export");
    } finally {
      setIsApplying(false);
    }
  };

  if (issues.length === 0) {
    return (
      <SiteShell className="flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-stone-500">No issues to review</p>
        <Button
          onClick={() => router.push("/")}
          className="rounded-lg bg-teal-800 text-white hover:bg-teal-900"
        >
          Go back
        </Button>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <SiteNav activeStep={2} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">
              Review findings
            </h1>
            <p className="mt-1 font-mono text-[13px] text-stone-400">{filename}</p>
            {applyError ? (
              <p className="mt-2 text-xs text-amber-700">{applyError}</p>
            ) : null}
          </div>
          <p className="text-[13px] text-stone-500">
            {issues.length} issue{issues.length !== 1 ? "s" : ""} detected
          </p>
        </header>

        <StepIndicator current={2} />

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {issues.map((issue, idx) => {
            const isAccepted = acceptedIndices.includes(idx);
            const isSkipped = skippedIndices.includes(idx);

            return (
              <Card
                key={idx}
                className={`overflow-hidden rounded-xl border transition-all duration-200 ${
                  isAccepted
                    ? "border-teal-200/90 bg-teal-50/30 shadow-none"
                    : "border-stone-200/90 bg-white/80 shadow-[0_1px_3px_oklch(0.2_0_0/0.04)]"
                } ${isSkipped ? "pointer-events-none opacity-35" : ""}`}
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-md border-0 bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-stone-700"
                    >
                      {issue.column}
                    </Badge>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getIssueBadgeClasses(issue.issue_type)}`}
                    >
                      {issue.issue_type}
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums text-stone-400">
                      {Math.round(issue.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-sm leading-snug text-stone-700">{issue.description}</p>
                  <p className="text-[12px] leading-snug text-stone-500">
                    <span className="text-stone-400">Suggested · </span>
                    {issue.suggested_fix}
                  </p>

                  <div className="h-1 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-teal-600/70 transition-all"
                      style={{ width: `${issue.confidence * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <Button
                      size="sm"
                      disabled={isAccepted}
                      onClick={() => handleAccept(idx)}
                      className={
                        isAccepted
                          ? "h-8 border-0 bg-transparent px-3 text-xs text-teal-800 shadow-none hover:bg-transparent"
                          : "h-8 rounded-lg bg-teal-800 px-3 text-xs transition-all duration-200 hover:bg-teal-900 hover:scale-[1.03] active:scale-[0.97]"
                      }
                    >
                      {isAccepted ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          Accepted
                        </span>
                      ) : (
                        "Accept"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSkip(idx)}
                      className="h-8 rounded-lg px-3 text-xs text-stone-500 transition-all duration-200 hover:bg-stone-100 hover:text-stone-800 hover:scale-[1.03] active:scale-[0.97]"
                    >
                      Skip
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200/90 bg-background/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <span className="text-sm text-stone-500">
            <span className="font-medium tabular-nums text-stone-800">
              {acceptedIndices.length}
            </span>{" "}
            of {issues.length} accepted
          </span>
          <Button
            onClick={handleApplyFixes}
            disabled={acceptedIndices.length === 0 || isApplying}
            className="h-9 rounded-lg bg-teal-800 px-4 text-sm font-medium hover:bg-teal-900 disabled:bg-stone-100 disabled:text-stone-400"
          >
            {isApplying ? "Applying…" : "Apply fixes →"}
          </Button>
        </div>
      </div>
    </SiteShell>
  );
}
