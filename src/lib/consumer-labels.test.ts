import { describe, expect, it } from "vitest";
import { CONSUMER_AI_LABEL, CONSUMER_INSIGHTS, consumerModelLabel, looksTechnical } from "./consumer-labels";

describe("technical label detection", () => {
  it("recognises raw ids, endpoints and config parentheses", () => {
    for (const raw of [
      "tencent/hy4-flash:free (Hermes config)",
      "anthropic/claude-sonnet-4.5",
      "ollama::qwen3",
      "gpt-5.6@latest",
      "weights #9f3c1ab2",
      "Mistral (via API key)",
      "local model (custom config)",
    ]) {
      expect(looksTechnical(raw), raw).toBe(true);
    }
  });

  it("leaves human product names alone", () => {
    for (const plain of ["Claude Sonnet 5", "GPT-5.6", "Opus 5.5", "Auto", "Llama 4", "gemma2:2b", "llama3.2:latest", "MausBot AI", ""]) {
      expect(looksTechnical(plain), plain).toBe(false);
    }
  });
});

describe("consumer model label", () => {
  it("replaces anything technical with the calm product name", () => {
    expect(consumerModelLabel("tencent/hy4-flash:free (Hermes config)")).toBe("MausBot AI");
    expect(consumerModelLabel("anthropic/sonnet-4.5")).toBe(CONSUMER_AI_LABEL);
  });

  it("passes through a name a person would recognise", () => {
    expect(consumerModelLabel("Claude Sonnet 5")).toBe("Claude Sonnet 5");
    expect(consumerModelLabel("GPT-5.6")).toBe("GPT-5.6");
  });
});

describe("curated insights", () => {
  it("shows three friendly cards and nothing release-like", () => {
    expect(CONSUMER_INSIGHTS.map((insight) => insight.title)).toEqual([
      "Your assistant is learning",
      "Team work stays in sync",
      "Files are easier to find",
    ]);
    const copy = CONSUMER_INSIGHTS.map((insight) => `${insight.title} ${insight.body}`).join(" ").toLowerCase();
    for (const banned of ["v1", "version", "advanced", "cli", "api", "provider", "model", "release", "changelog", "engine"]) {
      expect(copy.includes(banned), `found ${banned}`).toBe(false);
    }
    expect(new Set(CONSUMER_INSIGHTS.map((insight) => insight.id)).size).toBe(CONSUMER_INSIGHTS.length);
  });
});
