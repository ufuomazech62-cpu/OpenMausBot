// @vitest-environment happy-dom
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  dispatch: vi.fn(),
  palette: vi.fn(),
  state: {} as Record<string, unknown>,
}));

vi.mock("@/state/store", () => ({ useStore: () => ({ state: fixture.state, dispatch: fixture.dispatch }) }));
vi.mock("./CommandPalette", () => ({ openCommandPalette: () => fixture.palette() }));
vi.mock("./SidebarFooterNav", () => ({
  NavRow: ({ id, label, active, onClick }: { id: string; label: string; active?: boolean; onClick: () => void }) =>
    createElement("button", { "data-sidebar-nav": id, "aria-current": active ? "page" : undefined, onClick }, label),
}));
import { GaiaSidebarNav } from "./GaiaSidebarNav";

type Props = { children?: ReactNode; [key: string]: unknown };
function nodes(value: ReactNode): ReactElement<Props>[] {
  return Children.toArray(value).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const node = child as ReactElement<Props>;
    return [node, ...nodes(node.props.children)];
  });
}
function render() {
  let tree!: ReturnType<typeof GaiaSidebarNav>;
  function Capture() { tree = GaiaSidebarNav(); return tree; }
  const html = renderToStaticMarkup(createElement(Capture));
  return { html, rows: nodes(tree) };
}
function click(rows: ReactElement<Props>[], id: string) {
  const row = rows.find((node) => node.props.id === id);
  expect(row, `missing row ${id}`).toBeDefined();
  (row!.props.onClick as () => void)();
}

beforeEach(() => {
  fixture.dispatch.mockReset();
  fixture.palette.mockReset();
  fixture.state = { activeView: "chat", pluginsOpen: false };
});

describe("GaiaSidebarNav", () => {
  it("renders Home then GAIA's main-nav order, with no bottom tab bar", () => {
    const { html } = render();
    const ids = [...html.matchAll(/data-sidebar-nav="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toEqual([
      "gaia-home", "gaia-chats", "gaia-tasks", "gaia-integrations", "gaia-workflows",
      "gaia-notifications", "gaia-memory", "gaia-search", "gaia-settings",
    ]);
    expect(html).not.toContain("data-bottom-tabs");
    expect(html).toContain('aria-label="Workspace"');
  });

  it("dispatches existing OpenMausBot actions for each entry", () => {
    const { rows } = render();
    click(rows, "gaia-home");
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "showHome" });
    click(rows, "gaia-chats");
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "showChat" });
    click(rows, "gaia-tasks");
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "showRoutines", section: "schedule", view: "list" });
    click(rows, "gaia-integrations");
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "togglePlugins", open: true });
    click(rows, "gaia-workflows");
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "showRoutines", view: "list" });
    click(rows, "gaia-notifications");
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "toggleNotifications", open: true });
    click(rows, "gaia-memory");
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "toggleSettings", open: true, section: "memory" });
    click(rows, "gaia-settings");
    expect(fixture.dispatch).toHaveBeenLastCalledWith({ type: "toggleAppSettings", open: true });
    click(rows, "gaia-search");
    expect(fixture.palette).toHaveBeenCalledTimes(1);
    expect(fixture.dispatch).toHaveBeenCalledTimes(8);
  });

  it("marks the current surface, including Home and the shared routines page", () => {
    fixture.state = { activeView: "home", pluginsOpen: false };
    expect(render().html).toMatch(/data-sidebar-nav="gaia-home"[^>]*aria-current="page"/);
    fixture.state = { activeView: "routines", pluginsOpen: false };
    const html = render().html;
    expect(html).toMatch(/data-sidebar-nav="gaia-tasks"[^>]*aria-current="page"/);
    expect(html).toMatch(/data-sidebar-nav="gaia-workflows"[^>]*aria-current="page"/);
    fixture.state = { activeView: "chat", pluginsOpen: true };
    expect(render().html).toMatch(/data-sidebar-nav="gaia-integrations"[^>]*aria-current="page"/);
  });
});
