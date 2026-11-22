import { hasUnsavedChanges, holdUnsavedChanges, subscribeUnsavedChanges } from "./unsavedChanges";

describe("unsaved changes", () => {
  it("is held while any page says it has unsaved changes", () => {
    expect(hasUnsavedChanges()).toBe(false);
    const releaseOne = holdUnsavedChanges();
    const releaseTwo = holdUnsavedChanges();
    expect(hasUnsavedChanges()).toBe(true);

    releaseOne();
    expect(hasUnsavedChanges()).toBe(true);
    releaseTwo();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("counts a release only once", () => {
    const releaseOne = holdUnsavedChanges();
    const releaseTwo = holdUnsavedChanges();
    releaseOne();
    releaseOne();
    expect(hasUnsavedChanges()).toBe(true);
    releaseTwo();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("tells listeners when it starts and when it clears, until they stop listening", () => {
    const listener = vi.fn<() => void>();
    const stop = subscribeUnsavedChanges(listener);

    const releaseOne = holdUnsavedChanges();
    const releaseTwo = holdUnsavedChanges();
    releaseOne();
    releaseOne();
    releaseTwo();
    stop();
    holdUnsavedChanges()();

    expect(listener).toHaveBeenCalledTimes(4);
  });
});
