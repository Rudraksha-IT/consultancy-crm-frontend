import clsx from "clsx";

const INITIALS_COUNT = 2;

type AvatarProps = {
  name: string;
  /** "xs" is the small round on a board card; "sm" the one in an Inbox list row. */
  size?: "xs" | "sm" | "md" | "lg";
};

const SIZE_CLASSES = {
  xs: "text-small size-6",
  sm: "text-small size-avatar-sm",
  md: "size-mark text-secondary",
  // 64, and 52 on phones (design system: Phones, Sizes and look).
  lg: "text-section-title max-phone:size-13 size-16",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word !== "")
    .slice(0, INITIALS_COUNT)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** A person's initials in a circle. Decorative: their name is always written next to it. */
export function Avatar({ name, size = "md" }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "rounded-pill bg-tint text-accent grid flex-none place-items-center font-semibold",
        SIZE_CLASSES[size],
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
