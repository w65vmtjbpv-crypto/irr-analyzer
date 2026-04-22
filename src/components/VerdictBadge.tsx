import type { Verdict } from "@/types/insurance";

const verdictStyles: Record<Verdict, string> = {
  unscored: "bg-[#8ea8ff] text-[var(--foreground)]",
  excellent: "bg-[var(--accent)] text-[var(--foreground)]",
  good: "bg-[var(--accent-amber)] text-white",
  mediocre: "bg-[#ffd166] text-[var(--foreground)]",
  poor: "bg-[#ff9f6e] text-[var(--foreground)]",
  negative: "bg-[var(--accent-red)] text-white",
};

interface VerdictBadgeProps {
  verdict: Verdict;
  label: string;
}

export function VerdictBadge({ verdict, label }: VerdictBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border-[3px] border-[var(--border)] px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase shadow-[4px_4px_0_#111111] ${verdictStyles[verdict]}`}
    >
      {label}
    </span>
  );
}
