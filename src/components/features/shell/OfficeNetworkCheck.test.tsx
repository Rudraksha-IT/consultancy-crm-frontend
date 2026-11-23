import { uid } from "@/test/ids";
import { TEST_COLOURS } from "@/lib/theme/testColours";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OfficeNetworkSettings } from "@/components/features/configuration/OfficeNetworkSettings";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { NOT_NOW_KEY } from "@/lib/officeNetworkNotNow";
import { holdUnsavedChanges } from "@/lib/unsavedChanges";
import { testHost } from "@/test/hosts";
import { resetTheme } from "@/test/themes";

import { AppShell } from "./AppShell";

const route = vi.hoisted(() => ({ pathname: "/" }));
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => route.pathname }));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => vi.fn() }));

const CONTEXT_PATH = "/api/context/";
const CURRENT_PATH = "/api/office-networks/current/";
const LIST_PATH = "/api/office-networks/";
const HOUR_MS = 60 * 60 * 1000;

const OFFICE = "110.44.115.82";
const OFFICE_GROUP = "2400:1a00:b030:9::/64";
const LIMITS = { max_networks: 20, ipv4_widest_prefix: 24, ipv6_widest_prefix: 48 };

const ADMIN_CONTEXT = {
  staff: {
    id: uid(1),
    name: "Sita Sharma",
    email: "sita@acme.test",
    role: "admin",
    colour_mode: "light",
  },
  consultancy: { name: "Acme Education" },
  modules: ["students", "tasks", "configuration", "clock_in"],
  date_display: "AD",
  support_access: null,
  theme: {
    page: "stone",
    sidebar: TEST_COLOURS.white,
    accent: TEST_COLOURS.emerald,
    dark: { base: "soft", sidebar: "darker", accent: "auto" },
  },
};

type Current = { address: string | null; suggested_network: string | null; covered: boolean };

function notCovered(network = OFFICE): Current {
  return { address: network.replace("::/64", "::1"), suggested_network: network, covered: false };
}

type Fake = {
  fetchFn: ReturnType<typeof vi.fn<typeof fetch>>;
  /** What the current-network answer says from now on. */
  answer: (current: Current) => void;
  currentCalls: () => number;
  posts: () => unknown[];
};

/** The backend for the frame: the context, the current-network answer, adding a network. */
function fakeBackend(
  context: object = ADMIN_CONTEXT,
  first: Current = notCovered(),
  addAnswer: () => Response = () =>
    jsonResponse({ id: uid(900), label: "Office network", network: OFFICE }, 201),
): Fake {
  let current = first;
  const networks: unknown[] = [];
  function addOne(): Response {
    const response = addAnswer();
    if (response.ok) networks.push({ id: uid(900), label: "Office network", network: OFFICE });
    return response;
  }
  const answers: Record<string, () => Response> = {
    [`GET ${CONTEXT_PATH}`]: () => jsonResponse(context),
    [`GET ${CURRENT_PATH}`]: () => jsonResponse(current),
    [`GET ${LIST_PATH}`]: () => jsonResponse({ networks, limits: LIMITS }),
    [`POST ${LIST_PATH}`]: addOne,
  };
  const fetchFn = vi.fn<typeof fetch>().mockImplementation((path, init) => {
    const answer =
      typeof path === "string" ? answers[`${init?.method ?? "GET"} ${path}`] : undefined;
    return Promise.resolve(answer === undefined ? new Response(null, { status: 204 }) : answer());
  });
  vi.stubGlobal("fetch", fetchFn);
  return {
    fetchFn,
    answer: (next) => {
      current = next;
    },
    currentCalls: () => fetchFn.mock.calls.filter(([path]) => path === CURRENT_PATH).length,
    posts: () =>
      fetchFn.mock.calls
        .filter(([path, init]) => path === LIST_PATH && init?.method === "POST")
        .map(([, init]): unknown => JSON.parse(typeof init?.body === "string" ? init.body : "")),
  };
}

const TITLE = "This network isn't on your office list";

async function renderFrame(page: React.ReactNode = <button type="button">On the page</button>) {
  const view = render(<AppShell>{page}</AppShell>);
  await screen.findByRole("main");
  return view;
}

function theDialog() {
  return screen.queryByRole("dialog", { name: TITLE });
}

function setVisibility(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  route.pathname = "/";
  setVisibility("visible");
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  resetTheme();
});

