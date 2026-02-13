import { config, requireApiKey } from "../config.ts";
import type { AgentName, BattleResponse } from "../types/index.ts";
import { getPersonality } from "./personalities.ts";

// ── OpenRouter ──────────────────────────────────────────────────────
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const AGENT_MODELS: Record<AgentName, string> = {
  // Closed-source
  claude: "anthropic/claude-opus-4.6",
  grok: "x-ai/grok-4.1-fast",
  gpt: "openai/gpt-5.2-codex",
  gemini: "google/gemini-3-pro-preview",
  // Open-source
  glm: "z-ai/glm-5",
  kimi: "moonshotai/kimi-k2.5",
  deepseek: "deepseek/deepseek-v3.2",
  minimax: "minimax/minimax-m2.5",
};

export const AGENT_FALLBACK_MODELS: Partial<Record<AgentName, string>> = {
  grok: "x-ai/grok-beta",
  deepseek: "deepseek/deepseek-chat",
  kimi: "moonshotai/kimi-k2",
  minimax: "minimax/minimax-m1",
  glm: "z-ai/glm-4",
};

export const JUDGE_MODEL = "meta-llama/llama-4-maverick";

export async function callOpenRouter(
  model: string,
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  requireApiKey();

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal: AbortSignal.timeout(30_000),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.openrouterApiKey}`,
      "http-referer": "https://github.com/ai-agents-war",
      "x-title": "AI Agents War",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            systemPrompt ??
            "You are a competitive AI agent in a battle arena. Give your best response.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Model "${model}" returned an empty response.`);
  return text;
}

// ── Streaming support ───────────────────────────────────────────────

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function callOpenRouterStream(
  model: string,
  prompt: string,
  systemPrompt: string,
  callbacks: StreamCallbacks,
): Promise<string> {
  requireApiKey();

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.openrouterApiKey}`,
      "http-referer": "https://github.com/ai-agents-war",
      "x-title": "AI Agents War",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  let fullText = "";
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body for streaming");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          callbacks.onDone();
          return fullText;
        }
        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            callbacks.onChunk(content);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone();
  return fullText;
}

/**
 * Call an agent by name with personality, returning a BattleResponse with timing info.
 */
export async function callAgent(
  agent: AgentName,
  prompt: string,
): Promise<BattleResponse> {
  const model = AGENT_MODELS[agent];
  const fallback = AGENT_FALLBACK_MODELS[agent];
  const personality = getPersonality(agent);
  const start = performance.now();

  let response: string;
  try {
    response = await callOpenRouter(model, prompt, personality);
  } catch (err) {
    if (fallback) {
      response = await callOpenRouter(fallback, prompt, personality);
    } else {
      throw err;
    }
  }

  const timeMs = Math.round(performance.now() - start);
  return { agent, response, timeMs };
}
