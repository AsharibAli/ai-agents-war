import { callOpenRouter, JUDGE_MODEL } from "../agents/index.ts";
import type {
  AgentName,
  BattlePrompt,
  BattleResponse,
  JudgeVerdict,
} from "../types/index.ts";

const SYSTEM_PROMPT = `You are a fair and impartial open-source AI judge in an AI battle arena. You — an open-source Llama model — are judging closed-source AI agents. Be brutally honest and fair. Score each agent 1-10 on: creativity (30%), accuracy (30%), clarity (20%), entertainment (20%). Respond ONLY in this exact JSON format, no markdown, no backticks:
{"winner": "agent_name", "scores": {"agent1_name": 7, "agent2_name": 5}, "reasoning": "One sentence explaining your verdict."}
Replace agent1_name and agent2_name with the actual agent names provided. The winner must be the agent with the higher weighted score.`;

function buildUserPrompt(
  prompt: BattlePrompt,
  responses: BattleResponse[],
): string {
  const lines = [
    `Category: ${prompt.category}`,
    `Challenge: ${prompt.prompt}`,
    "",
  ];

  for (const r of responses) {
    lines.push(`--- ${r.agent} (responded in ${r.timeMs}ms) ---`);
    lines.push(r.response);
    lines.push("");
  }

  lines.push("Judge these responses. Return ONLY the JSON verdict.");
  return lines.join("\n");
}

function parseVerdict(raw: string, agents: AgentName[]): JudgeVerdict {
  // Strip markdown fences if the model ignores our instructions
  const cleaned = raw.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();

  const parsed = JSON.parse(cleaned) as {
    winner: string;
    scores: Record<string, number>;
    reasoning: string;
  };

  // Validate winner is one of the competing agents
  if (!agents.includes(parsed.winner as AgentName)) {
    throw new Error(`Judge returned invalid winner: "${parsed.winner}"`);
  }

  // Validate scores exist for both agents
  for (const agent of agents) {
    if (typeof parsed.scores[agent] !== "number") {
      throw new Error(`Judge missing score for agent: "${agent}"`);
    }
  }

  return {
    winner: parsed.winner as AgentName,
    scores: parsed.scores as Record<AgentName, number>,
    reasoning: parsed.reasoning,
  };
}

export async function judgeBattle(
  prompt: BattlePrompt,
  responses: BattleResponse[],
): Promise<JudgeVerdict> {
  const agents = responses.map((r) => r.agent);
  const userPrompt = buildUserPrompt(prompt, responses);

  const raw = await callOpenRouter(JUDGE_MODEL, userPrompt, SYSTEM_PROMPT);

  return parseVerdict(raw, agents as AgentName[]);
}