describe("the Admin's office-network dialog (first live fixes, ticket 03)", () => {
  describe("who sees it", () => {
    it("shows over the page for an Admin on a network that isn't saved", async () => {
      fakeBackend();
      await renderFrame();

      const dialog = await screen.findByRole("dialog", { name: TITLE });
      expect(dialog).toHaveTextContent("Staff can clock in only from saved networks.");
      expect(dialog).toHaveTextContent("Adding it lets anyone on this network clock in and out.");
      expect(within(dialog).getByText("anyone on this network").tagName).toBe("STRONG");
      expect(dialog).toHaveTextContent(
        "Only add it if Staff should clock in from here. If it isn't the office network, don't add it.",
      );
      expect(within(dialog).getByRole("button", { name: "Add this network" })).toBeVisible();
      // The safe choice has focus first.
      expect(within(dialog).getByRole("button", { name: "Not now" })).toHaveFocus();
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it.each([
      ["a Counsellor", { ...ADMIN_CONTEXT, staff: { ...ADMIN_CONTEXT.staff, role: "counsellor" } }],
      ["a Front Desk", { ...ADMIN_CONTEXT, staff: { ...ADMIN_CONTEXT.staff, role: "front_desk" } }],
      ["a Teacher", { ...ADMIN_CONTEXT, staff: { ...ADMIN_CONTEXT.staff, role: "teacher" } }],
      [
        "a Platform Admin in Support Access",
        {
          ...ADMIN_CONTEXT,
          support_access: { platform_admin_name: "Ramesh", platform_host: testHost("admin") },
        },
      ],
      ["an office without Clock-in", { ...ADMIN_CONTEXT, modules: ["students", "configuration"] }],
    ])("never shows for %s, and never asks", async (_, context) => {
      const fake = fakeBackend(context);
      await renderFrame();

      await act(async () => {
        await Promise.resolve();
      });
      expect(theDialog()).toBeNull();
      expect(fake.currentCalls()).toBe(0);
    });

    it.each([
      ["a saved network", { address: OFFICE, suggested_network: OFFICE, covered: true }],
      [
        "an address that can't be known",
        { address: null, suggested_network: null, covered: false },
      ],
    ])("never shows on %s", async (_, current) => {
      const fake = fakeBackend(ADMIN_CONTEXT, current);
      await renderFrame();

      await waitFor(() => {
        expect(fake.currentCalls()).toBe(1);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(theDialog()).toBeNull();
    });

    it("stays away when the answer fails", async () => {
      const fake = fakeBackend();
      fake.fetchFn.mockImplementation((path) =>
        Promise.resolve(
          path === CONTEXT_PATH
            ? jsonResponse(ADMIN_CONTEXT)
            : path === CURRENT_PATH
              ? jsonResponse({ detail: "Something went wrong." }, 500)
              : new Response(null, { status: 204 }),
        ),
      );
      await renderFrame();

      await waitFor(() => {
        expect(fake.currentCalls()).toBe(1);
      });
      expect(theDialog()).toBeNull();
    });
  });

  describe("Add this network", () => {
    it("adds the suggested network, refreshes the office network list, confirms and closes", async () => {
      const fake = fakeBackend(ADMIN_CONTEXT, notCovered(OFFICE_GROUP));
      route.pathname = "/configuration";
      await renderFrame(<OfficeNetworkSettings />);
      const list = await screen.findByText(
        "No office network yet. Nobody can clock in until you add one.",
      );
      expect(list).toBeVisible();
      const dialog = await screen.findByRole("dialog", { name: TITLE });

      fake.answer({
        address: "2400:1a00:b030:9::1",
        suggested_network: OFFICE_GROUP,
        covered: true,
      });
      await userEvent.click(within(dialog).getByRole("button", { name: "Add this network" }));

      expect(fake.posts()).toEqual([{ label: "Office network", network: OFFICE_GROUP }]);
      await waitFor(() => {
        expect(theDialog()).toBeNull();
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        "Added. Staff on this connection can now clock in.",
      );
      // Configuration → Office network shows it without a reload.
      expect(await screen.findByRole("list", { name: "Office networks" })).toHaveTextContent(
        "Office network",
      );
    });

    it.each([
      [
        { detail: "An office can have at most 20 networks." },
        "An office can have at most 20 networks.",
      ],
      [
        { network: ["That network is already on the list."] },
        "That network is already on the list.",
      ],
    ])("shows a refusal in the dialog and changes nothing: %j", async (body, message) => {
      fakeBackend(ADMIN_CONTEXT, notCovered(), () => jsonResponse(body, 400));
      await renderFrame();
      const dialog = await screen.findByRole("dialog", { name: TITLE });

      await userEvent.click(within(dialog).getByRole("button", { name: "Add this network" }));

      expect(await within(dialog).findByText(message)).toBeVisible();
      expect(theDialog()).not.toBeNull();
      expect(window.localStorage.getItem(NOT_NOW_KEY)).toBeNull();
    });
  });

  describe("Not now", () => {
    it("hides it for that network on this device, keeping only a hash", async () => {
      const fake = fakeBackend();
      const { rerender } = await renderFrame();
      const dialog = await screen.findByRole("dialog", { name: TITLE });

      await userEvent.click(within(dialog).getByRole("button", { name: "Not now" }));
      await waitFor(() => {
        expect(theDialog()).toBeNull();
      });
      await waitFor(() => {
        expect(window.localStorage.getItem(NOT_NOW_KEY)).not.toBeNull();
      });
      expect(window.localStorage.getItem(NOT_NOW_KEY)).not.toContain("110.44");

      route.pathname = "/students";
      rerender(<AppShell>page two</AppShell>);
      await waitFor(() => {
        expect(fake.currentCalls()).toBe(2);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(theDialog()).toBeNull();
      expect(fake.posts()).toEqual([]);
    });

    it("shows again on a different unsaved network", async () => {
      const fake = fakeBackend();
      const { rerender } = await renderFrame();
      await userEvent.click(
        within(await screen.findByRole("dialog", { name: TITLE })).getByRole("button", {
          name: "Not now",
        }),
      );
      await waitFor(() => {
        expect(window.localStorage.getItem(NOT_NOW_KEY)).not.toBeNull();
      });

      fake.answer(notCovered(OFFICE_GROUP));
      route.pathname = "/students";
      rerender(<AppShell>page two</AppShell>);

      expect(await screen.findByRole("dialog", { name: TITLE })).toBeVisible();
    });

    it("is what Escape does, and focus goes back where it was", async () => {
      fakeBackend();
      await renderFrame();
      const dialog = await screen.findByRole("dialog", { name: TITLE });
      expect(within(dialog).getByRole("button", { name: "Not now" })).toHaveFocus();

      await userEvent.keyboard("{Escape}");

      await waitFor(() => {
        expect(theDialog()).toBeNull();
      });
      await waitFor(() => {
        expect(window.localStorage.getItem(NOT_NOW_KEY)).not.toBeNull();
      });
    });

    it("gives focus back to the control the Admin was on", async () => {
      fakeBackend();
      render(
        <AppShell>
          <button type="button" autoFocus>
            On the page
          </button>
        </AppShell>,
      );
      const onPage = await screen.findByRole("button", { name: "On the page" });
      onPage.focus();
      const dialog = await screen.findByRole("dialog", { name: TITLE });

      await userEvent.click(within(dialog).getByRole("button", { name: "Not now" }));

      await waitFor(() => {
        expect(onPage).toHaveFocus();
      });
    });
  });

  describe("when it checks", () => {
    it("checks again on every page change", async () => {
      const fake = fakeBackend(ADMIN_CONTEXT, {
        address: OFFICE,
        suggested_network: OFFICE,
        covered: true,
      });
      const { rerender } = await renderFrame();
      await waitFor(() => {
        expect(fake.currentCalls()).toBe(1);
      });

      fake.answer(notCovered());
      route.pathname = "/students";
      rerender(<AppShell>page two</AppShell>);

      expect(await screen.findByRole("dialog", { name: TITLE })).toBeVisible();
      expect(fake.currentCalls()).toBe(2);
    });

    it("checks when the tab is shown again, and never while it is hidden", async () => {
      const fake = fakeBackend(ADMIN_CONTEXT, {
        address: OFFICE,
        suggested_network: OFFICE,
        covered: true,
      });
      await renderFrame();
      await waitFor(() => {
        expect(fake.currentCalls()).toBe(1);
      });

      act(() => {
        setVisibility("hidden");
      });
      expect(fake.currentCalls()).toBe(1);
      fake.answer(notCovered());
      act(() => {
        setVisibility("visible");
      });

      expect(await screen.findByRole("dialog", { name: TITLE })).toBeVisible();
      expect(fake.currentCalls()).toBe(2);
    });

    it("checks once an hour while the tab is shown, and skips the hour while it is hidden", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const fake = fakeBackend(ADMIN_CONTEXT, {
        address: OFFICE,
        suggested_network: OFFICE,
        covered: true,
      });
      await renderFrame();
      await waitFor(() => {
        expect(fake.currentCalls()).toBe(1);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(HOUR_MS - 1000);
      });
      expect(fake.currentCalls()).toBe(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(fake.currentCalls()).toBe(2);

      act(() => {
        setVisibility("hidden");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(HOUR_MS);
      });
      expect(fake.currentCalls()).toBe(2);
    });

    it("never asks twice at once", async () => {
      const fake = fakeBackend();
      let finish: (response: Response) => void = () => undefined;
      fake.fetchFn.mockImplementation((path) => {
        if (path === CONTEXT_PATH) return Promise.resolve(jsonResponse(ADMIN_CONTEXT));
        if (path === CURRENT_PATH) {
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        }
        return Promise.resolve(new Response(null, { status: 204 }));
      });
      await renderFrame();
      await waitFor(() => {
        expect(fake.currentCalls()).toBe(1);
      });

      act(() => {
        setVisibility("visible");
      });
      expect(fake.currentCalls()).toBe(1);

      act(() => {
        finish(jsonResponse(notCovered()));
      });
      expect(await screen.findByRole("dialog", { name: TITLE })).toBeVisible();
    });
  });

  describe("never interrupts typing", () => {
    it("waits while a form has unsaved changes, then shows once they clear", async () => {
      fakeBackend();
      const release = holdUnsavedChanges();
      try {
        await renderFrame();
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
        });
        expect(theDialog()).toBeNull();
      } finally {
        act(() => {
          release();
        });
      }

      expect(await screen.findByRole("dialog", { name: TITLE })).toBeVisible();
    });

    it("never moves the page", async () => {
      const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
      fakeBackend();
      await renderFrame();
      const dialog = await screen.findByRole("dialog", { name: TITLE });

      await userEvent.click(within(dialog).getByRole("button", { name: "Not now" }));

      expect(scrollTo).not.toHaveBeenCalled();
      scrollTo.mockRestore();
    });
  });
});
