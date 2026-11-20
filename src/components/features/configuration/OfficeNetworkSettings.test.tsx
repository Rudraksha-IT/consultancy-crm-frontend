import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { formatAdDateTime } from "@/lib/dates";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { OfficeNetworkSettings } from "./OfficeNetworkSettings";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Sita Sharma", email: "sita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["configuration", "clock_in"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const LIST_PATH = "/api/office-networks/";
const CURRENT_PATH = "/api/office-networks/current/";
const AT = "2026-10-12T04:19:00+00:00";
const LIMITS = { max_networks: 20, ipv4_widest_prefix: 24, ipv6_widest_prefix: 48 };
const MAIN = { id: 901, label: "Main office wifi", network: "110.44.115.82" };
const ADDED_MAIN = {
  id: 1,
  action: "added",
  label: "Main office wifi",
  network: "110.44.115.82",
  by: "Sita Sharma",
  at: AT,
};

function listOf(networks: unknown[] = [], changes: unknown[] = [], limits = LIMITS) {
  return { networks, changes, limits };
}

function renderSection() {
  render(
    <StaffContextContext value={ADMIN}>
      <ToastProvider>
        <OfficeNetworkSettings />
      </ToastProvider>
    </StaffContextContext>,
  );
  return screen.getByRole("region", { name: "Office network" });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OfficeNetworkSettings", () => {
  it("lists each network with its name and address, and the changes under it", async () => {
    backend(
      on("GET", LIST_PATH, listOf([MAIN], [ADDED_MAIN])),
      on("GET", CURRENT_PATH, { address: "27.34.20.9", covered: false }),
    );
    const section = renderSection();

    const list = within(await within(section).findByRole("list", { name: "Office networks" }));
    expect(list.getByText("Main office wifi")).toBeVisible();
    expect(list.getByText("110.44.115.82")).toBeVisible();
    expect(list.getByRole("button", { name: "Remove Main office wifi" })).toBeVisible();
    const changes = within(section).getByRole("list", { name: "Changes to the office network" });
    expect(changes).toHaveTextContent(
      `Added Main office wifi (110.44.115.82). Sita Sharma, ${formatAdDateTime(AT)}`,
    );
    expect(
      within(section).getByText(
        "Staff can clock in and out only from these internet connections. Add the office wifi while you're at the office. No location is ever recorded.",
      ),
    ).toBeVisible();
    expect(
      within(section).getByText(
        "Ask your internet provider for a fixed (static) address. If it changes, add the new one here. Phones on mobile data can't clock in. An office can have up to 20 networks.",
      ),
    ).toBeVisible();
  });

  it("says nobody can clock in while the list is empty", async () => {
    backend(
      on("GET", LIST_PATH, listOf()),
      on("GET", CURRENT_PATH, { address: null, covered: false }),
    );
    const section = renderSection();

    expect(
      await within(section).findByText(
        "No office network yet. Nobody can clock in until you add one.",
      ),
    ).toBeVisible();
    expect(
      within(section).queryByRole("list", { name: "Changes to the office network" }),
    ).not.toBeInTheDocument();
  });

  it("shows the limits the server has, not fixed numbers", async () => {
    backend(
      on("GET", LIST_PATH, listOf([], [], { ...LIMITS, max_networks: 5, ipv4_widest_prefix: 28 })),
      on("GET", CURRENT_PATH, { address: null, covered: false }),
    );
    const section = renderSection();

    expect(await within(section).findByText(/An office can have up to 5 networks\./)).toBeVisible();
    expect(within(section).getByLabelText("Internet address")).toHaveAccessibleDescription(
      "One address, or a small range such as 110.44.115.0/28.",
    );
  });

  it("shows a problem when the list can't be loaded", async () => {
    backend(on("GET", CURRENT_PATH, { address: null, covered: false }));
    const section = renderSection();

    expect(await within(section).findByRole("alert")).toHaveTextContent(
      "We couldn't load the office network. Please try again.",
    );
  });

  describe("Add the network I'm on now", () => {
    it("shows my address and adds it in one click", async () => {
      let networks: unknown[] = [];
      const fetchFn = backend(
        onEach("GET", LIST_PATH, () => listOf(networks)),
        onEach("GET", CURRENT_PATH, () => ({
          address: "110.44.115.82",
          covered: networks.length > 0,
        })),
        (path, init) => {
          if (path !== LIST_PATH || init?.method !== "POST") return undefined;
          networks = [{ id: 7, label: "Office network", network: "110.44.115.82" }];
          return new Response(JSON.stringify(networks[0]), { status: 201 });
        },
      );
      const section = renderSection();

      expect(await within(section).findByText("110.44.115.82")).toBeVisible();
      await userEvent.click(
        within(section).getByRole("button", { name: "Add the network I'm on now" }),
      );

      const [post] = callsTo(fetchFn, "POST", LIST_PATH);
      expect(post?.[1]?.body).toBe(
        JSON.stringify({ label: "Office network", network: "110.44.115.82" }),
      );
      expect(
        await screen.findByText("Added. Staff on this connection can now clock in."),
      ).toBeVisible();
      expect(await within(section).findByText("Already on the list")).toBeVisible();
      expect(
        within(section).queryByRole("button", { name: "Add the network I'm on now" }),
      ).not.toBeInTheDocument();
    });

    it("says when my address is already on the list, with no button", async () => {
      backend(
        on("GET", LIST_PATH, listOf([MAIN])),
        on("GET", CURRENT_PATH, { address: "110.44.115.82", covered: true }),
      );
      const section = renderSection();

      expect(await within(section).findByText("Already on the list")).toBeVisible();
      expect(
        within(section).queryByRole("button", { name: "Add the network I'm on now" }),
      ).not.toBeInTheDocument();
    });

    it("says when my address can't be seen", async () => {
      backend(
        on("GET", LIST_PATH, listOf()),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
      );
      const section = renderSection();

      expect(
        await within(section).findByText(
          "We can't see your internet address right now, so it can't be added from here.",
        ),
      ).toBeVisible();
      expect(
        within(section).queryByRole("button", { name: "Add the network I'm on now" }),
      ).not.toBeInTheDocument();
    });

    it("shows the server's reason when it is refused", async () => {
      backend(
        on("GET", LIST_PATH, listOf()),
        on("GET", CURRENT_PATH, { address: "110.44.115.82", covered: false }),
        on("POST", LIST_PATH, { detail: "An office can have at most 20 networks." }, 400),
      );
      const section = renderSection();

      await userEvent.click(
        await within(section).findByRole("button", { name: "Add the network I'm on now" }),
      );

      expect(await within(section).findByRole("alert")).toHaveTextContent(
        "An office can have at most 20 networks.",
      );
    });
    it("shows a field refusal too, e.g. when another entry already covers it", async () => {
      backend(
        on("GET", LIST_PATH, listOf()),
        on("GET", CURRENT_PATH, { address: "110.44.115.82", covered: false }),
        on("POST", LIST_PATH, { network: ["That network is already on the list."] }, 400),
      );
      const section = renderSection();

      await userEvent.click(
        await within(section).findByRole("button", { name: "Add the network I'm on now" }),
      );

      expect(await within(section).findByRole("alert")).toHaveTextContent(
        "That network is already on the list.",
      );
    });
  });

  describe("adding by hand", () => {
    it("adds a named network and clears the form", async () => {
      let networks: unknown[] = [];
      const fetchFn = backend(
        onEach("GET", LIST_PATH, () => listOf(networks)),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
        (path, init) => {
          if (path !== LIST_PATH || init?.method !== "POST") return undefined;
          networks = [{ id: 8, label: "Second floor wifi", network: "27.34.20.0/24" }];
          return new Response(JSON.stringify(networks[0]), { status: 201 });
        },
      );
      const section = renderSection();
      await within(section).findByText(/No office network yet/);

      await userEvent.type(within(section).getByLabelText("Name"), "  Second floor wifi ");
      await userEvent.type(within(section).getByLabelText("Internet address"), " 27.34.20.0/24");
      await userEvent.click(within(section).getByRole("button", { name: "Add network" }));

      const [post] = callsTo(fetchFn, "POST", LIST_PATH);
      expect(post?.[1]?.body).toBe(
        JSON.stringify({ label: "Second floor wifi", network: "27.34.20.0/24" }),
      );
      expect(await screen.findByText("Second floor wifi added")).toBeVisible();
      expect(await within(section).findByText("27.34.20.0/24")).toBeVisible();
      expect(within(section).getByLabelText("Name")).toHaveValue("");
      expect(within(section).getByLabelText("Internet address")).toHaveValue("");
    });

    it("asks for both fields before sending anything", async () => {
      const fetchFn = backend(
        on("GET", LIST_PATH, listOf()),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
      );
      const section = renderSection();
      await within(section).findByText(/No office network yet/);

      await userEvent.click(within(section).getByRole("button", { name: "Add network" }));

      expect(within(section).getByLabelText("Name")).toHaveAccessibleDescription(
        "Give the network a name.",
      );
      expect(within(section).getByLabelText("Internet address")).toHaveAccessibleDescription(
        "Enter the internet address, for example 110.44.115.82.",
      );
      expect(callsTo(fetchFn, "POST", LIST_PATH)).toHaveLength(0);
    });

    it("shows the server's refusal on the field and keeps what was typed", async () => {
      const refusal =
        "That's a private or reserved address, which only works inside the office. Use the address the internet sees, shown above.";
      backend(
        on("GET", LIST_PATH, listOf()),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
        on("POST", LIST_PATH, { network: [refusal] }, 400),
      );
      const section = renderSection();
      await within(section).findByText(/No office network yet/);

      await userEvent.type(within(section).getByLabelText("Name"), "Router");
      await userEvent.type(within(section).getByLabelText("Internet address"), "192.168.1.1");
      await userEvent.click(within(section).getByRole("button", { name: "Add network" }));

      await waitFor(() => {
        expect(within(section).getByLabelText("Internet address")).toHaveAccessibleDescription(
          refusal,
        );
      });
      expect(within(section).getByLabelText("Internet address")).toHaveValue("192.168.1.1");
    });

    it.each([
      [
        { detail: "An office can have at most 20 networks." },
        400,
        "An office can have at most 20 networks.",
      ],
      [{}, 500, "We couldn't add the network. Please try again."],
    ])("shows why the whole network was refused: %j", async (body, status, message) => {
      backend(
        on("GET", LIST_PATH, listOf()),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
        on("POST", LIST_PATH, body, status),
      );
      const section = renderSection();
      await within(section).findByText(/No office network yet/);

      await userEvent.type(within(section).getByLabelText("Name"), "Router");
      await userEvent.type(within(section).getByLabelText("Internet address"), "27.34.20.9");
      await userEvent.click(within(section).getByRole("button", { name: "Add network" }));

      expect(await within(section).findByRole("alert")).toHaveTextContent(message);
    });

    it("shows typed text as text, never as markup", async () => {
      const label = "<img src=x onerror=alert(1)>";
      backend(
        on("GET", LIST_PATH, listOf([{ ...MAIN, label }])),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
      );
      const section = renderSection();

      expect(await within(section).findByText(label)).toBeVisible();
      expect(section.querySelector("img")).toBeNull();
    });
  });

  describe("removing", () => {
    it("asks first, then removes it", async () => {
      let networks: unknown[] = [MAIN];
      const fetchFn = backend(
        onEach("GET", LIST_PATH, () => listOf(networks)),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
        (path, init) => {
          if (path !== "/api/office-networks/901/" || init?.method !== "DELETE") return undefined;
          networks = [];
          return new Response(null, { status: 204 });
        },
      );
      const section = renderSection();

      await userEvent.click(
        await within(section).findByRole("button", { name: "Remove Main office wifi" }),
      );
      const dialog = within(screen.getByRole("dialog", { name: "Remove Main office wifi?" }));
      expect(
        dialog.getByText(
          "Staff on 110.44.115.82 won't be able to clock in from it any more. You can add it again later.",
        ),
      ).toBeVisible();
      await userEvent.click(dialog.getByRole("button", { name: "Remove" }));

      expect(callsTo(fetchFn, "DELETE", "/api/office-networks/901/")).toHaveLength(1);
      expect(await screen.findByText("Main office wifi removed")).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(await within(section).findByText(/No office network yet/)).toBeVisible();
    });

    it("closes on Escape without removing", async () => {
      const fetchFn = backend(
        on("GET", LIST_PATH, listOf([MAIN])),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
      );
      const section = renderSection();

      await userEvent.click(
        await within(section).findByRole("button", { name: "Remove Main office wifi" }),
      );
      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(callsTo(fetchFn, "DELETE", "/api/office-networks/901/")).toHaveLength(0);
    });

    it("keeps the dialog open with a problem when removing fails", async () => {
      backend(
        on("GET", LIST_PATH, listOf([MAIN])),
        on("GET", CURRENT_PATH, { address: null, covered: false }),
      );
      const section = renderSection();

      await userEvent.click(
        await within(section).findByRole("button", { name: "Remove Main office wifi" }),
      );
      const dialog = within(screen.getByRole("dialog", { name: "Remove Main office wifi?" }));
      await userEvent.click(dialog.getByRole("button", { name: "Remove" }));

      expect(await dialog.findByRole("alert")).toHaveTextContent(
        "We couldn't remove it. Please try again.",
      );
    });
  });
});
