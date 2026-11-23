// The mobile navigation sheet: a calm, full-screen command centre that replaces the old drawer. No bottom tabs — every
// destination, the recent people and the whole conversation list live in one scrollable sheet.
import { useEffect, useMemo, useState, type Ref } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";

import { BotAvatar } from "@/components/Avatar";
import { productName } from "@/lib/brand";
import { botUnreadCount } from "@/lib/bot-unread";
import { cn } from "@/lib/cn";
import { useShowThreads } from "@/lib/thread-preferences";
import { openInbox, useInboxPanel, useInboxView } from "@/state/inbox";
import { openBotRow } from "@/state/thread-navigation";
import { useStore } from "@/state/store";
import type { Bot } from "@/state/store";

import { useAutomationsNeedYou } from "../SidebarFooterNav";
import { MAUS_NAV_ITEMS, mausLabel, mausNavLabel, type MausNavId } from "./maus-nav";

function SheetRow({
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
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "maus-sheet-row flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-accent/60",
        active ? "bg-raised text-ink" : "text-ink-secondary hover:bg-ink/[0.06] hover:text-ink",
      )}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5">{label}</span>
      {attention && <span aria-label={attentionLabel} className="size-2 shrink-0 rounded-full bg-accent" />}
    </button>
  );
}

function BotRow({
  bot,
  showThreads,
  onOpened,
}: {
  bot: Bot;
  showThreads: boolean;
  onOpened: () => void;
}) {
  const { dispatch } = useStore();
  return (
    <button
      type="button"
      data-maus-bot={bot.id}
      aria-label={bot.name}
      onClick={() => {
        openBotRow(dispatch, bot, showThreads, false);
        onOpened();
      }}
      className="maus-sheet-row flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left outline-none transition-colors hover:bg-ink/[0.06] focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <BotAvatar bot={bot} size={30} label="" />
      <span className="min-w-0 flex-1 truncate text-[14px] leading-5 text-ink">{bot.name}</span>
      {botUnreadCount(bot) > 0 && <span aria-label="Unread" className="size-2 shrink-0 rounded-full bg-accent" />}
    </button>
  );
}

export function MausMobileSheet({ onClose, menuRef }: { onClose: () => void; menuRef?: Ref<HTMLButtonElement> }) {
  const { state, dispatch } = useStore();
  const showThreads = useShowThreads();
  const view = useInboxView();
  const { open: inboxOpen } = useInboxPanel();
  const automationsNeedYou = useAutomationsNeedYou();
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inboxUnread = (view?.rows ?? []).some((row) => row.unread || row.tab === "needs-you");
  const bots = useMemo(() => state.bots.filter((bot) => !bot.hidden), [state.bots]);
  const team = Boolean(state.config?.team);
  const workspaceName = state.config?.team?.name
    ?? (state.config?.profile as { name?: string } | undefined)?.name
    ?? mausLabel("maus.mobile.workspace", "Workspace");

  const activeFor = (id: MausNavId): boolean => {
    switch (id) {
      case "today": return state.activeView === "workspace" && !inboxOpen;
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
    onClose();
  };

  const ask = () => {
    dispatch({ type: "showWorkspace" });
    onClose();
    requestAnimationFrame(() => window.dispatchEvent(new Event("maus:focus-delegate")));
  };

  const rowFor = (id: MausNavId) => (
    <SheetRow
      key={id}
      id={id}
      active={activeFor(id)}
      attention={id === "inbox" ? inboxUnread : id === "work" ? automationsNeedYou : false}
      attentionLabel={id === "inbox" ? mausLabel("maus.nav.inbox", "Inbox") : mausLabel("maus.nav.automations", "Automations")}
      onClick={() => navigate(id)}
    />
  );

  const group = (title: string, ids: MausNavId[]) => (
    <section className="flex flex-col gap-0.5">
      <h2 className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">{title}</h2>
      {ids.map(rowFor)}
    </section>
  );

  const library: MausNavId[] = team ? ["files", "insights", "team"] : ["files", "insights"];

  return (
    <div
      data-maus-mobile-sheet=""
      role="dialog"
      aria-label={mausLabel("maus.mobile.menu", "Menu")}
      className="maus-sheet fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-panel text-ink"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-ink/10 px-5 py-4">
        <div aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-[15px] font-semibold text-panel">
          M
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold leading-5">{productName()}</div>
          <div className="truncate text-[12px] leading-4 text-ink-secondary">{workspaceName}</div>
        </div>
        <button
          ref={menuRef}
          type="button"
          onClick={onClose}
          aria-label={mausLabel("maus.mobile.close", "Close")}
          title={mausLabel("maus.mobile.close", "Close")}
          className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-secondary outline-none transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </header>

      <button
        type="button"
        onClick={ask}
        className="mx-5 mt-5 flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-[15px] font-medium text-panel outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <Sparkles size={17} strokeWidth={1.75} aria-hidden="true" />
        {mausLabel("maus.mobile.ask", "Ask MausBot")}
      </button>

      <nav aria-label="Primary" className="maus-sheet-nav mt-6 flex flex-col gap-5 px-3">
        {group(mausLabel("maus.mobile.workspace", "Workspace"), ["today", "inbox", "messages", "work"])}
        {group(mausLabel("maus.mobile.library", "Library"), library)}
        {group(mausLabel("maus.mobile.system", "System"), ["apps", "settings"])}
      </nav>

      <section className="flex flex-col gap-0.5 px-3 pb-8 pt-6">
        <h2 className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-secondary">
          {mausLabel("maus.mobile.recent", "Recent")}
        </h2>
        {bots.slice(0, 5).map((bot) => (
          <BotRow key={bot.id} bot={bot} showThreads={showThreads} onOpened={onClose} />
        ))}
        {bots.length === 0 && <p className="px-3 py-2 text-[13px] text-ink-secondary">—</p>}
        <button
          type="button"
          aria-expanded={allOpen}
          aria-controls="maus-sheet-all-conversations"
          onClick={() => setAllOpen((open) => !open)}
          className="maus-sheet-row flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-ink-secondary outline-none transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5">
            {mausLabel("maus.mobile.allConversations", "All conversations")}
          </span>
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className={cn("shrink-0 transition-transform", allOpen && "rotate-180")} />
        </button>
        {allOpen && (
          <div id="maus-sheet-all-conversations" className="mt-1 flex max-h-[38vh] flex-col gap-0.5 overflow-y-auto overscroll-contain">
            {bots.map((bot) => (
              <BotRow key={bot.id} bot={bot} showThreads={showThreads} onOpened={onClose} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
