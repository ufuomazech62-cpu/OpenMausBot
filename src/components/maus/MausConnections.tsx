import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { hasActiveConnection, type ConnectorStatus } from "@/lib/connector-status";
import { reserveConnectionPage } from "@/lib/connector-oauth";
import { mcpSignInLink } from "@/lib/mcp-sign-in";
import { pollConnector } from "@/lib/connector-poll";
import { api } from "@/state/store";
import { ServiceIcon, type ToolkitCard } from "@/components/ServiceIcon";

/** The apps a person recognizes, with words a person would use. Cards are local so this screen stays independent of
 *  the technical catalog: the only thing shared with the connection service is the app's slug. */
const APPS: ToolkitCard[] = [
  { slug: "gmail", label: "Gmail", blurb: "Read, send, and tidy up your email.", logo: null, domain: "gmail.com" },
  { slug: "googlecalendar", label: "Google Calendar", blurb: "See your plans and make new ones.", logo: null, domain: "calendar.google.com" },
  { slug: "googledrive", label: "Google Drive", blurb: "Find and share your files.", logo: null, domain: "drive.google.com" },
  { slug: "slack", label: "Slack", blurb: "Keep up with your team's messages.", logo: null, domain: "slack.com" },
  { slug: "notion", label: "Notion", blurb: "Bring your notes and pages along.", logo: null, domain: "notion.so" },
  { slug: "outlook", label: "Outlook", blurb: "Keep your inbox and calendar close.", logo: null, domain: "outlook.com" },
  { slug: "figma", label: "Figma", blurb: "Pull in designs and feedback.", logo: null, domain: "figma.com" },
  { slug: "dropbox", label: "Dropbox", blurb: "Reach your files wherever you are.", logo: null, domain: "dropbox.com" },
  { slug: "hubspot", label: "HubSpot", blurb: "Stay on top of contacts and deals.", logo: null, domain: "hubspot.com" },
  { slug: "salesforce", label: "Salesforce", blurb: "Work with your customer records.", logo: null, domain: "salesforce.com" },
  { slug: "stripe", label: "Stripe", blurb: "Follow payments and customers.", logo: null, domain: "stripe.com" },
  { slug: "airtable", label: "Airtable", blurb: "Work with your bases and data.", logo: null, domain: "airtable.com" },
];

/** Every failure reaches the person as plain reassurance — service details stay out of the interface. */
const TRY_AGAIN = "That didn't work this time. Please try again.";
const SIGN_IN_UNAVAILABLE = "We couldn't open the sign-in page. Please try again in a moment.";
const POPUP_BLOCKED = "The sign-in window was blocked. Allow pop-ups for this site, then try again.";

function SectionHeading({ label, count, id }: { label: string; count?: number; id?: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-4 border-b border-hairline/50 pb-2">
      <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
        {label}
      </h2>
      {count !== undefined && count > 0 ? (
        <span className="font-serif text-lg leading-none text-ink-secondary">{count}</span>
      ) : null}
    </div>
  );
}

