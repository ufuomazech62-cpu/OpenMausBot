import { forwardRef } from "react";
import { Menu, Sparkles } from "lucide-react";
import { useStore } from "@/state/store";
import { t } from "@/lib/i18n";

type Props = {
  onOpen: () => void;
  onAsk: () => void;
};

function labelForView(activeView: string): string {
  switch (activeView) {
    case "workspace":
      return t("maus.nav.today");
    case "chat":
      return t("maus.nav.messages");
    case "routines":
      return t("maus.nav.work");
    case "files":
      return t("maus.nav.files");
    case "announcements":
      return t("maus.nav.insights");
    case "team-map":
      return t("maus.nav.team");
    case "published-apps":
      return t("maus.nav.apps");
    default:
      return t("maus.mobile.workspace");
  }
}

export const MausMobileBar = forwardRef<HTMLButtonElement, Props>(
  function MausMobileBar({ onOpen, onAsk }, ref) {
    const { state } = useStore();
    const activeView = state.activeView;

    return (
      <header
        data-maus-mobile-bar
        className="maus-mobile-bar fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-hairline bg-bg/95 px-3 backdrop-blur-md md:hidden"
      >
        <button
          type="button"
          aria-label={t("maus.mobile.menu")}
          onClick={onOpen}
          ref={ref}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-elevated text-ink transition hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Menu size={19} strokeWidth={1.8} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-[13px] font-semibold text-accent-ink">
            M
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold leading-none tracking-tight text-ink">
              {t("maus.mobile.workspace")}
            </div>
            <div className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.14em] text-ink-tertiary">
              {labelForView(activeView)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onAsk}
          className="maus-ask flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-accent-border bg-accent/10 px-3.5 text-[13px] font-medium text-accent transition hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Sparkles size={14} strokeWidth={2} />
          <span>{t("maus.mobile.ask")}</span>
        </button>
      </header>
    );
  },
);
