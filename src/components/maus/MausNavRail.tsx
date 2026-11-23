// The desktop primary rail: a quiet 72px column of icon-and-label destinations. No bottom bar, no chrome, no raw
// infrastructure — just the nine places a person goes, with a small accent for where they are and what needs them.
import { openInbox, useInboxPanel, useInboxView } from "@/state/inbox";
import { useStore } from "@/state/store";
import { cn } from "@/lib/cn";

import { useAutomationsNeedYou } from "../SidebarFooterNav";
import { MAUS_NAV_ITEMS, mausLabel, mausNavLabel, type MausNavId } from "./maus-nav";

function RailButton({
  id,
  active,
  attention,
  attentionLabel,
  onClick,
}: {
  id: MausNavId;
  active: boolean;
  attention?: boolean;
  attentionLabel?: string;
  onClick: () => void;
}) {
  const item = MAUS_NAV_ITEMS[id];
  const label = mausNavLabel(id);
  const Icon = item.Icon;
  return (
    <button
      type="button"
      data-maus-nav={id}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "maus-rail-button relative flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-accent/60",
        active ? "bg-raised text-ink" : "text-ink-secondary hover:bg-ink/[0.06] hover:text-ink",
      )}
    >
      {active && (
        <span aria-hidden="true" className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
      )}
      <span className="relative grid place-items-center">
        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        {attention && (
          <span
            aria-label={attentionLabel}
            className="absolute -right-1 -top-0.5 size-2 rounded-full border border-panel bg-accent"
          />
        )}
      </span>
      <span className="text-[10px] font-medium leading-none tracking-tight">{label}</span>
    </button>
  );
}

export function MausNavRail() {
  const { state, dispatch } = useStore();
  const view = useInboxView();
  const { open: inboxOpen } = useInboxPanel();
  const automationsNeedYou = useAutomationsNeedYou();

  const inboxUnread = (view?.rows ?? []).some((row) => row.unread || row.tab === "needs-you");
  const team = Boolean(state.config?.team);

  const activeFor = (id: MausNavId): boolean => {
    switch (id) {
      case "today": return state.activeView === "workspace";
      case "inbox": return inboxOpen;
      case "messages": return state.activeView === "chat";
      case "work": return state.activeView === "routines";
      case "files": return state.activeView === "files";
      case "insights": return state.activeView === "announcements";
      case "team": return state.activeView === "team-map";
      case "apps": return state.pluginsOpen;
      case "settings": return state.appSettingsOpen;
    }
  };

  const navigate = (id: MausNavId) => {
    switch (id) {
      case "today": dispatch({ type: "showWorkspace" }); break;
      case "inbox": openInbox(); break;
      case "messages": dispatch({ type: "showChat" }); break;
      case "work": dispatch({ type: "showRoutines", view: "list" }); break;
      case "files": dispatch({ type: "showFiles" }); break;
      case "insights": dispatch({ type: "showAnnouncements" }); break;
      case "team": dispatch({ type: "showTeamMap" }); break;
      case "apps": dispatch({ type: "togglePlugins", open: true }); break;
      case "settings": dispatch({ type: "toggleAppSettings", open: true, section: "overview" }); break;
    }
  };

  const primary: MausNavId[] = team
    ? ["today", "inbox", "messages", "work", "files", "insights", "team"]
    : ["today", "inbox", "messages", "work", "files", "insights"];
  const system: MausNavId[] = ["apps", "settings"];

  return (
    <nav data-maus-nav-rail="" aria-label="Primary" className="maus-rail hidden h-full w-[72px] shrink-0 flex-col items-center gap-3 border-r border-ink/10 bg-panel px-2 py-3 md:flex">
      <div aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-[16px] font-semibold text-panel">
        M
      </div>
      <div className="flex w-full flex-col items-center gap-1">
        {primary.map((id) => (
          <RailButton
            key={id}
            id={id}
            active={activeFor(id)}
            attention={id === "inbox" ? inboxUnread : id === "work" ? automationsNeedYou : false}
            attentionLabel={id === "inbox" ? mausLabel("maus.nav.inbox", "Inbox") : mausLabel("maus.nav.automations", "Automations")}
            onClick={() => navigate(id)}
          />
        ))}
      </div>
      <div className="mt-auto flex w-full flex-col items-center gap-1 border-t border-ink/10 pt-3">
        {system.map((id) => (
          <RailButton key={id} id={id} active={activeFor(id)} onClick={() => navigate(id)} />
        ))}
      </div>
    </nav>
  );
}
