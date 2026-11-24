import { render } from "@testing-library/react";

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
