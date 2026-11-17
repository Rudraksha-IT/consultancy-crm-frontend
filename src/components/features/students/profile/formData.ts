/** A text field's value from a submitted form; "" when it's missing. */
export function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
