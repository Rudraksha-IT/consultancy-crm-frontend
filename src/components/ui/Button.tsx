import type { ReactNode } from "react";

import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";
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
  } = {
    ...DEFAULTS,
    ...props,
  };
  return (
    <button
      type={type}
      form={form}
      disabled={isDisabled || isLoading}
      aria-busy={isLoading}
      onClick={onClick}
      {...(hasFirstFocus ? { "data-first-focus": "" } : {})}
      data-variant={variant}
      className={buttonClasses(variant, size)}
    >
      <ButtonIcon icon={icon} />
      {isLoading ? (loadingLabel ?? children) : children}
    </button>
  );
}

function ButtonIcon({ icon }: { icon: IconName | undefined }) {
  return icon === undefined ? null : <Icon name={icon} size="sm" />;
}
