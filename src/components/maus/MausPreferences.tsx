import { useEffect, useSyncExternalStore, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { FEEDBACK_URL, HELP_CENTER_URL, openExternalLink } from "@/lib/app-links";
import { activeLocale, t, tFromServer } from "@/lib/i18n";
import { effectiveLanguage, setLanguageChoice, useLanguageChoice } from "@/lib/language-preference";
import {
  setFinishedNotifications,
  setNotificationFeed,
  setNotificationSounds,
  useFinishedNotifications,
  useNotificationFeed,
  useNotificationSounds,
} from "@/lib/notification-preferences";
import { applySkinChoice, readSkinChoice, subscribeSkin, THEME_SKINS, type SkinChoice } from "@/lib/skins";
import { saveTeamProfile } from "@/lib/own-profile";
import { localeChoices } from "@/locales";
import { api, useStore, type ConfigStatus } from "@/state/store";

export type MausPreferencesProps = {
  /** Opens the real connections screen. The Connected apps row is only a button when this is supplied. */
  onOpenConnections?: () => void;
  /** When present the screen is shown as a panel and gets a close control. */
  onClose?: () => void;
};

/** The same quiet editorial heading MausHome uses, so preferences reads as part of the same product. */
function SectionHeading({ id, label, note }: { id: string; label: string; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-4 border-b border-hairline/50 pb-2">
      <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
        {label}
      </h2>
      {note ? <span className="font-serif text-lg leading-none text-ink-secondary">{note}</span> : null}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="maus-card rounded-[24px] border border-hairline/60 bg-panel p-6 shadow-[0_1px_0_var(--color-edge)] md:p-10">
      {children}
    </div>
  );
}

/** A calm on/off control. It is always wired to a real preference setter supplied by the caller. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  marker,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  marker: string;
}) {
  return (
    <div data-pref={marker} className="flex min-h-16 items-center justify-between gap-6 border-b border-hairline/40 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink">{label}</p>
        <p className="mt-1 text-[13px] leading-5 text-ink-secondary">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-pref-toggle={marker}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${checked ? "bg-accent" : "bg-ink/10"}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

const THEMES = [
  { choice: "system" as SkinChoice, label: t("settings.theme.system") },
  { choice: THEME_SKINS.light, label: t("settings.theme.light") },
  { choice: THEME_SKINS.dark, label: t("settings.theme.dark") },
];

/** MausBot's consumer preferences: the things a person wants to change, and nothing a developer needs. */
export function MausPreferences({ onOpenConnections, onClose }: MausPreferencesProps) {
  const { state, dispatch } = useStore();
  const theme = useSyncExternalStore(subscribeSkin, readSkinChoice, readSkinChoice);

  const finished = useFinishedNotifications();
  const sounds = useNotificationSounds();
  const feed = useNotificationFeed();
  const languageChoice = useLanguageChoice();
  const language = effectiveLanguage(languageChoice, state.config?.language);

  const profile = state.config?.profile;
  const team = Boolean(state.config?.team);
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setName(profile?.name ?? "");
    setEmail(profile?.email ?? "");
  }, [profile?.name, profile?.email]);

  const saveProfile = async () => {
    setSaveState("saving");
    try {
      if (team) {
        const saved = await saveTeamProfile({ name: name.trim() });
        dispatch({ type: "profileSaved", profile: { name: saved.name, email: saved.email } });
      } else {
        const config = await api<ConfigStatus>("/api/config", {
          method: "PUT",
          body: JSON.stringify({ profile: { name: name.trim(), email: email.trim().toLowerCase() } }),
        });
        if (config.profile) {
          dispatch({ type: "profileSaved", profile: { name: config.profile.name, email: config.profile.email } });
        }
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const closeLabel = tFromServer("maus.preferences.close", "Close preferences");
  const appearanceLabel = tFromServer("maus.preferences.appearance", "Appearance");
  const profileLabel = tFromServer("maus.preferences.profile", "Profile");
  const notificationsLabel = tFromServer("maus.preferences.notifications", "Notifications");
  const languageLabel = tFromServer("maus.preferences.language", "Language");
  const helpLabel = tFromServer("maus.preferences.help", "Help & support");

  return (
    <div data-maus-preferences className="maus-preferences mx-auto w-full px-4 pt-12 pb-16 text-ink md:max-w-[880px] md:px-8">
      <header className="mb-10 flex items-start justify-between gap-6 md:mb-14">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
            {tFromServer("maus.nav.preferences", "Preferences")}
            <span aria-hidden="true" className="mx-2 text-ink-tertiary/50">/</span>
            {new Intl.DateTimeFormat(activeLocale(), { month: "long", day: "numeric" }).format(new Date())}
          </p>
          <h1 className="mt-4 text-[clamp(2.25rem,8vw,4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
            {tFromServer("maus.nav.preferences", "Preferences")}
          </h1>
          <p className="mt-5 max-w-[46ch] text-[15px] leading-7 text-ink-secondary md:text-base">
            {tFromServer("maus.preferences.summary", "A few small things, just the way you like them.")}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline/60 text-ink-secondary transition hover:border-accent/50 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <X size={19} aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <section aria-labelledby="maus-pref-profile" data-maus-section="profile" className="mb-12 md:mb-16">
        <SectionHeading id="maus-pref-profile" label={profileLabel} />
        <Card>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
                {t("settings.profile.name")}
              </span>
              <input
                value={name}
                onChange={(event) => { setName(event.target.value); setSaveState("idle"); }}
                aria-label={t("settings.profile.name")}
                autoComplete="name"
                placeholder={t("settings.profile.name")}
                className="mt-2 min-h-11 w-full rounded-xl border border-hairline/60 bg-app px-4 text-[15px] text-ink placeholder:text-ink-tertiary focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
                {t("phone.signIn.email")}
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setSaveState("idle"); }}
                aria-label={t("phone.signIn.email")}
                autoComplete="email"
                readOnly={team}
                placeholder={tFromServer("common.emailPlaceholder", "you@example.com")}
                className="mt-2 min-h-11 w-full rounded-xl border border-hairline/60 bg-app px-4 text-[15px] text-ink placeholder:text-ink-tertiary focus:border-accent focus:outline-none read-only:opacity-60"
              />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={saveState === "saving"}
              className="flex min-h-10 items-center rounded-full bg-accent px-5 text-[13px] font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
            >
              {tFromServer("common.save", "Save changes")}
            </button>
            {saveState === "saved" ? (
              <span role="status" className="text-[13px] text-success">{tFromServer("settings.profile.saved", "Saved")}</span>
            ) : null}
            {saveState === "error" ? (
              <span role="alert" className="text-[13px] text-danger">{tFromServer("settings.profile.saveError", "Couldn't save. Try again.")}</span>
            ) : null}
          </div>
        </Card>
      </section>

      <section aria-labelledby="maus-pref-appearance" data-maus-section="appearance" className="mb-12 md:mb-16">
        <SectionHeading id="maus-pref-appearance" label={appearanceLabel} />
        <Card>
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-ink">{tFromServer("settings.theme.lightOrDark", "Light or dark")}</p>
              <p className="mt-1 text-[13px] leading-5 text-ink-secondary">
                {tFromServer("maus.preferences.themeHint", "Follow your device, or pick the look you prefer.")}
              </p>
            </div>
            <div role="radiogroup" aria-label={appearanceLabel} className="inline-flex rounded-full bg-ink/[0.06] p-1">
              {THEMES.map((option) => (
                <button
                  key={option.choice}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.choice}
                  data-theme={option.choice}
                  onClick={() => applySkinChoice(option.choice)}
                  className={`min-h-9 rounded-full px-4 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${theme === option.choice ? "bg-ink/[0.12] text-ink" : "text-ink-secondary hover:text-ink"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section aria-labelledby="maus-pref-notifications" data-maus-section="notifications" className="mb-12 md:mb-16">
        <SectionHeading id="maus-pref-notifications" label={notificationsLabel} />
        <Card>
          <ToggleRow
            marker="finished"
            label={t("settings.deviceNotifications.title")}
            description={t("settings.simple.deviceNotifications")}
            checked={finished}
            onChange={setFinishedNotifications}
          />
          <ToggleRow
            marker="sounds"
            label={t("settings.notificationSounds.title")}
            description={t("settings.simple.notificationSounds")}
            checked={sounds}
            onChange={setNotificationSounds}
          />
          <ToggleRow
            marker="feed"
            label={t("settings.notificationFeed.title")}
            description={t("settings.simple.notificationFeed")}
            checked={feed}
            onChange={setNotificationFeed}
          />
        </Card>
      </section>

      <section aria-labelledby="maus-pref-language" data-maus-section="language" className="mb-12 md:mb-16">
        <SectionHeading id="maus-pref-language" label={languageLabel} />
        <Card>
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-ink">{languageLabel}</p>
              <p className="mt-1 text-[13px] leading-5 text-ink-secondary">
                {tFromServer("settings.language.subtitleComplete", "MausBot follows your device until you choose a language.")}
              </p>
            </div>
            <select
              aria-label={languageLabel}
              data-maus-language
              value={language}
              onChange={(event) => setLanguageChoice(event.target.value)}
              className="min-h-11 min-w-48 rounded-xl border border-hairline/60 bg-app px-4 text-[15px] text-ink focus:border-accent focus:outline-none"
            >
              <option value="">{tFromServer("settings.simple.language.system", "Follow system")}</option>
              {localeChoices.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </Card>
      </section>

      <section aria-labelledby="maus-pref-connections" data-maus-section="connections" className="mb-12 md:mb-16">
        <SectionHeading id="maus-pref-connections" label={t("sidebar.nav.connectedApps")} />
        <Card>
          {onOpenConnections ? (
            <button
              type="button"
              data-maus-connections
              onClick={onOpenConnections}
              className="flex min-h-16 w-full items-center justify-between gap-6 border-b border-hairline/40 py-3 text-left transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus last:border-0"
            >
              <span>
                <span className="block text-[15px] font-medium text-ink">{t("sidebar.nav.connectedApps")}</span>
                <span className="mt-1 block text-[13px] leading-5 text-ink-secondary">
                  {tFromServer("maus.preferences.connectionsHint", "Bring the tools you already use into MausBot.")}
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                {tFromServer("maus.preferences.manage", "Open")}
              </span>
            </button>
          ) : (
            <p className="text-[15px] leading-7 text-ink-secondary">
              {tFromServer("maus.preferences.connectionsHint", "Bring the tools you already use into MausBot.")}
            </p>
          )}
        </Card>
      </section>

      <section aria-labelledby="maus-pref-help" data-maus-section="help">
        <SectionHeading id="maus-pref-help" label={helpLabel} />
        <Card>
          <button
            type="button"
            data-maus-help
            onClick={() => void openExternalLink(HELP_CENTER_URL)}
            className="flex min-h-14 w-full items-center justify-between gap-6 border-b border-hairline/40 py-3 text-left transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span className="text-[15px] font-medium text-ink">{t("sidebar.menu.help")}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {tFromServer("maus.preferences.open", "Open")}
            </span>
          </button>
          <button
            type="button"
            data-maus-feedback
            onClick={() => void openExternalLink(FEEDBACK_URL)}
            className="flex min-h-14 w-full items-center justify-between gap-6 py-3 text-left transition hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span className="text-[15px] font-medium text-ink">{t("sidebar.menu.feedback")}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {tFromServer("maus.preferences.open", "Open")}
            </span>
          </button>
        </Card>
      </section>
    </div>
  );
}

export default MausPreferences;
