// @vitest-environment happy-dom
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  dispatch: vi.fn(),
  openBot: vi.fn(),
  state: {} as Record<string, unknown>,
}));

vi.mock("@/state/store", () => ({
  useStore: () => ({ state: fixture.state, dispatch: fixture.dispatch }),
  openBot: (...args: unknown[]) => fixture.openBot(...args),
}));
vi.mock("@/lib/i18n", () => ({ t: (key: string) => key }));
vi.mock("./ToolPageShell", () => ({
  ToolPage: ({ children }: { children: ReactNode }) => createElement("main", null, children),
  ToolPageHeader: ({ children }: { children: ReactNode }) => createElement("header", null, children),
  TOOL_PAGE_TITLE: "title",
}));
import { GaiaHome } from "./GaiaHome";

type Props = { children?: ReactNode; "data-gaia-home-card"?: string; "data-gaia-home-recent"?: string; "data-gaia-home-workflow"?: string; onClick?: () => void; [key: string]: unknown };
function nodes(value: ReactNode): ReactElement<Props>[] {
  return Children.toArray(value).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const node = child as ReactElement<Props>;
    return [node, ...nodes(node.props.children)];
  });
}
function render() {
  let tree!: ReactElement<Props>;
  function Capture() { tree = GaiaHome() as ReactElement<Props>; return tree; }
  const html = renderToStaticMarkup(createElement(Capture));
  return { html, all: nodes(tree) };
}
function byAttr(all: ReactElement<Props>[], attr: keyof Props, value: string) {
  const node = all.find((candidate) => candidate.props[attr] === value);
  expect(node, `missing ${attr}=${value}`).toBeDefined();
  return node!;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 1, 9));
  fixture.dispatch.mockReset();
  fixture.openBot.mockReset();
  fixture.state = {
    bots: [{ id: "a", name: "Ada", unread: true }, { id: "hidden", name: "Hidden", hidden: true, unread: true }],
    groups: [{ id: "g", name: "Room" }],
    routines: [{ id: "r", name: "Daily", enabled: true }],
    notifications: [{ id: 1 }, { id: 2 }],
  };
});
afterEach(() => vi.useRealTimers());

describe("GaiaHome", () => {
  it("shows a greeting and date from existing state, with no GAIA branding or bottom tabs", () => {
    const { html } = render();
    expect(html).toContain("gaia.home.morning");
    expect(html).not.toContain("GAIA");
    expect(html).not.toContain("data-bottom-tabs");
  });

  it("derives the unread and notification counts from existing state", () => {
    const { html, all } = render();
    const unread = byAttr(all, "data-gaia-home-card", "unread");
    const notifications = byAttr(all, "data-gaia-home-card", "notifications");
    expect(renderToStaticMarkup(unread)).toContain(">1<");
    expect(renderToStaticMarkup(notifications)).toContain(">2<");
    expect(html).toContain('data-gaia-home-card="recent"');
    expect(html).toContain('data-gaia-home-card="workflows"');
  });

  it("wires cards to existing actions and opens a bot from the recent list", () => {
    const { all } = render();
    (byAttr(all, "data-gaia-home-card", "unread").props.onClick!)();
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "showChat" });
    (byAttr(all, "data-gaia-home-card", "notifications").props.onClick!)();
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "toggleNotifications", open: true });
    (byAttr(all, "data-gaia-home-workflow", "r").props.onClick!)();
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "showRoutines", view: "list" });
    (byAttr(all, "data-gaia-home-recent", "a").props.onClick!)();
    expect(fixture.openBot).toHaveBeenCalledWith(fixture.dispatch, (fixture.state.bots as { id: string }[])[0], false);
  });
});
