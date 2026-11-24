import { render } from "@testing-library/react";

import { KEEP_TITLE_SCRIPT, keepSavedTitle, savedTitleKey } from "@/lib/keptTitle";

import { useKeptTitle } from "./useKeptTitle";

function Page({ title }: { title: string | null }) {
  useKeptTitle(title);
  return null;
}

describe("the tab keeps the page's title (list tidy-ups 30)", () => {
  beforeEach(() => {
    document.head.innerHTML = "<title>Product</title>";
  });

  it("sets the page's title", () => {
    render(<Page title="Students | Northwind" />);

    expect(document.title).toBe("Students | Northwind");
  });

  it("puts it straight back when the product name is put in its place", async () => {
    render(<Page title="Students | Northwind" />);

    document.title = "Product";
    await Promise.resolve();

    expect(document.title).toBe("Students | Northwind");
  });

  it("puts it back when a new title element replaces the old", async () => {
    render(<Page title="Visas | Northwind" />);

    document.head.innerHTML = "<title>Product</title>";
    await Promise.resolve();

    expect(document.title).toBe("Visas | Northwind");
  });

  it("leaves the title alone until it is known, and lets go when the page goes", async () => {
    const { rerender, unmount } = render(<Page title={null} />);
    expect(document.title).toBe("Product");

    rerender(<Page title="Home | Northwind" />);
    unmount();
    document.title = "Elsewhere";
    await Promise.resolve();

    expect(document.title).toBe("Elsewhere");
  });
});

describe("a reload shows the page's title from the start (list tidy-ups 30)", () => {
  beforeEach(() => {
    document.head.innerHTML = "<title>Product</title>";
    localStorage.clear();
  });

  it("remembers each page's title for this office's address", () => {
    render(<Page title="Students | Northwind" />);

    expect(localStorage.getItem(savedTitleKey(location.pathname))).toBe("Students | Northwind");
  });

  it("puts the remembered title back before the app starts, even over a later title", async () => {
    localStorage.setItem(savedTitleKey(location.pathname), "Visas | Northwind");

    const stop = keepSavedTitle("tab-title:");
    expect(document.title).toBe("Visas | Northwind");
    document.head.innerHTML = "<title>Product</title>";
    await Promise.resolve();
    stop();

    expect(document.title).toBe("Visas | Northwind");
  });

  it("never throws when the browser refuses storage later (list tidy-ups 30)", async () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener("error", onError);
    const stop = keepSavedTitle("tab-title:");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });

    document.head.innerHTML = "<title>Product</title>";
    await Promise.resolve();
    stop();
    window.removeEventListener("error", onError);
    vi.restoreAllMocks();

    expect(errors).toEqual([]);
  });

  it("leaves the title alone on a page it doesn't know", () => {
    keepSavedTitle("tab-title:")();

    expect(document.title).toBe("Product");
    expect(KEEP_TITLE_SCRIPT).toContain('("tab-title:");');
  });
});
