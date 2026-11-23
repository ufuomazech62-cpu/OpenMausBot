// Shared descriptors for the new Maus navigation. The labels come from the maus.* locale keys; the English copy is a
// safety net for the window before a locale pack carries the new keys. Icons stay small and calm in both surfaces.
import { BarChart3, BriefcaseBusiness, FolderOpen, House, Inbox, Link2, MessagesSquare, SlidersHorizontal, UsersRound, type LucideIcon } from "lucide-react";

import { t } from "@/lib/i18n";
import type { LocaleKey } from "@/locales";

/** Always calls t() with the real key, but never lets a missing locale pack break the UI. */
export function mausLabel(key: string, fallback: string): string {
  try {
    const value = t(key as LocaleKey);
    return typeof value === "string" && value.length > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

export type MausNavId =
  | "today"
  | "inbox"
  | "messages"
  | "work"
  | "files"
  | "insights"
  | "team"
  | "apps"
  | "settings";

export interface MausNavItem {
  id: MausNavId;
  labelKey: string;
  fallback: string;
  Icon: LucideIcon;
}

export const MAUS_NAV_ITEMS: Readonly<Record<MausNavId, MausNavItem>> = {
  today: { id: "today", labelKey: "maus.nav.today", fallback: "Today", Icon: House },
  inbox: { id: "inbox", labelKey: "maus.nav.inbox", fallback: "Inbox", Icon: Inbox },
  messages: { id: "messages", labelKey: "maus.nav.messages", fallback: "Messages", Icon: MessagesSquare },
  work: { id: "work", labelKey: "maus.nav.work", fallback: "Work", Icon: BriefcaseBusiness },
  files: { id: "files", labelKey: "maus.nav.files", fallback: "Files", Icon: FolderOpen },
  insights: { id: "insights", labelKey: "maus.nav.insights", fallback: "Insights", Icon: BarChart3 },
  team: { id: "team", labelKey: "maus.nav.team", fallback: "Team", Icon: UsersRound },
  apps: { id: "apps", labelKey: "maus.nav.connections", fallback: "Connections", Icon: Link2 },
  settings: { id: "settings", labelKey: "maus.nav.preferences", fallback: "Preferences", Icon: SlidersHorizontal },
};

export function mausNavLabel(id: MausNavId): string {
  const item = MAUS_NAV_ITEMS[id];
  return mausLabel(item.labelKey, item.fallback);
}
