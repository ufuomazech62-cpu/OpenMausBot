/**
 * Information-architecture mapping only. GAIA was read as a *structural*
 * reference; nothing here imports, copies, or imitates GAIA's code, styling,
 * icons, tokens or copy. Each entry points at a surface OpenMausBot already
 * has. See UX_STRUCTURE.md.
 */
import { botUnreadCount } from "@/lib/bot-unread";
import type { LocaleKey } from "@/locales";
import type { Action } from "@/state/store";

export type GaiaSection =
  | "home"
  | "chats"
  | "tasks"
  | "integrations"
  | "workflows"
  | "notifications"
  | "memory"
  | "search"
  | "settings";

export type OmbSurface =
  | "home"
  | "chat"
  | "routines"
  | "plugins"
  | "notifications"
  | "botMemory"
  | "settings"
  | "commandPalette";

/** `openCommandPalette` is a module function, not a store action; every other
 * action is dispatched verbatim to OpenMausBot's existing reducer. */
export type IaAction = Action | { type: "openCommandPalette" };

export interface GaiaIaEntry {
  section: GaiaSection;
  /** Existing locale catalog key (generic IA word, no GAIA copy). */
  labelKey: LocaleKey;
  surface: OmbSurface;
  action: IaAction;
}

/** GAIA's main nav, in the verified source order: Chats, Tasks, Integrations,
 * Workflows. Home is a header entry, not part of this group. */
export const GAIA_MAIN_NAV_ORDER: readonly GaiaSection[] = [
  "chats",
  "tasks",
  "integrations",
  "workflows",
] as const;

export const GAIA_IA: Readonly<Record<GaiaSection, GaiaIaEntry>> = {
  home: {
    section: "home",
    labelKey: "gaia.home",
    surface: "home",
    action: { type: "showHome" },
  },
  chats: {
    section: "chats",
    labelKey: "gaia.chats",
    surface: "chat",
    action: { type: "showChat" },
  },
  tasks: {
    section: "tasks",
    labelKey: "gaia.tasks",
    surface: "routines",
    action: { type: "showRoutines", section: "schedule", view: "list" },
  },
  integrations: {
    section: "integrations",
    labelKey: "gaia.integrations",
    surface: "plugins",
    action: { type: "togglePlugins", open: true },
  },
  workflows: {
    section: "workflows",
    labelKey: "gaia.workflows",
    surface: "routines",
    action: { type: "showRoutines", view: "list" },
  },
  notifications: {
    section: "notifications",
    labelKey: "gaia.notifications",
    surface: "notifications",
    action: { type: "toggleNotifications", open: true },
  },
  memory: {
    section: "memory",
    labelKey: "gaia.memory",
    surface: "botMemory",
    action: { type: "toggleSettings", open: true, section: "memory" },
  },
  search: {
    section: "search",
    labelKey: "gaia.search",
    surface: "commandPalette",
    action: { type: "openCommandPalette" },
  },
  settings: {
    section: "settings",
    labelKey: "gaia.settings",
    surface: "settings",
    action: { type: "toggleAppSettings", open: true },
  },
};

/** The four main-nav entries, in GAIA order. */
export function gaiaMainNav(): GaiaIaEntry[] {
  return GAIA_MAIN_NAV_ORDER.map((section) => GAIA_IA[section]);
}

// --- Home dashboard data, derived from existing state only ---

type HomeBot = {
  id: string;
  name: string;
  hidden?: boolean;
  unread?: boolean;
  tasks?: ReadonlyArray<{ unread?: boolean; routineRunId?: string; archivedAt?: number; openAsks?: number }> | null;
};

export interface GaiaHomeState {
  bots: ReadonlyArray<HomeBot>;
  groups: ReadonlyArray<{ id: string; name: string; unread?: boolean }>;
  routines: ReadonlyArray<{ id: string; name: string; enabled?: boolean }>;
  notifications: ReadonlyArray<unknown>;
}

export interface GaiaHomeData {
  unreadCount: number;
  recentConversations: { id: string; name: string }[];
  activeWorkflows: { id: string; name: string }[];
  notificationCount: number;
}

/** Counts and lists behind the Home cards. No new data source is introduced. */
export function gaiaHomeData(state: GaiaHomeState): GaiaHomeData {
  const visibleBots = state.bots.filter((bot) => !bot.hidden);
  const unreadGroups = state.groups.filter((group) => group.unread);
  return {
    unreadCount: visibleBots.reduce((sum, bot) => sum + botUnreadCount(bot), 0) + unreadGroups.length,
    recentConversations: [...unreadGroups, ...visibleBots].slice(0, 5).map(({ id, name }) => ({ id, name })),
    activeWorkflows: state.routines.filter((routine) => routine.enabled).slice(0, 5).map(({ id, name }) => ({ id, name })),
    notificationCount: state.notifications.length,
  };
}

/** Which greeting key to show on Home; the words themselves stay in the locale
 * catalog, so no GAIA copy is embedded here. */
export function gaiaGreetingKey(now: Date): LocaleKey {
  const hour = now.getHours();
  return hour < 12 ? "gaia.home.morning" : hour < 17 ? "gaia.home.afternoon" : "gaia.home.evening";
}
