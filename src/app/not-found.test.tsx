import { render, screen } from "@testing-library/react";

import NotFound from "./not-found";

const router = vi.hoisted(() => ({ replace: vi.fn<(path: string) => void>() }));
const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname.current,
}));

beforeEach(() => {
  router.replace.mockReset();
});

describe("an address that doesn't exist (issue 66)", () => {
  it.each([
    ["/students/x/y", "/"],
    ["/nope", "/"],
    ["/platform/nope", "/platform"],
    ["/platform/admins/x", "/platform"],
  ])("sends %s to %s (its login when logged out)", (path, home) => {
    pathname.current = path;

    render(<NotFound />);

    expect(router.replace).toHaveBeenCalledWith(home);
    expect(screen.getByText("That page doesn't exist. Taking you back…")).toBeInTheDocument();
  });
});
