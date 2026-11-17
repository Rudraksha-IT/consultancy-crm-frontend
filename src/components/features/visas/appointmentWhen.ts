import { appointmentWhen } from "@/constants/visas";
import { formatClockTime } from "@/lib/dates";

/**
 * A Visa appointment ("YYYY-MM-DDTHH:MM", the office's clock) as written on screen, e.g.
 * "20 Nov 2030 at 2:00 PM"; `formatDay` writes the day in the office's calendar.
 */
export function formatAppointment(at: string, formatDay: (iso: string) => string): string {
  const [day = "", time = ""] = at.split("T");
  return appointmentWhen(formatDay(day), formatClockTime(time));
}
