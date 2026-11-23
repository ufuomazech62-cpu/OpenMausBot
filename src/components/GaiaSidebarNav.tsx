import { Bell, Brain, Home, ListTodo, MessageSquare, Puzzle, Search, Settings, Zap, type LucideIcon } from "lucide-react";

import { t } from "@/lib/i18n";
import { GAIA_IA, gaiaMainNav, type GaiaSection, type IaAction } from "@/lib/gaia-ia";
import { useStore } from "@/state/store";

import { openCommandPalette } from "./CommandPalette";
import { NavRow } from "./SidebarFooterNav";

/** Icons are OpenMausBot's existing lucide set; the keys are IA keys, not GAIA's
 * icon components or assets. */
const ICONS: Record<GaiaSection, LucideIcon> = {
  home: Home,
  chats: MessageSquare,
  tasks: ListTodo,
  integrations: Puzzle,
  workflows: Zap,
  notifications: Bell,
  memory: Brain,
  search: Search,
  settings: Settings,
};

/**
 * GAIA's shared-drawer main nav, rendered with OpenMausBot's existing NavRow and
 * tokens. Inserted right below the sidebar's search field; the rest of the
 * sidebar (and the mobile drawer behaviour) is unchanged.
 */
export function GaiaSidebarNav() {
  const { state, dispatch } = useStore();

  const run = (action: IaAction) => {
    if (action.type === "openCommandPalette") {
      openCommandPalette();
      return;
    }
    dispatch(action);
  };

  const tone = (active: boolean) => (active ? "text-accent" : "text-ink-secondary");
  const row = (section: GaiaSection) => {
    const entry = GAIA_IA[section];
    const Icon = ICONS[section];
    const active =
      section === "home" ? state.activeView === "home"
        : section === "chats" ? state.activeView === "chat"
          : section === "integrations" ? state.pluginsOpen
            : section === "tasks" || section === "workflows" ? state.activeView === "routines"
              : section === "notifications" ? state.notificationsOpen
                : section === "settings" ? state.appSettingsOpen
                  : section === "memory" ? state.settingsOpen && state.botSettingsSection === "memory"
                    : false;
    return (
      <NavRow
        key={section}
        id={`gaia-${section}`}
        label={t(entry.labelKey)}
        iconsOnly={false}
        active={active}
        icon={(on) => <Icon size={16} className={tone(on)} aria-hidden="true" />}
        onClick={() => run(entry.action)}
      />
    );
  };

  return (
    <nav aria-label={t("gaia.nav")} data-gaia-nav-root className="flex flex-col gap-0.5 px-3 pb-2">
      {row("home")}
      {gaiaMainNav().map((entry) => row(entry.section))}
      <div data-gaia-nav-secondary className="mt-1 border-t border-hairline/30 pt-1">
        {(["notifications", "memory", "search", "settings"] as const).map((section) => row(section))}
      </div>
    </nav>
  );
}
