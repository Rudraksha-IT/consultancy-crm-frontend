import type { ReactNode, Ref } from "react";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";
import { LogoLoader } from "./LogoLoader";
import { Icon, type IconName } from "./Icon";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName | undefined;
  /** Only a form's main action submits it. */
  type?: "button" | "submit";
  /** The id of the form a submit button outside it submits (e.g. in a Dialog's footer). */
  form?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  /** Shown instead of the label while loading, e.g. "Saving…". */
  loadingLabel?: string;
  onClick?: () => void;
  /** Takes focus when its Dialog opens, e.g. Cancel in a confirm dialog. */
  hasFirstFocus?: boolean;
  /** Whether what the button opens is open (a picker shown under it). */
  isExpanded?: boolean;
  /** For an on/off button (`aria-pressed`), e.g. a chart shown as its table. */
  isPressed?: boolean;
  /** For giving the cursor back to the button, such as after what it opened closes. */
  ref?: Ref<HTMLButtonElement>;
  /**
   * The name screen readers hear when the words alone don't say which item it is for; it starts
   * with the visible words ("Use this: …"), so speech control still finds it.
   */
  label?: string | undefined;
};

const DEFAULTS = {
  variant: "secondary",
  size: "md",
  type: "button",
  isDisabled: false,
  isLoading: false,
  hasFirstFocus: false,
} as const;

/** The app's button: primary (one per screen area), secondary, ghost or danger. */
export function Button(props: ButtonProps) {
  const {
    children,
    variant,
    size,
    icon,
    type,
    form,
    isDisabled,
    isLoading,
    loadingLabel,
    onClick,
    hasFirstFocus,
    isExpanded,
    isPressed,
    ref,
    label,
  } = {
    ...DEFAULTS,
    ...props,
  };
  return (
    <button
      ref={ref}
      type={type}
      form={form}
      aria-expanded={isExpanded}
      aria-pressed={isPressed}
      aria-label={label}
      disabled={isDisabled || isLoading}
      aria-busy={isLoading}
      onClick={onClick}
      {...(hasFirstFocus ? { "data-first-focus": "" } : {})}
      data-variant={variant}
      className={buttonClasses(variant, size)}
    >
      <ButtonIcon icon={icon} isLoading={isLoading} />
      {isLoading ? (loadingLabel ?? children) : children}
    </button>
  );
}

/** The button's icon; while it works, the small logo loader instead (list tidy-ups 06). */
function ButtonIcon({ icon, isLoading }: { icon: IconName | undefined; isLoading: boolean }) {
  if (isLoading) return <LogoLoader size="button" />;
  return icon === undefined ? null : <Icon name={icon} size="sm" />;
}
