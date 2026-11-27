import {
  mergeActivity,
  olderAdded,
  readAgain,
  sourcesToLoadNext,
  type ActivitySource,
} from "./activity";

type Item = { key: string; at: string };

function source(ats: string[], count = ats.length, prefix = "x"): ActivitySource<Item> {
  return {
    items: ats.map((at, index) => ({ key: `${prefix}${String(index)}`, at })),
    count,
    page: 1,
  };
}

describe("mergeActivity", () => {
  it("puts every source's items in one list, newest first", () => {
    const visits = source(["2026-11-03T10:00:00+05:45", "2026-11-01T10:00:00+05:45"], 2, "v");
    const history = source(["2026-11-02T10:00:00+05:45"], 1, "h");

    const merged = mergeActivity([visits, history]);

    expect(merged.items.map((item) => item.key)).toEqual(["v0", "h0", "v1"]);
    expect(merged.hasOlder).toBe(false);
  });

  it("compares the moments, not the text, when offsets differ", () => {
    const utc = source(["2026-11-03T04:00:00Z"], 1, "u");
    const nepal = source(["2026-11-03T09:00:00+05:45"], 1, "n");

    // 09:00 in Nepal is 03:15 UTC, so the UTC item is newer.
    expect(mergeActivity([nepal, utc]).items.map((item) => item.key)).toEqual(["u0", "n0"]);
  });

  it("holds back items older than a source that has more to load", () => {
    const history = source(["2026-11-03T10:00:00Z", "2026-11-02T10:00:00Z"], 5, "h");
    const visits = source(["2026-11-02T12:00:00Z", "2026-10-01T10:00:00Z"], 2, "v");

    const merged = mergeActivity([history, visits]);

    // History's next page may hold anything older than 2 Nov, so the October visit waits.
    expect(merged.items.map((item) => item.key)).toEqual(["h0", "v0", "h1"]);
    expect(merged.hasOlder).toBe(true);
  });

  it("is empty with nothing loaded", () => {
    expect(mergeActivity<Item>([])).toEqual({ items: [], hasOlder: false });
  });
});

describe("sourcesToLoadNext", () => {
  it("names the sources whose next page could come next", () => {
    const history = source(["2026-11-03T10:00:00Z", "2026-11-02T10:00:00Z"], 5);
    const visits = source(["2026-11-03T12:00:00Z"], 4);
    const messages = source(["2026-11-01T10:00:00Z"], 1);

    // Visits stop at 3 Nov, later than History's 2 Nov: Visits must load first.
    expect(sourcesToLoadNext([history, visits, messages])).toEqual([1]);
  });

  it("names none when everything is loaded", () => {
    expect(sourcesToLoadNext([source(["2026-11-01T10:00:00Z"])])).toEqual([]);
  });
});

describe("readAgain (ticket 25)", () => {
  const item = (key: string, at: string): Item => ({ key, at });
  const A = item("a", "2026-11-01T10:00:00Z");
  const B = item("b", "2026-11-02T10:00:00Z");
  const C = item("c", "2026-11-03T10:00:00Z");
  const D = item("d", "2026-11-04T10:00:00Z");

  it("puts what is new first and keeps everything already shown", () => {
    const shown: ActivitySource<Item> = { items: [C, B, A], count: 3, page: 1 };
    const fresh: ActivitySource<Item> = { items: [D, C, B, A], count: 4, page: 1 };

    expect(readAgain(shown, fresh)).toEqual({ items: [D, C, B, A], count: 4, page: 1 });
  });

  it("keeps the older pages already loaded, and how far they go", () => {
    // Two pages of two were loaded; the first page read again holds the new one and one old one.
    const shown: ActivitySource<Item> = { items: [C, B, A], count: 5, page: 2 };
    const fresh: ActivitySource<Item> = { items: [D, C], count: 6, page: 1 };

    expect(readAgain(shown, fresh)).toEqual({ items: [D, C, B, A], count: 6, page: 2 });
  });

  it("takes the newer copy of an item both have", () => {
    const shown: ActivitySource<Item> = { items: [B], count: 1, page: 1 };
    const changed = { ...B, at: "2026-11-02T11:00:00Z" };

    expect(readAgain(shown, { items: [changed], count: 1, page: 1 }).items).toEqual([changed]);
  });

  it("is the fresh page when nothing was shown yet", () => {
    const fresh: ActivitySource<Item> = { items: [B, A], count: 2, page: 1 };

    expect(readAgain(undefined, fresh)).toEqual(fresh);
  });
});

describe("olderAdded (ticket 25)", () => {
  const item = (key: string, at: string): Item => ({ key, at });
  const A = item("a", "2026-11-01T10:00:00Z");
  const B = item("b", "2026-11-02T10:00:00Z");
  const C = item("c", "2026-11-03T10:00:00Z");

  it("adds the older page after what is shown", () => {
    const shown: ActivitySource<Item> = { items: [C], count: 3, page: 1 };
    const older: ActivitySource<Item> = { items: [B, A], count: 3, page: 2 };

    expect(olderAdded(shown, older)).toEqual({ items: [C, B, A], count: 3, page: 2 });
  });

  it("never shows an item twice when a new entry pushed one onto the next page", () => {
    const shown: ActivitySource<Item> = { items: [C, B], count: 3, page: 1 };
    const older: ActivitySource<Item> = { items: [B, A], count: 3, page: 2 };

    expect(olderAdded(shown, older).items).toEqual([C, B, A]);
  });
});
