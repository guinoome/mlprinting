import { describe, expect, it, beforeEach, vi } from "vitest";
import { notify, subscribe, getSnapshot, __resetNotifications } from "./store";

beforeEach(() => __resetNotifications());

describe("notification store", () => {
  it("pushes a notification and notifies subscribers", () => {
    const listener = vi.fn();
    subscribe(listener);

    notify.success({ title: "Saved" });

    expect(listener).toHaveBeenCalledOnce();
    expect(getSnapshot()).toHaveLength(1);
    expect(getSnapshot()[0]).toMatchObject({
      level: "success",
      title: "Saved",
    });
  });

  it("gives errors no auto-dismiss but auto-dismisses the rest", () => {
    notify.error({ title: "Failed" });
    notify.success({ title: "Saved" });
    notify.warning({ title: "Careful" });

    const [error, success, warning] = getSnapshot();
    expect(error!.duration).toBeNull();
    expect(success!.duration).toBe(4000);
    expect(warning!.duration).toBe(6000);
  });

  it("honours an explicit duration override, including null", () => {
    notify.success({ title: "Sticky", duration: null });
    expect(getSnapshot()[0]!.duration).toBeNull();
  });

  it("caps visible notifications, dropping the oldest", () => {
    for (let i = 1; i <= 6; i++) notify.info({ title: `n${i}` });

    const titles = getSnapshot().map((n) => n.title);
    expect(titles).toEqual(["n3", "n4", "n5", "n6"]);
  });

  it("dismisses by id and leaves the others", () => {
    const id = notify.info({ title: "first" });
    notify.info({ title: "second" });

    notify.dismiss(id);

    expect(getSnapshot().map((n) => n.title)).toEqual(["second"]);
  });

  it("unsubscribes cleanly", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    unsubscribe();

    notify.info({ title: "ignored" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("replaces the array reference so useSyncExternalStore sees a change", () => {
    const before = getSnapshot();
    notify.info({ title: "x" });
    expect(getSnapshot()).not.toBe(before);
  });
});
