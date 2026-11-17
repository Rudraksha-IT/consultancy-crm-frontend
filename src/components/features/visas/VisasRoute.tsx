"use client";

import { useSearchParams } from "next/navigation";

import { APPOINTMENT_WHENS, AppointmentWhen } from "@/constants/visas";

import { VisasPage } from "./VisasPage";

/**
 * The Visas list, starting on an appointment filter when the address asks for one
 * (`?appointment=next_7`, the Home's link). Anything but a known choice is ignored.
 */
export function VisasRoute() {
  const asked = useSearchParams().get("appointment");
  const appointment = APPOINTMENT_WHENS.find((choice) => choice === asked) ?? AppointmentWhen.Any;
  return <VisasPage key={appointment} initialAppointment={appointment} />;
}
