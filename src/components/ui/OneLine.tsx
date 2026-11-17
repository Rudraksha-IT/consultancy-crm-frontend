import clsx from "clsx";

type OneLineProps = {
  /** The text; all of it shows on hover, and screen readers always hear all of it. */
  children: string;
  /** A line of its own (a div) rather than inside a line (a span). */
  block?: boolean;
  className?: string;
};

/**
 * Text kept on one line and cut with … when its box is too narrow, e.g. a name in a table cell
 * that gives up width so the table fits its panel instead of scrolling sideways.
 */
export function OneLine({ children, block = false, className }: OneLineProps) {
  const Tag = block ? "div" : "span";
  return (
    <Tag title={children} className={clsx("truncate", className)}>
      {children}
    </Tag>
  );
}
