// @vitest-environment happy-dom
// MausConnections' DOM contract: a calm grid of familiar apps that starts the real connection flow on click.
// Queries use data attributes rather than wording, so the friendly copy can change freely.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  api: vi.fn<(path: string, init?: { method?: string }) => Promise<any>>(),
  services: {} as Record<string, any>,
  reserveConnectionPage: vi.fn(),
  mcpSignInLink: vi.fn(),
  pollConnector: vi.fn(),
  stopPoll: vi.fn(),
}));

vi.mock("@/state/store", () => ({
  api: (path: string, init?: { method?: string }) => fixture.api(path, init),
}));

vi.mock("@/lib/connector-oauth", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/connector-oauth")>(),
  reserveConnectionPage: () => fixture.reserveConnectionPage(),
}));

vi.mock("@/lib/mcp-sign-in", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/mcp-sign-in")>(),
  mcpSignInLink: (value: string | null | undefined) => fixture.mcpSignInLink(value),
}));

vi.mock("@/lib/connector-poll", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/connector-poll")>(),
  pollConnector: (before: unknown, read: () => Promise<unknown>, onEnd: (result: string) => void) => {
    fixture.pollConnector(before, read, onEnd);
    return fixture.stopPoll;
  },
}));

import { MausConnections } from "./MausConnections";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let container: HTMLDivElement;

const cards = () => Array.from(container.querySelectorAll<HTMLButtonElement>("[data-app]"));
const card = (slug: string) => container.querySelector<HTMLButtonElement>(`[data-app="${slug}"]`);

describe("MausConnections", () => {
  beforeEach(async () => {
    fixture.services = {};
    fixture.api.mockReset();
    fixture.api.mockImplementation(async (path, init) => {
      if (init?.method === "POST") return { url: "https://signin.example.com/start" };
      if (path.startsWith("/api/connectors?services=")) return { services: fixture.services };
      return {};
    });
    fixture.reserveConnectionPage.mockReset();
    fixture.reserveConnectionPage.mockReturnValue({
      open: vi.fn().mockResolvedValue(true),
      cancel: vi.fn(),
    });
    fixture.mcpSignInLink.mockReset();
    fixture.mcpSignInLink.mockImplementation((value) => (typeof value === "string" && value.startsWith("https:") ? value : null));
    fixture.pollConnector.mockReset();
    fixture.stopPoll.mockReset();

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => { root!.render(createElement(MausConnections)); });
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  it("renders a calm grid of twelve familiar apps with human copy and no technical details", () => {
    expect(container.querySelector("[data-maus-connections]")).not.toBeNull();
    expect(cards().length).toBe(12);
    for (const label of ["Gmail", "Google Calendar", "Google Drive", "Slack", "Notion", "Outlook", "Figma", "Dropbox", "HubSpot", "Salesforce", "Stripe", "Airtable"]) {
      expect(container.textContent, `missing ${label}`).toContain(label);
    }
    expect(container.textContent).toContain("Read, send, and tidy up your email.");
    const copy = container.textContent ?? "";
    expect(copy).not.toMatch(/\b(api key|token|mcp|localhost|127\.0\.0\.1|port|json)\b/i);
    expect(container.querySelector(".grid.grid-cols-1.sm\\:grid-cols-2")).not.toBeNull();
  });

  it("starts the real connection flow when Connect is clicked", async () => {
    const gmail = card("gmail");
    expect(gmail).not.toBeNull();
    expect(gmail?.dataset.connect).toBe("connect");

    await act(async () => { gmail!.click(); });

    expect(fixture.reserveConnectionPage).toHaveBeenCalledTimes(1);
    expect(fixture.api).toHaveBeenCalledWith("/api/connectors/gmail/authorize", { method: "POST" });
    expect(fixture.mcpSignInLink).toHaveBeenCalledWith("https://signin.example.com/start");
    expect(fixture.pollConnector).toHaveBeenCalledTimes(1);
    expect(fixture.reserveConnectionPage.mock.results[0].value.open).toHaveBeenCalledWith("https://signin.example.com/start");
    expect(container.textContent).not.toContain("INITIATED");
  });

  it("reads connection status while it waits", async () => {
    await act(async () => { card("gmail")!.click(); });
    expect(fixture.pollConnector).toHaveBeenCalledTimes(1);
    const read = fixture.pollConnector.mock.calls[0][1] as () => Promise<unknown>;
    await act(async () => { await read(); });
    expect(fixture.api).toHaveBeenCalledWith("/api/connectors?services=gmail", undefined);
  });

  it("shows a friendly Connected state for an app that is already connected", async () => {
    fixture.services = { gmail: { connected: true, accounts: [{ id: "one", status: "ACTIVE" }] } };
    fixture.api.mockImplementation(async (path, init) => {
      if (init?.method === "POST") return { url: "https://signin.example.com/start" };
      if (path.startsWith("/api/connectors?services=")) return { services: fixture.services };
      return {};
    });
    await act(async () => {
      root!.unmount();
      root = createRoot(container);
      root!.render(createElement(MausConnections));
    });
    expect(card("gmail")?.dataset.connect).toBe("connected");
    expect(card("gmail")?.disabled).toBe(true);
    expect(card("gmail")?.textContent).toContain("Connected");
  });

  it("shows only reassuring words when connecting fails", async () => {
    fixture.api.mockImplementation(async (path, init) => {
      if (init?.method === "POST") throw new Error("ECONNREFUSED 127.0.0.1:8799 mcp token abc");
      if (path.startsWith("/api/connectors?services=")) return { services: {} };
      return {};
    });
    await act(async () => { card("slack")!.click(); });
    const alert = container.querySelector('[data-maus-message="error"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|mcp|token/i);
    expect(alert?.textContent?.length).toBeGreaterThan(0);
  });
});
