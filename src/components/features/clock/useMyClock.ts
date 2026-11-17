"use client";

import { useCallback, useEffect, useState } from "react";

import { CLOCK_TICK_MS } from "@/constants/clock";
import { fetchMyClock, type MyClock } from "@/lib/api";

export type MyClockState =
  | { status: "loading" }
  | { status: "failed" }
  | {
      status: "loaded";
      clock: MyClock;
      /** When the answer came, by the browser's steady clock (for the timer only). */
      answeredAt: number;
    };

export type MyClockLoad = {
  state: MyClockState;
  /** Show an answer the server just gave (after clocking in or out). */
  show: (clock: MyClock) => void;
  /** How long ago the answer came, in milliseconds; moves on every tick while clocked in. */
  sinceAnswerMs: number;
};

/**
 * My clock from the server, read again whenever the window gets focus (spec 103). The timer
 * counts from the server's own "now" plus the browser's steady clock since that answer, so a
 * wrong clock on the computer never changes it.
 */
export function useMyClock(): MyClockLoad {
  const [state, setState] = useState<MyClockState>({ status: "loading" });
  const [now, setNow] = useState(() => performance.now());

  const show = useCallback((clock: MyClock) => {
    const answeredAt = performance.now();
    setNow(answeredAt);
    setState({ status: "loaded", clock, answeredAt });
  }, []);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const clock = await fetchMyClock();
        if (!isCancelled) show(clock);
      } catch {
        if (!isCancelled)
          setState((known) => (known.status === "loaded" ? known : { status: "failed" }));
      }
    }
    void load();
    const reload = () => void load();
    window.addEventListener("focus", reload);
    return () => {
      isCancelled = true;
      window.removeEventListener("focus", reload);
    };
  }, [show]);

  const isOpen = state.status === "loaded" && state.clock.open !== null;
  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setInterval(() => {
      setNow(performance.now());
    }, CLOCK_TICK_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [isOpen]);

  const sinceAnswerMs = state.status === "loaded" ? now - state.answeredAt : 0;
  return { state, show, sinceAnswerMs };
}
