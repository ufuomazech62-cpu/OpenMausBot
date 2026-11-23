// @vitest-environment happy-dom
// MausHome's DOM contract: one home root, a delegate composer with suggestions, and its fixed sections.
// Queries use attributes/roles rather than copy: locale keys and wording can change freely.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  dispatch: vi.fn(),
  bots: [] as Array<Record<string, unknown>>,
}));

// Avoid a real app-trigger fetch from useAutomationsNeedYou's dependency.
vi.mock("@/lib/app-triggers", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/app-triggers")>(),
  useAppTriggers: () => ({ triggers: [] }),
}));

vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return {
    ...original,
    useStore: () => ({
      state: { ...original.initialState, bots: fixture.bots },
      dispatch: fixture.dispatch,
    }),
  };
});

import { MausHome } from "./MausHome";

const bot = (id: string, name: string) => ({
  id,
  threadId: `${id}-thread`,
  name,
  title: "Chief of staff",
  description: "",
  color: "purple",
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

/** Sections are keyed by data-maus-section when present; aria-labelledby keeps the test valid while a shell lands. */
const sectionKeys = () =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-maus-section], section[aria-labelledby]"))
    .map((element) => (element.dataset.mausSection ?? element.getAttribute("aria-labelledby") ?? "").toLowerCase())
    .filter(Boolean);

const textarea = () => container.querySelector("textarea");
const composer = () => textarea()?.closest(".maus-card") ?? textarea()?.closest("section") ?? null;

/** React 19 tracks the value property, so set it on the prototype before dispatching input. */
function typeInto(value: string) {
  const field = textarea();
  if (!field) throw new Error("composer textarea missing");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(field, value);
  act(() => { field.dispatchEvent(new Event("input", { bubbles: true })); });
}

function pressEnter() {
  const field = textarea();
  if (!field) throw new Error("composer textarea missing");
  act(() => { field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
}

describe("MausHome", () => {
  beforeEach(() => {
    fixture.dispatch.mockReset();
    fixture.bots = [bot("atlas", "Atlas"), bot("juniper", "Juniper")];
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => { root!.render(createElement(MausHome)); });
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  it("renders the home root, a heading and the composer textarea", () => {
    expect(container.querySelector("[data-maus-home]")).not.toBeNull();
    expect(container.querySelector(".maus-home")).not.toBeNull();
    expect(container.querySelector("h1")).not.toBeNull();
    expect(textarea()).not.toBeNull();
    expect(textarea()?.getAttribute("aria-label")).toBeTruthy();
  });

  it("offers suggestion buttons alongside the composer's send button", () => {
    const buttons = Array.from(composer()?.querySelectorAll("button") ?? []);
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    // The send button starts disabled on an empty draft; the enabled buttons are the suggestions.
    expect(buttons.filter((button) => !(button as HTMLButtonElement).disabled).length).toBeGreaterThanOrEqual(3);
  });

  it("renders the needs-attention, motion, recent, team and areas sections", () => {
    const keys = sectionKeys();
    expect(keys.length).toBeGreaterThanOrEqual(5);
    expect(keys.some((key) => key.includes("focus") || key.includes("attention"))).toBe(true);
    for (const expected of ["motion", "recent", "team", "areas"]) {
      expect(keys.some((key) => key.includes(expected)), `missing ${expected} section`).toBe(true);
    }
  });

  it("sends the draft on Enter without Shift", () => {
    typeInto("Plan the launch");
    pressEnter();
    expect(fixture.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "send", text: "Plan the launch", mode: "goal" }),
    );
    expect(fixture.dispatch).toHaveBeenCalledWith({ type: "showChat" });
  });

  it("does not send an empty draft", () => {
    pressEnter();
    expect(fixture.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "send" }));
  });
});
