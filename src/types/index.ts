export type AgentName = "claude" | "grok" | "gpt" | "gemini" | "glm" | "kimi" | "deepseek" | "minimax";

export interface Agent {
  name: AgentName;
  displayName: string;
  model: string;
  color: string;
  elo: number;
  wins: number;
  losses: number;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface BattlePrompt {
  category: "debate" | "code" | "riddle" | "roast" | "strategy";
  prompt: string;
  difficulty: Difficulty;
}

export interface BattleResponse {
  agent: AgentName;
  response: string;
  timeMs: number;
}

export interface BattleSummary {
  agent: AgentName;
  summary: string;
  isFallback: boolean;
}

export interface JudgeVerdict {
  winner: AgentName;
  scores: Record<AgentName, number>;
  reasoning: string;
}

export interface BattleResult {
  id: string;
  timestamp: number;
  prompt: BattlePrompt;
  agents: [AgentName, AgentName];
  responses: BattleResponse[];
  verdict: JudgeVerdict;
  txHash?: string;
  ipfsCid?: string;
}

export interface VoteStats {
  totalVotes: number;
  agreedWithJudge: number;
}

export interface GameState {
  agents: Record<AgentName, Agent>;
  battleHistory: BattleResult[];
  voteStats: VoteStats;
}

// ── Tournament types ─────────────────────────────────────────────────

export interface TournamentMatch {
  round: number;           // 1 = quarter-finals, 2 = semis, 3 = finals
  matchNumber: number;
  agent1: AgentName;
  agent2: AgentName;
  winner?: AgentName;
  result?: BattleResult;
}

export interface Tournament {
  id: string;
  timestamp: number;
  matches: TournamentMatch[];
  champion?: AgentName;
  category: string;
}
