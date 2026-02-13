import type { AgentName, BattleResult, GameState, Tournament } from "../types/index.ts";

function difficultyStars(difficulty: string): string {
  switch (difficulty) {
    case "easy": return "\u2B50";
    case "medium": return "\u2B50\u2B50";
    case "hard": return "\u2B50\u2B50\u2B50";
    default: return "";
  }
}

export function generateBattleReport(result: BattleResult, agents: GameState["agents"]): string {
  const winner = result.verdict.winner;
  const loser = result.agents.find((a) => a !== winner)!;
  const winnerAgent = agents[winner];
  const loserAgent = agents[loser];
  const date = new Date(result.timestamp).toISOString();

  const r1 = result.responses.find((r) => r.agent === result.agents[0])!;
  const r2 = result.responses.find((r) => r.agent === result.agents[1])!;

  const lines = [
    `# AI Agents War - Battle Report`,
    ``,
    `**Battle ID:** ${result.id}`,
    `**Date:** ${date}`,
    `**Category:** ${result.prompt.category} | **Difficulty:** ${result.prompt.difficulty} ${difficultyStars(result.prompt.difficulty)}`,
    ``,
    `---`,
    ``,
    `## Matchup: ${winnerAgent.displayName} vs ${loserAgent.displayName}`,
    ``,
    `### ${agents[r1.agent].displayName} (responded in ${r1.timeMs}ms)`,
    ``,
    r1.response,
    ``,
    `### ${agents[r2.agent].displayName} (responded in ${r2.timeMs}ms)`,
    ``,
    r2.response,
    ``,
    `---`,
    ``,
    `## Judge Llama 4 Verdict`,
    ``,
    `**Winner: ${winnerAgent.displayName}**`,
    ``,
    `| Agent | Score |`,
    `|-------|-------|`,
    `| ${winnerAgent.displayName} | ${result.verdict.scores[winner]}/10 |`,
    `| ${loserAgent.displayName} | ${result.verdict.scores[loser]}/10 |`,
    ``,
    `**Reasoning:** ${result.verdict.reasoning}`,
    ``,
    `---`,
    ``,
    `*Recorded on BNB Chain: ${result.txHash ?? "Not recorded"}*`,
    `*IPFS: ${result.ipfsCid ?? "Not stored"}*`,
    `*Played on AI Agents War*`,
  ];

  return lines.join("\n");
}

export function generateTournamentReport(
  tournament: Tournament,
  agents: GameState["agents"],
): string {
  const date = new Date(tournament.timestamp).toISOString();

  const lines = [
    `# AI Agents War - Tournament Report`,
    ``,
    `**Tournament ID:** ${tournament.id}`,
    `**Date:** ${date}`,
    `**Category:** ${tournament.category}`,
    `**Champion:** ${tournament.champion ? agents[tournament.champion]?.displayName ?? tournament.champion : "TBD"}`,
    ``,
    `---`,
    ``,
  ];

  const roundNames: Record<number, string> = { 1: "Quarter-Finals", 2: "Semi-Finals", 3: "Finals" };

  for (const round of [1, 2, 3]) {
    const roundMatches = tournament.matches.filter((m) => m.round === round);
    lines.push(`## ${roundNames[round]}`);
    lines.push(``);

    for (const match of roundMatches) {
      const a1 = agents[match.agent1]?.displayName ?? match.agent1;
      const a2 = agents[match.agent2]?.displayName ?? match.agent2;
      const winner = match.winner ? agents[match.winner]?.displayName ?? match.winner : "TBD";

      if (match.result) {
        const scores = match.result.verdict.scores;
        lines.push(`**Match ${match.matchNumber}:** ${a1} vs ${a2}`);
        lines.push(`- Winner: **${winner}**`);
        lines.push(`- Score: ${scores[match.agent1] ?? "?"}/10 vs ${scores[match.agent2] ?? "?"}/10`);
        lines.push(`- ${match.result.verdict.reasoning}`);
      } else {
        lines.push(`**Match ${match.matchNumber}:** ${a1} vs ${a2} - *Not played*`);
      }
      lines.push(``);
    }
  }

  if (tournament.champion) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## CHAMPION: ${agents[tournament.champion]?.displayName ?? tournament.champion}`);
    lines.push(``);
  }

  lines.push(`*Played on AI Agents War*`);

  return lines.join("\n");
}
