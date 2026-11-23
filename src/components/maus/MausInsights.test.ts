// @vitest-environment happy-dom
// The insights screen is copy-only: calm cards, no release notes, one way back to chat.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ dispatch: vi.fn() }));

// The store is mocked outright: importing the real one pulls server code that
// needs Node 24's built-in sqlite, which this worker does not bundle.
vi.mock("@/state/store", () => ({
  useStore: () => ({ state: {}, dispatch: fixture.dispatch }),
}));

import { MausInsights } from "./MausInsights";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let container: HTMLDivElement;

describe("MausInsights", () => {
  beforeEach(() => {
    fixture.dispatch.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(MausInsights)); });
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  it("uses the Maus home design language with one clear heading", () => {
    expect(container.querySelector("[data-maus-insights]")).not.toBeNull();
    expect(container.querySelector(".maus-home")).not.toBeNull();
    expect(container.querySelectorAll("h1").length).toBe(1);
  });

  it("shows the three curated, friendly cards", () => {
    const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-maus-insight]"));
    expect(cards.map((card) => card.querySelector("h2")?.textContent?.trim())).toEqual([
      "Your assistant is learning",
      "Team work stays in sync",
      "Files are easier to find",
    ]);
    for (const card of cards) {
      expect(card.classList.contains("maus-card")).toBe(true);
      expect(card.querySelector("p")?.textContent?.trim()).toBeTruthy();
      expect(card.querySelector("svg")).toBeNull();
    }
  });

  it("shows no release notes, versions or technical copy", () => {
    const copy = (container.textContent ?? "").toLowerCase();
    for (const banned of ["version", "advanced", "cli", "api", "provider", "model", "release", "changelog", "engine", "v1.", "v2."]) {
      expect(copy.includes(banned), `found ${banned}`).toBe(false);
    }
  });

  it("returns to chat from the quiet footer button", () => {
    const back = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Back to chat"));
    expect(back).toBeTruthy();
    act(() => { back!.click(); });
    expect(fixture.dispatch).toHaveBeenCalledWith({ type: "showChat" });
  });
});
