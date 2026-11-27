import type { Employee } from "@/lib/api";
import { uid } from "@/test/ids";

import { inEmployeesOrder } from "./employeeOrder";

function employee(n: number, name: string, status: Employee["status"]): Employee {
  return {
    id: uid(n),
    name,
    email: `p${String(n)}@acme.test`,
    mobile: "",
    jobTitle: "",
    role: "counsellor",
    joinedOn: "2026-11-01",
    status,
    invitedBack: false,
    twoFactorRequired: false,
    twoFactorSetUp: false,
  };
}

describe("inEmployeesOrder", () => {
  it("puts people working here first, then the invited, then those who left", () => {
    const list = [
      employee(1, "Hari", "deactivated"),
      employee(2, "Sita", "invited"),
      employee(3, "Ram", "active"),
    ];

    expect(inEmployeesOrder(list).map((one) => one.name)).toEqual(["Ram", "Sita", "Hari"]);
  });

  it("orders each group A to Z, whatever the capitals", () => {
    const list = [
      employee(1, "zara", "active"),
      employee(2, "Bina", "active"),
      employee(3, "anil", "active"),
      employee(4, "Ram", "deactivated"),
      employee(5, "asha", "deactivated"),
    ];

    expect(inEmployeesOrder(list).map((one) => one.name)).toEqual([
      "anil",
      "Bina",
      "zara",
      "asha",
      "Ram",
    ]);
  });

  it("keeps two people of the same name in the order they came", () => {
    const list = [employee(2, "Ram", "active"), employee(1, "Ram", "active")];

    expect(inEmployeesOrder(list).map((one) => one.id)).toEqual([uid(2), uid(1)]);
  });

  it("never changes the list it was given", () => {
    const list = [employee(1, "Hari", "deactivated"), employee(2, "Ram", "active")];

    inEmployeesOrder(list);

    expect(list.map((one) => one.name)).toEqual(["Hari", "Ram"]);
  });

  it("takes an empty list", () => {
    expect(inEmployeesOrder([])).toEqual([]);
  });
});
