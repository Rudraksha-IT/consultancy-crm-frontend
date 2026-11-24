"use client";

import { useEffect, useState } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/useToast";
import { Loading } from "@/components/ui/Loading";
import { MY_SETTINGS_TEXT as TEXT } from "@/constants/mySettings";
import { fetchSignedInDevices, signOutOtherDevices, type SignedInDevice } from "@/lib/api";
import { localDayIso } from "@/lib/dates";

type DevicesState =
  { status: "loading" } | { status: "loaded"; devices: SignedInDevice[] } | { status: "failed" };

/**
 * Where I'm logged in (spec 22e, 135): each device named by browser and system, this browser
 * first, then the others still logged in, then the few most recently logged out. "Sign out of
 * other devices" ends every other login at once; those devices then show as logged out.
 */
export function DevicesSection() {
  const { showToast } = useToast();
  const [state, setState] = useState<DevicesState>({ status: "loading" });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    fetchSignedInDevices().then(
      (devices) => {
        if (!isCancelled) setState({ status: "loaded", devices });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, []);

  async function signOutOthers(): Promise<void> {
    setIsSigningOut(true);
    setProblem(null);
    try {
      await signOutOtherDevices();
      showToast(TEXT.signedOutOthers);
      setState({ status: "loaded", devices: await fetchSignedInDevices() });
    } catch {
      setProblem(TEXT.saveFailed);
    }
    setIsSigningOut(false);
  }

  if (state.status === "failed") return <Banner tone="problem">{TEXT.loadFailed}</Banner>;

  return (
    <Panel isPadded>
      {state.status === "loading" ? <Loading /> : <DeviceList devices={state.devices} />}
      {problem !== null && <Banner tone="problem">{problem}</Banner>}
      <div>
        <Button
          isLoading={isSigningOut}
          isDisabled={state.status !== "loaded"}
          onClick={() => void signOutOthers()}
        >
          {TEXT.signOutOthers}
        </Button>
      </div>
    </Panel>
  );
}

function DeviceList({ devices }: { devices: SignedInDevice[] }) {
  const signedIn = devices.filter((device) => device.loggedOutAt === null);
  const loggedOut = devices.filter((device) => device.loggedOutAt !== null);
  const hasOthers = signedIn.some((device) => !device.isCurrent);

  return (
    <ul className="grid gap-4">
      {signedIn.map((device) => (
        <DeviceRow key={deviceKey(device)} device={device} />
      ))}
      {!hasOthers && <li className="text-ink-2">{TEXT.noOtherDevices}</li>}
      {loggedOut.map((device) => (
        <DeviceRow key={deviceKey(device)} device={device} />
      ))}
    </ul>
  );
}

function deviceKey(device: SignedInDevice): string {
  return `${device.signedInAt}-${device.name}-${String(device.isCurrent)}`;
}

/** One device: its name ("Chrome on Windows"), then when it logged in, or when it logged out. */
function DeviceRow({ device }: { device: SignedInDevice }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-3">
        <Icon name={deviceIcon(device)} />
        <span className="grid min-w-0">
          <b className="font-semibold wrap-anywhere">{device.name}</b>
          <span className="text-small text-ink-2 wrap-anywhere">
            <DeviceTimes device={device} />
          </span>
        </span>
      </span>
      {device.isCurrent && device.loggedOutAt === null && <Chip tone="good">{TEXT.youreHere}</Chip>}
    </li>
  );
}

/** "This browser. Logged in …, last used …", or "Logged out on 12 Nov 2026". */
function DeviceTimes({ device }: { device: SignedInDevice }) {
  const dates = useDates();
  if (device.loggedOutAt !== null) {
    return TEXT.loggedOutOn(dates.date(localDayIso(device.loggedOutAt) ?? ""));
  }
  const times = TEXT.signedInOn(
    dates.dateTime(device.signedInAt),
    dates.dateTime(device.lastUsedAt),
  );
  return device.isCurrent ? `${TEXT.thisBrowser}. ${times}` : times;
}

function deviceIcon(device: SignedInDevice): "lock" | "shield" | "logout" {
  if (device.loggedOutAt !== null) return "logout";
  return device.isCurrent ? "lock" : "shield";
}
