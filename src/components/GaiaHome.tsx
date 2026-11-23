import { Bell, MessageSquare, Zap } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { gaiaGreetingKey, gaiaHomeData } from "@/lib/gaia-ia";
import { openBot, useStore } from "@/state/store";

import { TOOL_PAGE_TITLE, ToolPage, ToolPageHeader } from "./ToolPageShell";

/**
 * Home dashboard: GAIA's *structure* (greeting/date + glanceable cards) built
 * only from OpenMausBot state and existing CSS tokens. No GAIA code, colours,
 * icons or copy. Reached from the sidebar header/main nav, never a bottom tab.
 */
export function GaiaHome() {
  const { state, dispatch } = useStore();
  const data = gaiaHomeData(state);
  const now = new Date();
  const back = () => dispatch({ type: "showChat" });

  const cardClass = "w-full rounded-xl border border-hairline/40 bg-raised/40 p-3 text-left transition-colors hover:bg-raised";
  const titleClass = "flex items-center gap-2 text-[13px] font-medium text-ink-secondary";

  return (
    <ToolPage label="Home">
      <ToolPageHeader backLabel={t("gaia.home")} onBack={back}>
        <h1 data-tour="gaia-home" className={TOOL_PAGE_TITLE}>{t("gaia.home")}</h1>
      </ToolPageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
          <div>
            <p className="text-[14px] font-medium text-ink-secondary">{t(gaiaGreetingKey(now))}</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </h2>
          </div>

          <div data-gaia-home-grid className="grid gap-3 sm:grid-cols-2">
            <button type="button" data-gaia-home-card="unread" onClick={back} className={cardClass}>
              <span className={titleClass}><MessageSquare size={15} aria-hidden="true" />{t("gaia.home.unread")}</span>
              <span className="mt-2 block text-[28px] font-semibold leading-none text-ink">{data.unreadCount}</span>
            </button>

            <button type="button" data-gaia-home-card="notifications" onClick={() => dispatch({ type: "toggleNotifications", open: true })} className={cardClass}>
              <span className={titleClass}><Bell size={15} aria-hidden="true" />{t("gaia.home.notifications")}</span>
              <span className="mt-2 block text-[28px] font-semibold leading-none text-ink">{data.notificationCount}</span>
            </button>

            <section data-gaia-home-card="recent" className={cn(cardClass, "cursor-default hover:bg-raised/40")}>
              <h3 className={titleClass}><MessageSquare size={15} aria-hidden="true" />{t("gaia.home.recent")}</h3>
              {data.recentConversations.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-tertiary">{t("gaia.home.empty")}</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {data.recentConversations.map((conversation) => {
                    const bot = state.bots.find((candidate) => candidate.id === conversation.id);
                    return (
                      <li key={conversation.id}>
                        <button
                          type="button"
                          data-gaia-home-recent={conversation.id}
                          onClick={() => bot ? openBot(dispatch, bot, false) : back()}
                          className="w-full truncate rounded-md px-1 py-1 text-left text-[13px] text-ink hover:bg-raised hover:text-ink"
                        >
                          {conversation.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section data-gaia-home-card="workflows" className={cn(cardClass, "cursor-default hover:bg-raised/40")}>
              <h3 className={titleClass}><Zap size={15} aria-hidden="true" />{t("gaia.home.workflows")}</h3>
              {data.activeWorkflows.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-tertiary">{t("gaia.home.empty")}</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {data.activeWorkflows.map((workflow) => (
                    <li key={workflow.id}>
                      <button
                        type="button"
                        data-gaia-home-workflow={workflow.id}
                        onClick={() => dispatch({ type: "showRoutines", view: "list" })}
                        className="w-full truncate rounded-md px-1 py-1 text-left text-[13px] text-ink hover:bg-raised hover:text-ink"
                      >
                        {workflow.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
