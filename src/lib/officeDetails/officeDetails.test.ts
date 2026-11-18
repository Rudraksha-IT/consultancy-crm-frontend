import { NO_OFFICE_DETAILS } from "@/lib/api";

import { footerLines, refusedOfficeDetails, tidyOfficeDetails } from "./officeDetails";

const FULL = {
  contactEmail: "info@himal.com",
  phone: "+977 (01) 441-2345",
  addressLine1: "Putalisadak, Kathmandu",
  addressLine2: "Second floor",
  website: "https://himal.com",
};

describe("tidyOfficeDetails", () => {
  it("trims every field and makes runs of spaces in the address one", () => {
    expect(
      tidyOfficeDetails({
        contactEmail: " info@himal.com ",
        phone: " 01-4412345 ",
        addressLine1: "  Putalisadak,   Kathmandu ",
        addressLine2: " Second    floor",
        website: " https://himal.com ",
      }),
    ).toEqual({ ...FULL, phone: "01-4412345" });
  });
});

describe("refusedOfficeDetails", () => {
  it("accepts every field filled in, and every field empty", () => {
    expect(refusedOfficeDetails(FULL)).toEqual({});
    expect(refusedOfficeDetails(NO_OFFICE_DETAILS)).toEqual({});
  });

  it.each([
    "info",
    "info@himal",
    "info @himal.com",
    '"Himal" <info@himal.com>',
    "a@b.com, c@d.com",
    "<script>@x.com",
    `${"a".repeat(250)}@himal.com`,
  ])("refuses the contact email %s", (contactEmail) => {
    expect(refusedOfficeDetails({ ...FULL, contactEmail })).toEqual({
      contactEmail: ["Enter a real email address, like info@youroffice.com."],
    });
  });

  it.each(["phone me", "01.4412345", "12345", "1".repeat(31), "<b>01</b>"])(
    "refuses the phone %s",
    (phone) => {
      expect(refusedOfficeDetails({ ...FULL, phone })).toEqual({
        phone: ["A phone number can have digits, spaces, + ( ) and -."],
      });
    },
  );

  it.each([
    "himal.com",
    "ftp://himal.com",
    "javascript:alert(1)",
    "https://himal",
    'https://himal.com/"><script>',
    `https://himal.com/${"a".repeat(200)}`,
  ])("refuses the website %s", (website) => {
    expect(refusedOfficeDetails({ ...FULL, website })).toEqual({
      website: ["The website must start with https:// or http://."],
    });
  });

  it("refuses an address line over 100 characters", () => {
    expect(refusedOfficeDetails({ ...FULL, addressLine2: "a".repeat(101) })).toEqual({
      addressLine2: ["Use at most 100 characters."],
    });
  });

  it("names every refused field at once", () => {
    expect(Object.keys(refusedOfficeDetails({ ...FULL, contactEmail: "x", website: "y" }))).toEqual(
      ["contactEmail", "website"],
    );
  });
});

function texts(details: typeof FULL): string[] {
  return footerLines(details).map((line) => line.text);
}

describe("footerLines", () => {
  it("gives the address, phone, website and contact email in order", () => {
    expect(texts(FULL)).toEqual([
      "Putalisadak, Kathmandu",
      "Second floor",
      "Phone +977 (01) 441-2345",
      "https://himal.com",
      "info@himal.com",
    ]);
  });

  it("leaves empty details out", () => {
    expect(footerLines({ ...NO_OFFICE_DETAILS, phone: "01-4412345" })).toEqual([
      { part: "phone", text: "Phone 01-4412345" },
    ]);
    expect(footerLines(NO_OFFICE_DETAILS)).toEqual([]);
  });
});
