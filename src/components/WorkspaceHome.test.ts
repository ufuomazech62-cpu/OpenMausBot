import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/lib/i18n";
import { reducer, initialState, StoreProvider } from "@/state/store";
import { WorkspaceHome } from "./WorkspaceHome";

describe("MausBot workspace home", () => {
  it("is a distinct reachable view, not the chat screen", () => {
    const next = reducer(initialState, { type: "showWorkspace" });
    expect(next.activeView).toBe("workspace");
    expect(reducer(next, { type: "showChat" }).activeView).toBe("chat");
  });

  it("puts delegation, attention and in-motion work ahead of feature tiles", () => {
    const html = renderToStaticMarkup(createElement(StoreProvider, null, createElement(WorkspaceHome)));
    expect(html).toContain(t("workspace.delegateLabel"));
    expect(html).toContain(t("workspace.delegatePlaceholder"));
    expect(html).toContain(t("workspace.needsYou"));
    expect(html).toContain(t("workspace.inMotion"));
    expect(html).toContain(t("workspace.conversations"));
    expect(html).toContain(t("workspace.automations"));
    expect(html).toContain(t("workspace.files").replace("&", "&amp;"));
    expect(html).toContain(t("workspace.apps"));
    const delegate = html.indexOf(t("workspace.delegateLabel"));
    const areas = html.indexOf(t("workspace.conversations"));
    expect(delegate).toBeGreaterThan(-1);
    expect(areas).toBeGreaterThan(delegate);
  });
});
