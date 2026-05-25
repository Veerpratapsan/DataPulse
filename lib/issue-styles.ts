export function getIssueBadgeClasses(type: string): string {
  const t = type.toLowerCase().trim();
  if (t.includes("format")) return "bg-teal-50 text-teal-900 ring-1 ring-teal-200/80";
  if (t.includes("null")) return "bg-stone-100 text-stone-800 ring-1 ring-stone-200";
  if (t.includes("type")) return "bg-amber-50/90 text-amber-950 ring-1 ring-amber-200/70";
  if (t.includes("duplicate")) return "bg-orange-50 text-orange-950 ring-1 ring-orange-200/70";
  if (t.includes("outlier")) return "bg-sky-50 text-sky-950 ring-1 ring-sky-200/70";
  if (t.includes("enrich")) return "bg-rose-50 text-rose-950 ring-1 ring-rose-200/70";
  return "bg-stone-50 text-stone-700 ring-1 ring-stone-200";
}
