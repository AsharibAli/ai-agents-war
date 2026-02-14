import { callOpenRouter } from "./index.ts";
import type { BattleResponse, BattleSummary } from "../types/index.ts";

const SUMMARY_MODEL = "meta-llama/llama-4-maverick";

const SUMMARY_SYSTEM_PROMPT =
  "You are a concise summarizer for an AI battle arena. " +
  "Summarize the following AI agent response in exactly 2-3 sentences. " +
  "Focus on the key argument, approach, or creative angle. " +
  "Be direct and informative. Do not include any preamble.";

async function summarizeResponse(
  response: BattleResponse,
): Promise<BattleSummary> {
  try {
    const inputText = response.response.length > 3000
      ? response.response.slice(0, 3000) + "\n\n[truncated]"
      : response.response;

    const summary = await callOpenRouter(
      SUMMARY_MODEL,
      `Summarize this response:\n\n${inputText}`,
      SUMMARY_SYSTEM_PROMPT,
      256,
    );
    return { agent: response.agent, summary: summary.trim(), isFallback: false };
  } catch {
    const fallback =
      response.response.slice(0, 200).trim() +
      (response.response.length > 200 ? "..." : "");
    return { agent: response.agent, summary: fallback, isFallback: true };
  }
}

export async function summarizeBattle(
  responses: [BattleResponse, BattleResponse],
): Promise<[BattleSummary, BattleSummary]> {
  const [s1, s2] = await Promise.all([
    summarizeResponse(responses[0]),
    summarizeResponse(responses[1]),
  ]);
  return [s1, s2];
}
