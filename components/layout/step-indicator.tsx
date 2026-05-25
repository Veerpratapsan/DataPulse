import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Review" },
  { id: 3, label: "Export" },
] as const;

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div
      className="grid grid-cols-3 overflow-hidden rounded-xl border border-stone-200/90 bg-white/70 text-center shadow-[0_1px_2px_oklch(0.2_0_0/0.04)]"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={3}
    >
      {STEPS.map((step, i) => {
        const isActive = step.id === current;
        const isDone = step.id < current;
        return (
          <div
            key={step.id}
            className={cn(
              "relative py-3 text-[11px] font-medium tracking-wide transition-colors sm:text-xs",
              isActive && "bg-teal-50/80 text-teal-900",
              isDone && !isActive && "text-teal-700/80",
              !isActive && !isDone && "text-stone-400",
              i > 0 && "border-l border-stone-200/80"
            )}
          >
            {isActive && (
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-600"
                aria-hidden
              />
            )}
            <span className="tabular-nums text-stone-400">{step.id}</span>
            <span className="mx-1 text-stone-300">·</span>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}
