import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { BotAvatar } from "@/components/Avatar";
import { useAutomationsNeedYou } from "@/components/SidebarFooterNav";
import { cn } from "@/lib/cn";
import { activeLocale, t } from "@/lib/i18n";
import { botUnreadCount } from "@/lib/bot-unread";
import { useShowThreads } from "@/lib/thread-preferences";
import { openBotRow } from "@/state/thread-navigation";
import { useStore, type Action, type AppState, type Bot as MausBot } from "@/state/store";

type Dispatch = (action: Action) => void;

const timeOfDay = (hour: number) => {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

const latestBotAt = (bot: MausBot) => {
  const stamps = (bot.tasks ?? []).map((task) => task.updatedAt ?? task.createdAt ?? 0);
  return stamps.length ? Math.max(...stamps) : 0;
};

function AccentCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="relative overflow-hidden rounded-3xl border border-hairline/60 bg-panel p-6 shadow-[0_1px_0_var(--color-edge)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none md:p-10">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent/70 via-ink-tertiary/30 to-transparent" />
      {children}
    </div>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus", className)}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">{children}</h2>
      {count !== undefined && count > 0 ? <span className="font-serif text-lg text-ink-secondary">{count}</span> : null}
    </div>
  );
}

function delegateText(text: string, dispatch: Dispatch, state: AppState) {
  const value = text.trim();
  if (!value) return;
  const target = state.bots.find((bot) => !bot.hidden) ?? state.bots[0];
  const send = (botId: string) => {
    dispatch({ type: "send", botId, text: value, mode: "goal" });
    dispatch({ type: "showChat" });
  };
  if (target) send(target.id);
  else {
    dispatch({ type: "showChat" });
    dispatch({ type: "newBot", onCreated: (bot) => send(bot.id) });
  }
}

