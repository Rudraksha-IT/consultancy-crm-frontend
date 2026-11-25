import clsx from "clsx";

import { Icon } from "@/components/ui/Icon";
import { LABELS } from "@/constants/messages";

type AuthStepsProps = {
  steps: readonly string[];
  /** The index of the step on screen. */
  current: number;
};

/** The numbered steps above a password screen; done steps get a tick, the current one stands out. */
export function AuthSteps({ steps, current }: AuthStepsProps) {
  return (
    <ol
      aria-label={LABELS.steps}
      className="text-small text-ink-3 flex flex-wrap justify-center gap-x-5 gap-y-2"
    >
      {steps.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? "step" : undefined}
          className={clsx("flex items-center gap-2", index === current && "text-ink font-semibold")}
        >
          <StepMark index={index} current={current} />
          {label}
        </li>
      ))}
    </ol>
  );
}

function StepMark({ index, current }: { index: number; current: number }) {
  const base = "rounded-pill grid size-6 place-items-center text-tiny font-semibold";
  if (index < current) {
    return (
      <span className={clsx(base, "bg-good-tint text-good")}>
        <Icon name="check" size="sm" />
      </span>
    );
  }
  const tone = index === current ? "bg-accent text-accent-ink" : "bg-fill-2";
  return <span className={clsx(base, tone)}>{String(index + 1)}</span>;
}
