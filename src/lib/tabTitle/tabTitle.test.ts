import { Role } from "@/constants/roles";
import { uid } from "@/test/ids";

import { tabTitle } from "./tabTitle";

const OFFICE = "Northwind Education";
const PRODUCT = "Acme Office Suite";

describe("the browser tab's title on an office's address (first live fixes, ticket 08)", () => {
  it("is the office and the product's saved name on Home (ticket 15)", () => {
    expect(tabTitle("/", OFFICE, Role.Admin, PRODUCT)).toBe(
      "Northwind Education - Acme Office Suite",
    );
    expect(tabTitle("/", OFFICE, Role.FrontDesk, PRODUCT)).toBe(
      "Northwind Education - Acme Office Suite",
    );
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
    expect(tabTitle(path, OFFICE, Role.Admin, PRODUCT)).toBe(`${page} | Northwind Education`);
  });

  it.each([
    [`/students/${uid(4)}`, "Students"],
    [`/students/${uid(4)}/edit`, "Students"],
    [`/batches/${uid(2)}`, "Classes"],
    [`/staff/${uid(3)}`, "Employees"],
  ])("names a record's page by its section, never the person (%s)", (path, page) => {
    expect(tabTitle(path, OFFICE, Role.Admin, PRODUCT)).toBe(`${page} | Northwind Education`);
  });

  it("never matches part of a word", () => {
    expect(tabTitle("/studentsx", OFFICE, Role.Admin, PRODUCT)).toBe(
      "Northwind Education - Acme Office Suite",
    );
  });

  it("is the office and the product on a page it doesn't know", () => {
    expect(tabTitle("/somewhere", OFFICE, Role.Admin, PRODUCT)).toBe(
      "Northwind Education - Acme Office Suite",
    );
  });
});
