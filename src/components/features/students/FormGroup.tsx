import type { ReactNode } from "react";

type FormGroupProps = { legend: string; isSingleColumn?: boolean; children: ReactNode };

/** A titled group of fields in a Student form, two columns from tablet width. */
export function FormGroup({ legend, isSingleColumn = false, children }: FormGroupProps) {
  return (
    <fieldset className="border-rule grid gap-4 border-t pt-5 first:border-t-0 first:pt-0">
      <legend className="text-card-title float-left mb-4 w-full">{legend}</legend>
      <div className={isSingleColumn ? "grid gap-5" : "tablet:grid-cols-2 grid gap-5"}>
        {children}
      </div>
    </fieldset>
  );
}
