// @vitest-environment happy-dom
// The desktop rail: nine destinations as buttons, one nav landmark, and a single active destination.
// Assertions key off data-maus-nav / active state, never translated labels.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  dispatch: vi.fn(),
  activeView: "workspace",
  team: true,
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
        activeView: fixture.activeView,
        config: fixture.team ? { team: { name: "Test team" } } : original.initialState.config,
      },
      dispatch: fixture.dispatch,
    }),
  };
});

import { MausNavRail } from "./MausNavRail";

const DESTINATIONS = ["today", "inbox", "messages", "work", "files", "insights", "team", "apps", "settings"];
const isActive = (button: HTMLElement) =>
  button.dataset.active === "true" || button.getAttribute("aria-current") === "page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let container: HTMLDivElement;

describe("MausNavRail", () => {
  beforeEach(() => {
    fixture.dispatch.mockReset();
    fixture.activeView = "workspace";
    fixture.team = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(MausNavRail)); });
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  it("renders one rail landmark, not a second bottom navigation", () => {
    const rail = container.querySelector("[data-maus-nav-rail]");
    expect(rail).not.toBeNull();
    expect(rail?.classList.contains("maus-rail")).toBe(true);
    expect(container.querySelectorAll("nav").length).toBe(1);
  });

  it("renders all expected destinations as buttons", () => {
    const buttons = Array.from(container.querySelectorAll<HTMLElement>("button[data-maus-nav]"));
    expect(buttons.map((button) => button.dataset.mausNav).sort()).toEqual([...DESTINATIONS].sort());
    for (const button of buttons) {
      expect(button.tagName).toBe("BUTTON");
    }
  });

  it("marks exactly the current destination active via data-active / aria-current", () => {
    const active = Array.from(container.querySelectorAll<HTMLElement>("button[data-maus-nav]")).filter(isActive);
    expect(active).toHaveLength(1);
    expect(active[0].dataset.mausNav).toBe("today");
  });
});
