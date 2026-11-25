import { shareOf } from "@/lib/charts";

const FULL = 100;

type ProgressBarProps = {
  label: string;
  value: number;
  max?: number;
  /** Money and progress bars are green: progress reads as "going well" (owner, 2026-11-25). */
};

/** A 12-high bar with the percentage written next to it. */
export function ProgressBar({ label, value, max = FULL }: ProgressBarProps) {
  const percent = Math.min(FULL, Math.max(0, shareOf(value, max)));

  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={FULL}
        aria-valuenow={percent}
        className="h-progress rounded-pill bg-fill-2 flex-1 overflow-hidden"
      >
        <div className="rounded-pill bg-good h-full" style={{ width: `${String(percent)}%` }} />
      </div>
      <span className="text-small text-ink-2 font-semibold">{percent}%</span>
    </div>
  );
}
