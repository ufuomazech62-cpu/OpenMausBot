// @vitest-environment happy-dom
// MausPreferences: a consumer-only screen. Every row is backed by a real preference or callback.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  dispatch: vi.fn(),
  api: vi.fn(),
  config: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return {
    ...original,
    useStore: () => ({ state: { ...original.initialState, config: fixture.config }, dispatch: fixture.dispatch }),
    api: (...args: unknown[]) => fixture.api(...args),
  };
});

vi.mock("@/lib/app-links", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/app-links")>(),
  openExternalLink: vi.fn(async () => undefined),
}));

import { openExternalLink, FEEDBACK_URL, HELP_CENTER_URL } from "@/lib/app-links";
import { NOTIFICATION_FEED_KEY, NOTIFICATION_SOUNDS_KEY } from "@/lib/notification-preferences";
import { readSkinChoice } from "@/lib/skins";
import { MausPreferences } from "./MausPreferences";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement;
let onOpenConnections: () => void;
let onClose: () => void;

const sections = () =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-maus-section]")).map((el) => el.dataset.mausSection);

const button = (selector: string) => {
  const element = container.querySelector<HTMLButtonElement>(selector);
  if (!element) throw new Error(`missing button ${selector}`);
  return element;
};

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  act(() => { input.dispatchEvent(new Event("input", { bubbles: true })); });
}

function render() {
  root = createRoot(container);
  act(() => { root!.render(createElement(MausPreferences, { onOpenConnections, onClose })); });
}

describe("MausPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fixture.config = { profile: { name: "Ada", email: "ada@example.com" } };
    fixture.api.mockResolvedValue({ profile: { name: "Ada Lovelace", email: "ada@example.com" } });
    onOpenConnections = vi.fn();
    onClose = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    render();
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("renders the consumer sections and a panel close control", () => {
    expect(container.querySelector("[data-maus-preferences]")).not.toBeNull();
    expect(container.querySelector("h1")?.textContent).toBeTruthy();
    for (const key of ["profile", "appearance", "notifications", "language", "connections", "help"]) {
      expect(sections(), `missing ${key} section`).toContain(key);
    }
    act(() => button("[aria-label='Close preferences']").click());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("drives the real skin choice from the Appearance radios", () => {
    const dark = button("[role='radio'][data-theme='midnight']");
    expect(dark.getAttribute("aria-checked")).toBe("false");
    act(() => { dark.click(); });
    expect(dark.getAttribute("aria-checked")).toBe("true");
    expect(readSkinChoice()).toBe("midnight");
    expect(document.documentElement.dataset.skin).toBe("midnight");
  });

  it("wires notification switches to the real preference storage", () => {
    const sounds = button("[data-pref-toggle='sounds']");
    expect(sounds.getAttribute("aria-checked")).toBe("true");
    act(() => { sounds.click(); });
    expect(sounds.getAttribute("aria-checked")).toBe("false");
    expect(localStorage.getItem(NOTIFICATION_SOUNDS_KEY)).toBe("0");

    const feed = button("[data-pref-toggle='feed']");
    act(() => { feed.click(); });
    expect(feed.getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem(NOTIFICATION_FEED_KEY)).toBe("1");
  });

  it("saves the chosen language through the real language preference", () => {
    const select = container.querySelector<HTMLSelectElement>("[data-maus-language]");
    if (!select) throw new Error("language select missing");
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(select, "fr");
    act(() => { select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(localStorage.getItem("omb-language")).toBe("fr");
  });

  it("saves the profile through the config API and updates the store", async () => {
    const name = container.querySelector<HTMLInputElement>("[aria-label='Your name']");
    if (!name) throw new Error("name field missing");
    typeInto(name, "Ada Lovelace");
    await act(async () => {
      const save = Array.from(container.querySelectorAll("button"))
        .find((el) => el.textContent?.trim() === "Save");
      save?.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fixture.api).toHaveBeenCalledWith("/api/config", expect.objectContaining({ method: "PUT" }));
    expect(fixture.dispatch).toHaveBeenCalledWith({
      type: "profileSaved",
      profile: { name: "Ada Lovelace", email: "ada@example.com" },
    });
    expect(container.querySelector("[role='status']")).not.toBeNull();
  });

  it("opens connections and help through the supplied callbacks", () => {
    act(() => { button("[data-maus-connections]").click(); });
    expect(onOpenConnections).toHaveBeenCalledOnce();
    act(() => { button("[data-maus-help]").click(); });
    expect(openExternalLink).toHaveBeenCalledWith(HELP_CENTER_URL);
    act(() => { button("[data-maus-feedback]").click(); });
    expect(openExternalLink).toHaveBeenCalledWith(FEEDBACK_URL);
  });

  it("shows no developer-only settings", () => {
    const text = (container.textContent ?? "").toLowerCase();
    for (const technical of ["api key", "webhook", "mcp", "model id", "json", "token", "cli"]) {
      expect(text.includes(technical), `found technical setting: ${technical}`).toBe(false);
    }
  });
});