/** A calm, AI-first operating workspace: delegate work, see what needs the person, and continue work in motion. */
export function WorkspaceHome() {
  const { state, dispatch } = useStore();
  const showThreads = useShowThreads();
  const automationsNeedYou = useAutomationsNeedYou();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const bots = useMemo(
    () => [...state.bots].filter((bot) => !bot.hidden).sort((a, b) => latestBotAt(b) - latestBotAt(a)),
    [state.bots],
  );

  const unreadBots = useMemo(() => bots.filter((bot) => botUnreadCount(bot) > 0), [bots]);
  const waitingBots = useMemo(() => bots.filter((bot) => bot.activity === "waiting-on-you"), [bots]);
  const movingBots = useMemo(
    () => bots.filter((bot) => bot.activity === "working" || bot.busy || (state.pendingQueued[bot.threadId]?.length ?? 0) > 0),
    [bots, state.pendingQueued],
  );
  const unreadNotifications = state.notifications.filter((entry) => !entry.read).length;
  const runningAutomations = state.routineRuns.filter((run) => !run.finishedAt && !run.error).length;

  const date = useMemo(
    () => new Intl.DateTimeFormat(activeLocale(), { weekday: "short", month: "short", day: "numeric" }).format(new Date()),
    [],
  );
  const profile = state.config?.profile as { name?: string } | undefined;
  const firstName = profile?.name?.trim().split(/\s+/)[0];

  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener("maus:focus-delegate", onFocus);
    return () => window.removeEventListener("maus:focus-delegate", onFocus);
  }, []);

  const needsYou: Array<{ key: string; label: string; count?: number; onClick: () => void }> = [];
  if (waitingBots.length) {
    needsYou.push({
      key: "waiting",
      label: t("workspace.waitingForYou"),
      count: waitingBots.length,
      onClick: () => openBotRow(dispatch, waitingBots[0], showThreads, false),
    });
  }
  if (unreadBots.length) {
    needsYou.push({
      key: "unread",
      label: t("workspace.conversationsWaiting"),
      count: unreadBots.reduce((sum, bot) => sum + botUnreadCount(bot), 0),
      onClick: () => openBotRow(dispatch, unreadBots[0], showThreads, false),
    });
  }
  if (automationsNeedYou) {
    needsYou.push({ key: "automations", label: t("workspace.automationNeedsYou"), onClick: () => dispatch({ type: "showRoutines", section: "logs" }) });
  }
  if (unreadNotifications) {
    needsYou.push({
      key: "notifications",
      label: t("workspace.newUpdates"),
      count: unreadNotifications,
      onClick: () => dispatch({ type: "toggleNotifications", open: true }),
    });
  }

  const suggestions = [t("workspace.suggestionPlan"), t("workspace.suggestionReview"), t("workspace.suggestionCopy")];
  const inMotionCount = movingBots.length + (runningAutomations > 0 ? 1 : 0);
  const teamName = state.config?.team?.name;

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-16 pt-8 md:px-8 md:pt-14">
      <header className="mb-8 md:mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">{date}</p>
        <h1 className="mt-2 text-[clamp(2rem,7vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-ink">
          {firstName ? t("workspace.greetingName", { name: firstName, time: timeOfDay(new Date().getHours()) }) : t("workspace.greeting", { time: timeOfDay(new Date().getHours()) })}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-ink-secondary md:text-base">{t("workspace.summary")}</p>
      </header>

      <AccentCard className="mb-10 md:mb-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">{t("workspace.delegateLabel")}</p>
        <div className="mt-4 flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                delegateText(draft, dispatch, state);
                setDraft("");
              }
            }}
            rows={2}
            aria-label={t("workspace.delegateLabel")}
            placeholder={t("workspace.delegatePlaceholder")}
            className="min-h-[64px] flex-1 resize-none bg-transparent text-[17px] leading-7 text-ink placeholder:text-ink-tertiary focus:outline-none md:text-lg"
          />
          <button
            type="button"
            onClick={() => {
              delegateText(draft, dispatch, state);
              setDraft("");
            }}
            disabled={!draft.trim()}
            aria-label={t("workspace.delegateAction")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                delegateText(suggestion, dispatch, state);
                setDraft("");
              }}
              className="rounded-full border border-hairline/70 px-3 py-1.5 text-[13px] text-ink-secondary transition hover:border-accent/50 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </AccentCard>

      <section className="mb-10 md:mb-14">
        <SectionLabel count={needsYou.length}>{t("workspace.needsYou")}</SectionLabel>
        {needsYou.length === 0 ? (
          <p className="rounded-2xl border border-hairline/50 bg-elevated/40 px-4 py-5 text-[14px] text-ink-secondary">{t("workspace.allClear")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {needsYou.map((item) => (
              <AccentCard key={item.key} onClick={item.onClick}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[15px] font-medium text-ink">{item.label}</span>
                  {item.count !== undefined && <span className="font-serif text-2xl text-ink-secondary">{item.count}</span>}
                </div>
                <p className="mt-2 text-[13px] text-ink-tertiary">{t("workspace.reviewNow")}</p>
              </AccentCard>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10 md:mb-14">
        <SectionLabel count={inMotionCount}>{t("workspace.inMotion")}</SectionLabel>
        {inMotionCount === 0 ? (
          <p className="rounded-2xl border border-hairline/50 bg-elevated/40 px-4 py-5 text-[14px] text-ink-secondary">{t("workspace.noMotion")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {movingBots.slice(0, 3).map((bot) => (
              <AccentCard key={bot.id} onClick={() => openBotRow(dispatch, bot, showThreads, false)}>
                <div className="flex items-center gap-3">
                  <BotAvatar bot={bot} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">{bot.name}</p>
                    <p className="truncate text-[13px] text-ink-secondary">{bot.title || t("workspace.working")}</p>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{t("workspace.working")}</span>
                </div>
              </AccentCard>
            ))}
            {runningAutomations > 0 && (
              <AccentCard onClick={() => dispatch({ type: "showRoutines", section: "logs" })}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[15px] font-medium text-ink">{t("workspace.automationsRunning")}</span>
                  <span className="font-serif text-2xl text-ink-secondary">{runningAutomations}</span>
                </div>
                <p className="mt-2 text-[13px] text-ink-tertiary">{t("workspace.reviewNow")}</p>
              </AccentCard>
            )}
          </div>
        )}
      </section>

      <section className="mb-10 md:mb-14">
        <SectionLabel count={bots.length}>{t("workspace.yourTeam")}</SectionLabel>
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {bots.slice(0, 8).map((bot) => (
            <button
              key={bot.id}
              type="button"
              onClick={() => openBotRow(dispatch, bot, showThreads, false)}
              className="flex min-w-[168px] shrink-0 flex-col items-start gap-3 rounded-3xl border border-hairline/60 bg-panel p-5 text-left transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <BotAvatar bot={bot} size={40} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">{bot.name}</p>
                <p className="truncate text-[12px] text-ink-tertiary">{bot.title || t("workspace.specialist")}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>{teamName ? t("workspace.openAt", { team: teamName }) : t("workspace.openAreas")}</SectionLabel>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            { label: t("workspace.conversations"), onClick: () => dispatch({ type: "showChat" }) },
            { label: t("workspace.automations"), onClick: () => dispatch({ type: "showRoutines" }) },
            { label: t("workspace.files"), onClick: () => dispatch({ type: "showFiles" }) },
            { label: t("workspace.apps"), onClick: () => dispatch({ type: "togglePlugins", open: true, surface: "apps" }) },
          ].map((area) => (
            <button
              key={area.label}
              type="button"
              onClick={area.onClick}
              className="rounded-2xl border border-hairline/60 bg-elevated/40 px-4 py-4 text-left text-[14px] font-medium text-ink transition hover:border-accent/40 hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {area.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
