import { ALWAYS_ON_MODULES, MODULES, Module } from "@/constants/modules";
import { Role } from "@/constants/roles";

import { buildNavigation } from "./navigation";

const ALL_MODULES = MODULES;
const WITHOUT_SWITCHABLE = ALWAYS_ON_MODULES;

function labels(role: Role, modules: readonly Module[]): string[] {
  return buildNavigation(role, modules).map((item) => item.label);
}

describe("buildNavigation", () => {
  it("gives an Admin every screen when every Module is on", () => {
    expect(labels(Role.Admin, ALL_MODULES)).toEqual([
      "Home",
      "Students",
      "Applications",
      "Visas",
      "Documents",
      "Classes",
      "Tasks",
      "Inbox",
      "Transfer requests",
      "Email & SMS",
      "Accounts",
      "Employees",
      "Reports",
      "Catalogue",
      "Configuration",
    ]);
  });

  it("keeps a Counsellor away from Admin-only screens", () => {
    expect(labels(Role.Counsellor, ALL_MODULES)).toEqual([
      "Home",
      "Students",
      "Applications",
      "Visas",
      "Documents",
      "Classes",
      "Tasks",
      "Inbox",
      "Transfer requests",
      "Email & SMS",
    ]);
  });

  it("gives Front Desk Students, Tasks and Messages but not classes or Documents", () => {
    // Front Desk's Home is the visitor desk, and the sidebar says so.
    expect(labels(Role.FrontDesk, ALL_MODULES)).toEqual([
      "Visitor desk",
      "Students",
      "Applications",
      "Visas",
      "Tasks",
      "Inbox",
      "Transfer requests",
      "Email & SMS",
    ]);
  });

  it("links Applications to the office-wide list, for everyone but Teachers", () => {
    expect(buildNavigation(Role.FrontDesk, ALWAYS_ON_MODULES)).toContainEqual({
      label: "Applications",
      href: "/applications",
      icon: "list",
      group: "work",
    });
    expect(labels(Role.Teacher, ALL_MODULES)).not.toContain("Applications");
  });

  it("links Visas to the office-wide list, for everyone but Teachers", () => {
    expect(buildNavigation(Role.Counsellor, ALWAYS_ON_MODULES)).toContainEqual({
      label: "Visas",
      href: "/visas",
      icon: "plane",
      group: "work",
    });
    expect(labels(Role.Teacher, ALL_MODULES)).not.toContain("Visas");
  });

  it("shows a Teacher only Tasks and their Batches", () => {
    expect(labels(Role.Teacher, ALL_MODULES)).toEqual(["Home", "Classes", "Tasks", "Inbox"]);
  });

  it("hides screens of switched-off Modules", () => {
    expect(labels(Role.Admin, WITHOUT_SWITCHABLE)).toEqual([
      "Home",
      "Students",
      "Applications",
      "Visas",
      "Documents",
      "Tasks",
      "Inbox",
      "Transfer requests",
      "Employees",
      "Catalogue",
      "Configuration",
    ]);
  });

  it("shows each switchable Module's screen only when it is on", () => {
    expect(labels(Role.Admin, [...ALWAYS_ON_MODULES, Module.Accounts])).toContain("Accounts");
    expect(labels(Role.Admin, [...ALWAYS_ON_MODULES, Module.Reports])).toContain("Reports");
    expect(labels(Role.Admin, [...ALWAYS_ON_MODULES, Module.Reports])).not.toContain("Accounts");
  });

  it("leaves a Teacher only Tasks and the Inbox when test-prep is off", () => {
    expect(labels(Role.Teacher, WITHOUT_SWITCHABLE)).toEqual(["Home", "Tasks", "Inbox"]);
  });

  it("links each entry to its screen", () => {
    expect(buildNavigation(Role.Teacher, ALL_MODULES)).toEqual([
      { label: "Home", href: "/", icon: "home", group: "work" },
      { label: "Classes", href: "/batches", icon: "batches", group: "work" },
      { label: "Tasks", href: "/tasks", icon: "tasks", group: "work" },
      { label: "Inbox", href: "/inbox", icon: "inbox", group: "work" },
    ]);
  });

  it("puts the office-wide screens in the Business group", () => {
    const business = buildNavigation(Role.Admin, ALL_MODULES)
      .filter((item) => item.group === "business")
      .map((item) => item.label);

    expect(business).toEqual(["Accounts", "Employees", "Reports", "Catalogue", "Configuration"]);
  });
});
