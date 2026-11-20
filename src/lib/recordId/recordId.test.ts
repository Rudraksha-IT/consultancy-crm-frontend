import { describe, expect, it } from "vitest";

import { parseRecordId, parseRecordNumber, RecordIdSchema } from "./index";

const ID = "3f8a2c1e-9b7d-4c2a-8e1f-0a1b2c3d4e5f";

describe("RecordIdSchema", () => {
  it("takes a UUID", () => {
    expect(RecordIdSchema.parse(ID)).toBe(ID);
  });

  it.each([16, "16", "", "not-a-uuid", `${ID}x`, ID.replaceAll("-", "")])("refuses %s", (value) => {
    expect(RecordIdSchema.safeParse(value).success).toBe(false);
  });
});

describe("parseRecordId", () => {
  it("returns the id from an address", () => {
    expect(parseRecordId(ID)).toBe(ID);
  });

  it("writes an upper-case UUID in lower case, as the server does", () => {
    expect(parseRecordId(ID.toUpperCase())).toBe(ID);
  });

  it.each(["16", "0", "-1", "", " ", "abc", `${ID}/`, `../${ID}`, "%2F"])(
    "finds nothing for %j",
    (text) => {
      expect(parseRecordId(text)).toBeNull();
    },
  );
});

describe("parseRecordNumber (records ticket 18 hasn't switched yet)", () => {
  it.each([
    ["7", 7],
    ["1234567890", 1234567890],
  ])("reads %j as a record number", (text, id) => {
    expect(parseRecordNumber(text)).toBe(id);
  });

  it.each(["0", "-1", "07", "abc", "1.5", "", "12345678901", "1e3", ID])("refuses %j", (text) => {
    expect(parseRecordNumber(text)).toBeNull();
  });
});
