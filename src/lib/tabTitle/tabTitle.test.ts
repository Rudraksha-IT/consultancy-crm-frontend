import { Role } from "@/constants/roles";
import { uid } from "@/test/ids";

import { platformTabTitle, tabTitle } from "./tabTitle";

const OFFICE = "Northwind Education";

describe("the browser tab's title on an office's address (first live fixes, ticket 08)", () => {
  it("is Home and the office on Home, like every other page (list tidy-ups 07)", () => {
    expect(tabTitle("/", OFFICE, Role.Admin)).toBe("Home | Northwind Education");
    expect(tabTitle("/", OFFICE, Role.FrontDesk)).toBe("Home | Northwind Education");
  });

  it.each([
    ["/students", "Students"],
    ["/applications", "Applications"],
    ["/visas", "Visas"],
    ["/documents", "Documents"],
    ["/batches", "Classes"],
    ["/tasks", "Tasks"],
    ["/inbox", "Inbox"],
    ["/transfer-requests", "Transfer requests"],
    ["/messages", "Email"],
    ["/accounts", "Accounts"],
    ["/accounts/fees-by-type", "Fees by type"],
    [`/accounts/fees-by-type/${uid(1)}`, "Fees by type"],
    ["/staff", "Employees"],
    ["/reports", "Reports"],
    ["/configuration", "Configuration"],
    [`/configuration/universities/${uid(1)}/edit`, "Configuration"],
    ["/clock", "My working hours"],
    ["/settings", "My settings"],
    ["/settings/progress", "My progress"],
    ["/login", "Log in"],
    ["/forgot-password", "Forgot password"],
    ["/join", "Join"],
  ])("is the page's name and the office on %s", (path, page) => {
    expect(tabTitle(path, OFFICE, Role.Admin)).toBe(`${page} | Northwind Education`);
  });

  it.each([
    [`/students/${uid(4)}`, "Students"],
    [`/students/${uid(4)}/edit`, "Students"],
    [`/batches/${uid(2)}`, "Classes"],
    [`/staff/${uid(3)}`, "Employees"],
  ])("names a record's page by its section, never the person (%s)", (path, page) => {
    expect(tabTitle(path, OFFICE, Role.Admin)).toBe(`${page} | Northwind Education`);
  });

  it("never matches part of a word", () => {
    expect(tabTitle("/studentsx", OFFICE, Role.Admin)).toBe("Northwind Education");
  });

  it("is the office alone on a page it doesn't know", () => {
    expect(tabTitle("/somewhere", OFFICE, Role.Admin)).toBe("Northwind Education");
  });
});

describe("the browser tab's title on the Platform (list tidy-ups 08)", () => {
  const PRODUCT = "Acme Office Suite";

  it.each([
    ["/platform", "Consultancies"],
    ["/platform/consultancies/new", "Consultancies"],
    ["/platform/admins", "Platform Admins"],
    ["/platform/settings", "Settings"],
  ])("is the page and the product's name on %s", (path, page) => {
    expect(platformTabTitle(path, PRODUCT)).toBe(`${page} | Acme Office Suite`);
  });

  it("is the product's name alone anywhere else", () => {
    expect(platformTabTitle("/platform/somewhere", PRODUCT)).toBe("Acme Office Suite");
    expect(platformTabTitle("/platformx", PRODUCT)).toBe("Acme Office Suite");
  });
});
