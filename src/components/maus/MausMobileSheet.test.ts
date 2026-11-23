// @vitest-environment happy-dom
// The mobile sheet: grouped navigation, recent people, an all-conversations expander and Escape-to-close.
// No copy assertions — the locale keys behind every label may change.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  dispatch: vi.fn(),
  onClose: vi.fn(),
  bots: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/app-triggers", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/app-triggers")>(),
  useAppTriggers: () => ({ triggers: [] }),
}));

vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return {
    ...original,
    useStore: () => ({
      state: {
        ...original.initialState,
        activeView: "workspace",
        bots: fixture.bots,
        config: { team: { name: "Test team" } },
      },
      dispatch: fixture.dispatch,
    }),
  };
});

import { MausMobileSheet } from "./MausMobileSheet";

const bot = (id: string, name: string) => ({
  id,
  threadId: `${id}-thread`,
  name,
  title: "Chief of staff",
  description: "",
  color: "teal",
  notifications: false,
  unread: false,
  busy: false,
  approvalMode: "ask",
  modelSelection: { instanceId: "engine", model: "fake" },
  messages: [],
  tasks: [],
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let container: HTMLDivElement;

const render = () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => { root!.render(createElement(MausMobileSheet, { onClose: fixture.onClose })); });
};

describe("MausMobileSheet", () => {
  beforeEach(() => {
    fixture.dispatch.mockReset();
    fixture.onClose.mockReset();
    fixture.bots = [bot("atlas", "Atlas"), bot("juniper", "Juniper")];
    render();
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  it("renders a dialog with grouped navigation", () => {
    expect(container.querySelector('[data-maus-mobile-sheet][role="dialog"]')).not.toBeNull();
    expect(container.querySelector(".maus-sheet")).not.toBeNull();
    const nav = container.querySelector(".maus-sheet-nav") ?? container.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(nav?.querySelectorAll("h2").length ?? 0).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll("button[data-maus-nav]").length).toBeGreaterThanOrEqual(8);
    expect(container.querySelectorAll(".maus-sheet-row").length).toBeGreaterThanOrEqual(3);
  });

  it("renders the recent list and toggles all conversations", () => {
    expect(container.querySelectorAll("button[data-maus-bot]").length).toBeGreaterThanOrEqual(1);
    const expander = container.querySelector<HTMLButtonElement>("button[aria-expanded]");
    expect(expander).not.toBeNull();
    expect(expander?.getAttribute("aria-expanded")).toBe("false");
    act(() => { expander!.click(); });
    expect(expander?.getAttribute("aria-expanded")).toBe("true");
    const controlled = expander?.getAttribute("aria-controls");
    expect(controlled).toBeTruthy();
    expect(container.querySelector(`#${controlled}`)).not.toBeNull();
  });

  it("calls onClose on Escape", () => {
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(fixture.onClose).toHaveBeenCalledTimes(1);
  });
});
