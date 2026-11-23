import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { BotAvatar } from "@/components/Avatar";
import { useAutomationsNeedYou } from "@/components/SidebarFooterNav";
import { cn } from "@/lib/cn";
import { activeLocale, t } from "@/lib/i18n";
import { botUnreadCount } from "@/lib/bot-unread";
import { useShowThreads } from "@/lib/thread-preferences";
import { openBotRow } from "@/state/thread-navigation";
import { openInbox } from "@/state/inbox";
import { useStore, type Action, type AppState, type Bot as MausBot } from "@/state/store";

type Dispatch = (action: Action) => void;

const latestBotAt = (bot: MausBot) => {
  const stamps = (bot.tasks ?? []).map((task) => task.updatedAt ?? task.createdAt ?? 0);
  return stamps.length ? Math.max(...stamps) : 0;
};

/** A quiet, editorial section heading with a serif count set apart from the label. */
function SectionHeading({ label, count, id }: { label: string; count?: number; id?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-4 border-b border-hairline/50 pb-2">
      <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
        {label}
      </h2>
      {count !== undefined && count > 0 ? (
        <span className="font-serif text-lg leading-none text-ink-secondary">{count}</span>
      ) : null}
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

/** An AI-first home: hand off work, see what needs the person, then move on. */
export function MausHome() {
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
    () =>
      bots.filter((bot) =>
        bot.activity === "waiting-on-you" ||
        bot.activity === "working" ||
        bot.busy ||
        (state.pendingQueued[bot.threadId]?.length ?? 0) > 0,
      ),
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
  const teamName = state.config?.team?.name;

  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    window.addEventListener("maus:focus-delegate", onFocus);
    return () => window.removeEventListener("maus:focus-delegate", onFocus);
  }, []);

  const submit = (text: string) => {
    delegateText(text, dispatch, state);
    setDraft("");
  };

  const attention: Array<{ key: string; label: string; count?: number; onClick: () => void }> = [];
  if (waitingBots.length) {
    attention.push({
      key: "waiting",
      label: t("maus.home.waiting"),
      count: waitingBots.length,
      onClick: () => openBotRow(dispatch, waitingBots[0], showThreads, false),
    });
  }
  if (unreadBots.length) {
    attention.push({
      key: "unread",
      label: t("maus.home.unread"),
      count: unreadBots.reduce((sum, bot) => sum + botUnreadCount(bot), 0),
      onClick: () => openBotRow(dispatch, unreadBots[0], showThreads, false),
    });
  }
  if (automationsNeedYou) {
    attention.push({
      key: "automations",
      label: t("maus.home.automationAttention"),
      onClick: () => dispatch({ type: "showRoutines", section: "logs" }),
    });
  }
  if (unreadNotifications) {
    attention.push({
      key: "updates",
      label: t("maus.home.updates"),
      count: unreadNotifications,
      onClick: () => dispatch({ type: "toggleNotifications", open: true }),
    });
  }

  const inMotionCount = movingBots.length + (runningAutomations > 0 ? 1 : 0);
  const suggestions = [t("maus.home.suggestion1"), t("maus.home.suggestion2"), t("maus.home.suggestion3")];
  const intents = [
    t("maus.home.intent.plan"),
    t("maus.home.intent.create"),
    t("maus.home.intent.review"),
    t("maus.home.intent.automate"),
  ];
  const recentDate = (bot: MausBot) => {
    const stamp = latestBotAt(bot);
    return stamp
      ? new Intl.DateTimeFormat(activeLocale(), { month: "short", day: "numeric" }).format(new Date(stamp))
      : "";
  };

  const areas = [
    { key: "inbox", label: t("maus.home.area.inbox"), onClick: () => openInbox() },
    { key: "work", label: t("maus.home.area.work"), onClick: () => dispatch({ type: "showRoutines", view: "list" }) },
    { key: "files", label: t("maus.home.area.files"), onClick: () => dispatch({ type: "showFiles" }) },
    { key: "insights", label: t("maus.home.area.insights"), onClick: () => dispatch({ type: "showAnnouncements" }) },
  ];

  return (
    <div
      data-maus-home
      className="maus-home mx-auto w-full px-4 pt-20 pb-16 text-ink md:max-w-[880px] md:px-8 md:pt-12"
    >
      <header className="mb-10 md:mb-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
          {t("maus.home.eyebrow")}
          <span aria-hidden="true" className="mx-2 text-ink-tertiary/50">/</span>
          {date}
        </p>
        <h1 className="mt-4 text-[clamp(2.25rem,8vw,4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
          {firstName ? t("maus.home.greetingName", { name: firstName }) : t("maus.home.greeting")}
        </h1>
        <p className="mt-5 max-w-[46ch] text-[15px] leading-7 text-ink-secondary md:text-base">
          {t("maus.home.summary")}
        </p>
      </header>

      <section aria-labelledby="maus-delegate-title" className="mb-12 md:mb-16">
        <div className="maus-card relative overflow-hidden rounded-[24px] border border-hairline/60 bg-panel p-6 shadow-[0_1px_0_var(--color-edge)] md:p-10">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/30 to-transparent" />
          <h2 id="maus-delegate-title" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
            {t("maus.home.delegateTitle")}
          </h2>
          <div className="mt-5 flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit(draft);
                }
              }}
              rows={2}
              aria-label={t("maus.home.delegateTitle")}
              placeholder={t("maus.home.delegatePlaceholder")}
              className="min-h-11 flex-1 resize-none bg-transparent text-[17px] leading-7 text-ink placeholder:text-ink-tertiary focus:outline-none md:text-lg"
            />
            <button
              type="button"
              onClick={() => submit(draft)}
              disabled={!draft.trim()}
              aria-label={t("maus.home.delegateAction")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowUp size={19} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-tertiary">
            {intents.map((intent, index) => (
              <span key={intent} className="inline-flex items-center gap-3">
                {index > 0 ? <span aria-hidden="true" className="text-ink-tertiary/40">·</span> : null}
                {intent}
              </span>
            ))}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                aria-label={suggestion}
                onClick={() => {
                  setDraft(suggestion);
                  submit(suggestion);
                }}
                className="flex min-h-11 items-center rounded-full border border-hairline/70 px-4 py-2 text-[13px] text-ink-secondary transition hover:border-accent/50 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="maus-focus-title" className="mb-12 md:mb-16">
        <SectionHeading id="maus-focus-title" label={t("maus.home.focus")} count={attention.length} />
        {attention.length === 0 ? (
          <div className="maus-card rounded-[24px] border border-hairline/50 bg-elevated/40 px-6 py-8 md:py-10">
            <p className="max-w-[42ch] font-serif text-2xl leading-snug text-ink md:text-3xl">
              {t("maus.home.allClear")}
            </p>
          </div>
        ) : (
          <ul>
            {attention.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={item.onClick}
                  className="flex min-h-14 w-full items-center gap-4 border-b border-hairline/40 py-3 text-left transition hover:bg-elevated/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="flex-1 text-[15px] font-medium text-ink">{item.label}</span>
                  {item.count !== undefined ? (
                    <span className="font-serif text-2xl leading-none text-ink-secondary">{item.count}</span>
                  ) : null}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                    {t("maus.home.reviewNow")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="maus-motion-title" className="mb-12 md:mb-16">
        <SectionHeading id="maus-motion-title" label={t("maus.home.motion")} count={inMotionCount} />
        {inMotionCount === 0 ? (
          <p className="max-w-[46ch] text-[14px] leading-6 text-ink-secondary">{t("maus.home.noMotion")}</p>
        ) : (
          <ul>
            {movingBots.slice(0, 3).map((bot) => (
              <li key={bot.id}>
                <button
                  type="button"
                  onClick={() => openBotRow(dispatch, bot, showThreads, false)}
                  aria-label={`${bot.name} — ${bot.activity === "waiting-on-you" ? t("maus.home.waiting") : t("maus.home.working")}`}
                  className="flex min-h-16 w-full items-center gap-4 border-b border-hairline/40 py-3 text-left transition hover:bg-elevated/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <BotAvatar bot={bot} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{bot.name}</span>
                    <span className="block truncate text-[13px] text-ink-secondary">{bot.title}</span>
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                    {bot.activity === "waiting-on-you" ? t("maus.home.waiting") : t("maus.home.working")}
                  </span>
                </button>
              </li>
            ))}
            {runningAutomations > 0 ? (
              <li>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "showRoutines", section: "logs" })}
                  className="flex min-h-16 w-full items-center gap-4 border-b border-hairline/40 py-3 text-left transition hover:bg-elevated/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="flex-1 text-[15px] font-medium text-ink">{t("maus.home.automationsRunning")}</span>
                  <span className="font-serif text-2xl leading-none text-ink-secondary">{runningAutomations}</span>
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section aria-labelledby="maus-recent-title" className="mb-12 md:mb-16">
        <SectionHeading id="maus-recent-title" label={t("maus.home.recent")} count={bots.length} />
        {bots.length === 0 ? (
          <p className="max-w-[46ch] text-[14px] leading-6 text-ink-secondary">{t("maus.home.noRecent")}</p>
        ) : (
          <ol>
            {bots.slice(0, 4).map((bot, index) => (
              <li key={bot.id}>
                <button
                  type="button"
                  onClick={() => openBotRow(dispatch, bot, showThreads, false)}
                  aria-label={bot.name}
                  className="flex min-h-14 w-full items-center gap-4 border-b border-hairline/40 py-3 text-left transition hover:bg-elevated/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="w-6 shrink-0 font-serif text-lg text-ink-tertiary" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{bot.name}</span>
                  <span className="shrink-0 text-[12px] text-ink-tertiary">{recentDate(bot)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="maus-team-title" className="mb-12 md:mb-16">
        <SectionHeading id="maus-team-title" label={t("maus.home.team")} count={bots.length} />
        {bots.length === 0 ? null : (
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {bots.slice(0, 8).map((bot) => (
              <button
                key={bot.id}
                type="button"
                onClick={() => openBotRow(dispatch, bot, showThreads, false)}
                aria-label={bot.name}
                className="flex min-h-28 w-[150px] shrink-0 flex-col items-start gap-3 rounded-[24px] border border-hairline/60 bg-panel p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
              >
                <BotAvatar bot={bot} size={40} />
                <span className="w-full min-w-0">
                  <span className="block truncate text-[14px] font-medium text-ink">{bot.name}</span>
                  <span className="block truncate text-[12px] text-ink-tertiary">{bot.title}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="maus-areas-title">
        <SectionHeading
          id="maus-areas-title"
          label={teamName ? `${t("maus.home.areas")} · ${teamName}` : t("maus.home.areas")}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {areas.map((area, index) => (
            <button
              key={area.key}
              type="button"
              onClick={area.onClick}
              aria-label={`${t("maus.home.openArea")}: ${area.label}`}
              className={cn(
                "maus-card group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-[24px] border border-hairline/60 bg-panel p-6 text-left shadow-[0_1px_0_var(--color-edge)]",
                "transition-transform duration-200 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none md:p-10",
              )}
            >
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent/40 to-transparent" />
              <span aria-hidden="true" className="font-serif text-3xl leading-none text-ink-tertiary/60">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block text-[15px] font-medium leading-snug text-ink md:text-lg">{area.label}</span>
                <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-tertiary">
                  {t("maus.home.openArea")}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
