"use client";

import { useEffect, useState } from "react";

import { fetchPlatformAdmins, type PlatformAdminRow } from "@/lib/api";

export type PlatformAdminsState =
  { kind: "loading" } | { kind: "failed" } | { kind: "loaded"; admins: PlatformAdminRow[] };

/** Every Platform Admin, and a way to show one that was added or changed. */
export function usePlatformAdmins(): {
  state: PlatformAdminsState;
  show: (admin: PlatformAdminRow) => void;
} {
  const [state, setState] = useState<PlatformAdminsState>({ kind: "loading" });

  useEffect(() => {
    let isCurrent = true;
    fetchPlatformAdmins().then(
      (admins) => {
        if (isCurrent) setState({ kind: "loaded", admins });
      },
      () => {
        if (isCurrent) setState({ kind: "failed" });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);

  function show(admin: PlatformAdminRow): void {
    setState((now) => {
      if (now.kind !== "loaded") return now;
      const others = now.admins.filter((row) => row.id !== admin.id);
      const isNew = others.length === now.admins.length;
      const admins = isNew
        ? [...now.admins, admin]
        : now.admins.map((row) => (row.id === admin.id ? admin : row));
      return { kind: "loaded", admins };
    });
  }

  return { state, show };
}