/** A quiet, people-first place to bring an app into Maus. */
export function MausConnections() {
  const [status, setStatus] = useState<Record<string, ConnectorStatus>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const polls = useRef(new Map<string, () => void>());
  const generations = useRef(new Map<string, number>());
  const opening = useRef<ReturnType<typeof reserveConnectionPage> | null>(null);

  /** Reads the friendly state the service keeps for each app; stale answers never overwrite a fresh request. */
  const refreshStatus = useCallback((slugs: string[]): Promise<Record<string, ConnectorStatus>> => {
    if (!slugs.length) return Promise.resolve({});
    const requested = new Map(slugs.map((slug) => [slug, generations.current.get(slug) ?? 0]));
    return api<{ services?: Record<string, ConnectorStatus> }>(`/api/connectors?services=${slugs.join(",")}`)
      .then((answer) => {
        const services = answer?.services ?? {};
        setStatus((current) => {
          const next = { ...current };
          for (const [slug, value] of Object.entries(services)) {
            if ((generations.current.get(slug) ?? 0) === (requested.get(slug) ?? 0)) next[slug] = value;
          }
          return next;
        });
        return services;
      })
      .catch(() => ({}));
  }, []);

  useEffect(() => {
    void refreshStatus(APPS.map((app) => app.slug));
    return () => {
      polls.current.forEach((stop) => stop());
      polls.current.clear();
      opening.current?.cancel();
    };
  }, [refreshStatus]);

  const connect = async (slug: string, label: string) => {
    if (busySlug || opening.current) return;
    const launch = reserveConnectionPage();
    opening.current = launch;
    generations.current.set(slug, (generations.current.get(slug) ?? 0) + 1);
    const before = status[slug];
    setBusySlug(slug);
    setError(null);
    setNotice(null);
    try {
      const answer = await api<{ url?: unknown }>(`/api/connectors/${slug}/authorize`, { method: "POST" });
      if (opening.current !== launch) return;
      const url = mcpSignInLink(typeof answer?.url === "string" ? answer.url : null);
      if (!url) throw new Error(SIGN_IN_UNAVAILABLE);
      setStatus((current) => ({
        ...current,
        [slug]: { ...current[slug], connected: current[slug]?.connected ?? false, pending: true, status: "INITIATED" },
      }));
      const stop = pollConnector(before, () => refreshStatus([slug]).then((services) => services[slug]), (result) => {
        if (polls.current.get(slug) === stop) polls.current.delete(slug);
        void refreshStatus([slug]);
        if (result === "connected") setNotice(`${label} is connected. You're all set.`);
        else setError(TRY_AGAIN);
      });
      polls.current.set(slug, stop);
      if (!await launch.open(url) && opening.current === launch) setError(POPUP_BLOCKED);
    } catch {
      if (opening.current === launch) setError(SIGN_IN_UNAVAILABLE);
    } finally {
      launch.cancel();
      if (opening.current === launch) {
        opening.current = null;
        setBusySlug(null);
      }
    }
  };

  const connectedCount = APPS.filter((app) => hasActiveConnection(status[app.slug])).length;

  return (
    <div data-maus-connections className="maus-connections mx-auto w-full px-4 pt-20 pb-16 text-ink md:max-w-[880px] md:px-8 md:pt-12">
      <header className="mb-10 md:mb-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-tertiary">
          YOUR APPS
        </p>
        <h1 className="mt-4 text-[clamp(2.25rem,8vw,4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
          Connections
        </h1>
        <p className="mt-5 max-w-[46ch] text-[15px] leading-7 text-ink-secondary md:text-base">
          Bring the tools you use every day together. Connect an app once, and Maus can take it from there.
        </p>
      </header>

      {error ? (
        <p role="alert" data-maus-message="error" className="mb-8 rounded-2xl border border-hairline/60 bg-elevated/50 px-5 py-4 text-[14px] leading-6 text-ink-secondary">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" data-maus-message="notice" className="mb-8 rounded-2xl border border-hairline/60 bg-elevated/50 px-5 py-4 text-[14px] leading-6 text-ink-secondary">
          {notice}
        </p>
      ) : null}

      <section aria-labelledby="maus-connections-apps">
        <SectionHeading id="maus-connections-apps" label="YOUR APPS" count={connectedCount} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((app) => {
            const connected = hasActiveConnection(status[app.slug]);
            const connecting = busySlug === app.slug || Boolean(status[app.slug]?.pending);
            const action = connected ? "Connected" : connecting ? "Connecting" : "Connect";
            return (
              <button
                key={app.slug}
                type="button"
                data-app={app.slug}
                data-connect={connected ? "connected" : connecting ? "connecting" : "connect"}
                aria-label={`${action} ${app.label}`}
                disabled={connected || connecting}
                onClick={() => void connect(app.slug, app.label)}
                className={cn(
                  "maus-card group relative flex min-h-44 flex-col justify-between rounded-[24px] border border-hairline/60 bg-panel p-5 text-left shadow-[0_1px_0_var(--color-edge)]",
                  "transition-transform duration-200 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none",
                  connected && "cursor-default hover:translate-y-0",
                )}
              >
                <span className="flex items-start justify-between">
                  <ServiceIcon card={app} className="size-11" />
                </span>
                <span className="mt-6 block">
                  <span className="block text-[15px] font-medium leading-snug text-ink">{app.label}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-ink-secondary">{app.blurb}</span>
                </span>
                <span
                  className={cn(
                    "mt-4 inline-flex min-h-9 w-fit items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors",
                    connected
                      ? "border-hairline/70 text-ink-secondary"
                      : "border-accent/30 bg-accent/10 text-ink group-hover:border-accent/60",
                  )}
                >
                  {connected ? <Check size={15} aria-hidden="true" /> : null}
                  {connecting ? <Loader2 size={15} aria-hidden="true" className="animate-spin" /> : null}
                  {action}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
