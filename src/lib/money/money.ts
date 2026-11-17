/** Amounts in NPR, written the way offices in Nepal write them (lakh and crore). */

const NPR_FORMAT = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** e.g. 125000 -> "NPR 1,25,000". */
export function formatNpr(amount: number): string {
  return `NPR ${NPR_FORMAT.format(amount)}`;
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
] as const;
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const TEEN_LIMIT = 20;
const TEN = 10;
const HUNDRED = 100;
/** Each place, largest first: what it's called and how many rupees it is. */
const PLACES = [
  ["Crore", 10_000_000],
  ["Lakh", 100_000],
  ["Thousand", 1_000],
] as const;

/** e.g. 25000 -> "Rupees Twenty-Five Thousand only", as a receipt writes it; "" for a bad amount. */
export function amountInWords(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0) return "";
  const words = placesInWords(amount);
  return `Rupees ${words === "" ? "Zero" : words} only`;
}

/** Crores, lakhs, thousands and the rest, each named; "" for zero. */
function placesInWords(amount: number): string {
  const parts: string[] = [];
  let left = amount;
  for (const [name, size] of PLACES) {
    const count = Math.floor(left / size);
    if (count > 0) parts.push(`${belowThousand(count)} ${name}`);
    left %= size;
  }
  if (left > 0) parts.push(belowThousand(left));
  return parts.join(" ");
}

/** 1 to 999 (or a whole count of crores, which may be more) in words. */
function belowThousand(value: number): string {
  const hundreds = Math.floor(value / HUNDRED);
  const rest = value % HUNDRED;
  const words: string[] = [];
  if (hundreds > 0) words.push(`${belowThousand(hundreds)} Hundred`);
  if (rest > 0) words.push(belowHundred(rest));
  return words.join(" ");
}

/** 1 to 99 in words, e.g. "Ninety-Nine". */
function belowHundred(value: number): string {
  if (value < TEEN_LIMIT) return wordAt(ONES, value);
  const tens = wordAt(TENS, Math.floor(value / TEN));
  const ones = wordAt(ONES, value % TEN);
  return ones === "" ? tens : `${tens}-${ones}`;
}

function wordAt(words: readonly string[], index: number): string {
  return words[index] ?? "";
}

const FULL = 100;

/** The share of the Fees paid so far, as a whole percentage; an overpayment counts as 100. */
export function paidShare(fees: number, paid: number): number {
  return fees > 0 ? Math.round((Math.min(paid, fees) / fees) * FULL) : 0;
}
