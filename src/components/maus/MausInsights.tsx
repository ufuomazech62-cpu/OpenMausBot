import { CONSUMER_INSIGHTS } from "@/lib/consumer-labels";
import { useStore } from "@/state/store";

/** A calm read on steady progress, written for people who simply use MausBot. */
export function MausInsights() {
  const { dispatch } = useStore();

  return (
    <div
      data-maus-insights
      className="maus-home mx-auto w-full px-4 pt-20 pb-16 text-ink md:max-w-[880px] md:px-8 md:pt-12"
    >
      <header className="mb-10 md:mb-14">
        <p className="maus-kicker">
          MausBot
          <span aria-hidden="true" className="mx-2 text-ink-tertiary/50">/</span>
          Insights
        </p>
        <h1 className="mt-4 text-[clamp(2.25rem,8vw,4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
          A little better every day.
        </h1>
        <p className="mt-5 max-w-[46ch] text-[15px] leading-7 text-ink-secondary md:text-base">
          Small changes that make working together feel easier. Nothing to set up and nothing to keep track of.
        </p>
      </header>

      <section aria-label="What is improving" className="flex flex-col gap-4">
        {CONSUMER_INSIGHTS.map((insight) => (
          <article
            key={insight.id}
            data-maus-insight={insight.id}
            className="maus-card rounded-[24px] border border-hairline/50 bg-panel p-6 md:p-8"
          >
            <h2 className="max-w-[32ch] font-serif text-2xl leading-snug text-ink md:text-3xl">
              {insight.title}
            </h2>
            <p className="mt-3 max-w-[56ch] text-[15px] leading-7 text-ink-secondary">
              {insight.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-hairline/50 pt-6 md:mt-16">
        <p className="max-w-[42ch] text-[13px] leading-6 text-ink-tertiary">
          What you ask for shapes what comes next. Keep the conversations coming.
        </p>
        <button type="button" onClick={() => dispatch({ type: "showChat" })} className="maus-ask shrink-0">
          Back to chat
        </button>
      </footer>
    </div>
  );
}
