import type { AgentName, BattleResult, Tournament, TournamentMatch } from "../types/index.ts";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function createTournamentBracket(
  agents: AgentName[],
  category: string,
): Tournament {
  const shuffled = shuffle(agents);

  // Create quarter-final matchups
  const matches: TournamentMatch[] = [
    // Quarter-finals (round 1)
    { round: 1, matchNumber: 1, agent1: shuffled[0]!, agent2: shuffled[1]! },
    { round: 1, matchNumber: 2, agent1: shuffled[2]!, agent2: shuffled[3]! },
    { round: 1, matchNumber: 3, agent1: shuffled[4]!, agent2: shuffled[5]! },
    { round: 1, matchNumber: 4, agent1: shuffled[6]!, agent2: shuffled[7]! },
    // Semi-finals (round 2) — agents populated after QF
    { round: 2, matchNumber: 5, agent1: "claude" as AgentName, agent2: "claude" as AgentName },
    { round: 2, matchNumber: 6, agent1: "claude" as AgentName, agent2: "claude" as AgentName },
    // Finals (round 3)
    { round: 3, matchNumber: 7, agent1: "claude" as AgentName, agent2: "claude" as AgentName },
  ];

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    matches,
    category,
  };
}

export function getNextMatch(tournament: Tournament): TournamentMatch | null {
  for (const match of tournament.matches) {
    if (match.winner) continue;

    // For SF/Finals, ensure agents are populated from previous round winners
    if (match.round === 2) {
      if (match.matchNumber === 5) {
        const qf1 = tournament.matches[0]!;
        const qf2 = tournament.matches[1]!;
        if (!qf1.winner || !qf2.winner) return null;
        match.agent1 = qf1.winner;
        match.agent2 = qf2.winner;
      } else if (match.matchNumber === 6) {
        const qf3 = tournament.matches[2]!;
        const qf4 = tournament.matches[3]!;
        if (!qf3.winner || !qf4.winner) return null;
        match.agent1 = qf3.winner;
        match.agent2 = qf4.winner;
      }
    } else if (match.round === 3) {
      const sf1 = tournament.matches[4]!;
      const sf2 = tournament.matches[5]!;
      if (!sf1.winner || !sf2.winner) return null;
      match.agent1 = sf1.winner;
      match.agent2 = sf2.winner;
    }

    return match;
  }
  return null;
}

export function advanceTournament(
  tournament: Tournament,
  matchIndex: number,
  result: BattleResult,
): Tournament {
  const updated = { ...tournament, matches: [...tournament.matches] };
  const match = { ...updated.matches[matchIndex]! };
  match.winner = result.verdict.winner;
  match.result = result;
  updated.matches[matchIndex] = match;

  // If finals complete, set champion
  if (match.round === 3) {
    updated.champion = match.winner;
  }

  return updated;
}

export function getRoundName(round: number): string {
  switch (round) {
    case 1: return "Quarter-Final";
    case 2: return "Semi-Final";
    case 3: return "FINALS";
    default: return `Round ${round}`;
  }
}

export function getDifficultyForRound(round: number): "easy" | "medium" | "hard" {
  switch (round) {
    case 1: return "easy";
    case 2: return "medium";
    case 3: return "hard";
    default: return "medium";
  }
}
