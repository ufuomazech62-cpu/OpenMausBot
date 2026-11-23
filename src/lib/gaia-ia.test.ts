import { describe, expect, it } from "vitest";

import {
  GAIA_IA,
  GAIA_MAIN_NAV_ORDER,
  gaiaGreetingKey,
  gaiaHomeData,
  gaiaMainNav,
  type GaiaHomeState,
} from "./gaia-ia";

describe("GAIA information architecture mapping", () => {
  it("keeps GAIA's verified main-nav order: Chats, Tasks, Integrations, Workflows", () => {
    expect(GAIA_MAIN_NAV_ORDER).toEqual(["chats", "tasks", "integrations", "workflows"]);
    expect(gaiaMainNav().map((entry) => entry.section)).toEqual([...GAIA_MAIN_NAV_ORDER]);
  });

  it("maps every main-nav entry onto an existing OpenMausBot surface and action", () => {
    const bySection = gaiaMainNav().reduce((map, entry) => {
      map[entry.section] = entry;
      return map;
    }, {} as Record<string, { surface: string; action: { type: string } }>);
    expect(bySection.chats.surface).toBe("chat");
    expect(bySection.chats.action).toMatchObject({ type: "showChat" });
    expect(bySection.tasks.surface).toBe("routines");
    expect(bySection.tasks.action).toMatchObject({ type: "showRoutines", view: "list" });
    expect(bySection.integrations.surface).toBe("plugins");
    expect(bySection.integrations.action).toMatchObject({ type: "togglePlugins", open: true });
    expect(bySection.workflows.surface).toBe("routines");
    expect(bySection.workflows.action).toMatchObject({ type: "showRoutines", view: "list" });
  });

  it("maps the remaining GAIA sections to existing panels/modals, with no new surfaces", () => {
    expect(GAIA_IA.home.surface).toBe("home");
    expect(GAIA_IA.notifications.surface).toBe("notifications");
    expect(GAIA_IA.memory.surface).toBe("botMemory");
    expect(GAIA_IA.memory.action).toMatchObject({ type: "toggleSettings", section: "memory" });
    expect(GAIA_IA.settings.surface).toBe("settings");
    expect(GAIA_IA.search.surface).toBe("commandPalette");
    expect(Object.keys(GAIA_IA).sort()).toEqual([
      "chats", "home", "integrations", "memory", "notifications", "search", "settings", "tasks", "workflows",
    ]);
  });

  it("never introduces a bottom tab bar or a GAIA-specific surface", () => {
    const surfaces = Object.values(GAIA_IA).map((entry) => entry.surface);
    expect(surfaces).not.toContain("bottomTabs");
    expect(surfaces.every((surface) => /^[a-zA-Z]+$/.test(surface))).toBe(true);
  });
});

describe("Home dashboard data", () => {
  const state: GaiaHomeState = {
    bots: [
      { id: "a", name: "Ada", unread: true },
      { id: "b", name: "Bugs", tasks: [{ unread: true }, { openAsks: 2 }] },
      { id: "hidden", name: "Hidden", hidden: true, unread: true },
    ],
    groups: [{ id: "g", name: "Room", unread: true }],
    routines: [{ id: "r1", name: "Daily", enabled: true }, { id: "r2", name: "Off", enabled: false }],
    notifications: [{ id: 1 }, { id: 2 }, { id: 3 }],
  };

  it("counts unread from existing bots and groups, ignoring hidden bots", () => {
    expect(gaiaHomeData(state).unreadCount).toBe(4);
  });

  it("lists recent conversations and active workflows from existing state", () => {
    const data = gaiaHomeData(state);
    expect(data.recentConversations).toEqual([
      { id: "g", name: "Room" }, { id: "a", name: "Ada" }, { id: "b", name: "Bugs" },
    ]);
    expect(data.activeWorkflows).toEqual([{ id: "r1", name: "Daily" }]);
    expect(data.notificationCount).toBe(3);
  });

  it("uses locale keys for the greeting, never embedded GAIA copy", () => {
    expect(gaiaGreetingKey(new Date(2026, 0, 1, 9))).toBe("gaia.home.morning");
    expect(gaiaGreetingKey(new Date(2026, 0, 1, 14))).toBe("gaia.home.afternoon");
    expect(gaiaGreetingKey(new Date(2026, 0, 1, 21))).toBe("gaia.home.evening");
  });
});
