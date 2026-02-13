import chalk from "chalk";
import boxen from "boxen";
import Table from "cli-table3";
import figlet from "figlet";
import type {
  Agent,
  AgentName,
  BattlePrompt,
  BattleResponse,
  Difficulty,
  GameState,
  JudgeVerdict,
  VoteStats,
} from "../types/index.ts";
import type { OnChainStats, LeaderboardEntry } from "../chain/index.ts";

// ── Helpers ─────────────────────────────────────────────────────────

/** Apply the agent's named chalk color to text. */
function colorize(agent: Agent, text: string): string {
  const fn = (chalk as unknown as Record<string, unknown>)[agent.color];
  return typeof fn === "function"
    ? (fn as (t: string) => string)(text)
    : text;
}

function winRate(agent: Agent): string {
  const total = agent.wins + agent.losses;
  if (total === 0) return "N/A";
  return `${((agent.wins / total) * 100).toFixed(0)}%`;
}

function difficultyLabel(d: Difficulty): string {
  switch (d) {
    case "easy": return chalk.green("\u2B50 Easy");
    case "medium": return chalk.yellow("\u2B50\u2B50 Medium");
    case "hard": return chalk.red("\u2B50\u2B50\u2B50 Hard");
  }
}

// ── 1. Title ────────────────────────────────────────────────────────

export function showTitle(): void {
  const art = figlet.textSync("AI AGENTS WAR", {
    font: "ANSI Shadow",
    horizontalLayout: "fitted",
  });
  console.log(chalk.red(art));
  console.log(
    chalk.gray("  AI Agents War — 8 AI Models Battle for Supremacy\n"),
  );
}

// ── 2. Agent Card ───────────────────────────────────────────────────

export function showAgentCard(agent: Agent): void {
  const lines = [
    colorize(agent, chalk.bold(agent.displayName)),
    "",
    `ELO  ${chalk.white.bold(String(agent.elo))}`,
    `W/L  ${chalk.green(String(agent.wins))} / ${chalk.red(String(agent.losses))}`,
  ];
  console.log(
    boxen(lines.join("\n"), {
      padding: 1,
      margin: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: "round",
      borderColor: agent.color,
    }),
  );
}

// ── 3. Battle Header ────────────────────────────────────────────────

export function showBattleHeader(
  agent1: Agent,
  agent2: Agent,
  prompt: BattlePrompt,
): void {
  const vs = `${colorize(agent1, agent1.displayName)}  ${chalk.white.bold("\u2694\uFE0F")}  ${colorize(agent2, agent2.displayName)}`;
  const lines = [
    vs,
    "",
    `${chalk.bold("Category:")}   ${chalk.yellow(prompt.category)}`,
    `${chalk.bold("Difficulty:")} ${difficultyLabel(prompt.difficulty)}`,
    `${chalk.bold("Prompt:")}     ${prompt.prompt}`,
  ];
  console.log(
    boxen(lines.join("\n"), {
      padding: 1,
      margin: 1,
      borderStyle: "double",
      borderColor: "yellow",
      title: "BATTLE",
      titleAlignment: "center",
    }),
  );
}

// ── 4. Agent Response ───────────────────────────────────────────────

export function showResponse(agent: Agent, response: BattleResponse): void {
  const header = `${colorize(agent, chalk.bold(agent.displayName))}  ${chalk.gray(`(${response.timeMs}ms)`)}`;
  console.log(
    boxen(`${header}\n\n${response.response}`, {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 1, right: 1 },
      borderStyle: "round",
      borderColor: agent.color,
    }),
  );
}

// ── 5. Verdict ──────────────────────────────────────────────────────

export function showVerdict(verdict: JudgeVerdict, agents: Agent[]): void {
  console.log(
    boxen(chalk.magenta.bold("\uD83E\uDD99 Judge Llama 4 has spoken!"), {
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      margin: { top: 1, bottom: 0, left: 1, right: 1 },
      borderStyle: "double",
      borderColor: "magenta",
    }),
  );

  const winnerAgent = agents.find((a) => a.name === verdict.winner);
  if (winnerAgent) {
    const winText = figlet.textSync("WINNER", { font: "Small" });
    console.log(colorize(winnerAgent, winText));
    console.log(
      `  ${colorize(winnerAgent, chalk.bold(winnerAgent.displayName))}\n`,
    );
  }

  const table = new Table({
    head: [
      chalk.white.bold("Agent"),
      chalk.white.bold("Score"),
      chalk.white.bold("Result"),
    ],
    style: { head: [], border: ["gray"] },
  });

  for (const agent of agents) {
    const score = verdict.scores[agent.name as AgentName] ?? 0;
    const isWinner = agent.name === verdict.winner;
    const result = isWinner ? chalk.green.bold("\uD83D\uDC51 WINNER") : chalk.red("LOST");
    table.push([
      colorize(agent, agent.displayName),
      chalk.white.bold(String(score)) + chalk.gray("/10"),
      result,
    ]);
  }
  console.log(table.toString());

  console.log(
    boxen(`${chalk.italic(verdict.reasoning)}`, {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 1, right: 1 },
      borderStyle: "round",
      borderColor: "gray",
      title: "Reasoning",
      titleAlignment: "left",
    }),
  );
}

// ── 6. Leaderboard ──────────────────────────────────────────────────

export function showLeaderboard(state: GameState): void {
  console.log(chalk.bold.yellow("\n\uD83C\uDFC6 LEADERBOARD\n"));

  const sorted = Object.values(state.agents).sort((a, b) => b.elo - a.elo);

  const table = new Table({
    head: [
      chalk.white.bold("Rank"),
      chalk.white.bold("Agent"),
      chalk.white.bold("ELO"),
      chalk.white.bold("Wins"),
      chalk.white.bold("Losses"),
      chalk.white.bold("Win Rate"),
    ],
    style: { head: [], border: ["gray"] },
  });

  const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

  sorted.forEach((agent, i) => {
    const medal = medals[i] ?? " ";
    table.push([
      `${medal} ${i + 1}`,
      colorize(agent, chalk.bold(agent.displayName)),
      chalk.white.bold(String(agent.elo)),
      chalk.green(String(agent.wins)),
      chalk.red(String(agent.losses)),
      winRate(agent),
    ]);
  });

  console.log(table.toString());
  console.log();
}

// ── 7. Battle Receipt ───────────────────────────────────────────────

export function showBattleReceipt(
  txHash: string,
  battleNumber: number,
  contractAddress?: string | null,
  ipfsCid?: string,
): void {
  const txLink = `https://testnet.bscscan.com/tx/${txHash}`;
  const lines = [
    chalk.green.bold(`\u2713 Battle #${battleNumber} recorded on-chain!`),
    "",
    `${chalk.bold("Tx:")}       ${chalk.cyan(txHash)}`,
    `${chalk.bold("Explorer:")} ${chalk.underline.cyan(txLink)}`,
  ];

  if (contractAddress) {
    const contractLink = `https://testnet.bscscan.com/address/${contractAddress}`;
    lines.push(`${chalk.bold("Contract:")} ${chalk.underline.cyan(contractLink)}`);
  }

  if (ipfsCid) {
    const ipfsLink = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;
    lines.push(`${chalk.bold("IPFS:")}     ${chalk.underline.cyan(ipfsLink)}`);
  }

  console.log(
    boxen(lines.join("\n"), {
      padding: 1,
      margin: { top: 0, bottom: 1, left: 1, right: 1 },
      borderStyle: "round",
      borderColor: "green",
    }),
  );
}

// ── 8. On-Chain Stats ───────────────────────────────────────────────

export function showOnChainStats(
  agents: Agent[],
  statsMap: Map<string, OnChainStats>,
): void {
  console.log(chalk.bold.yellow("\n\u26D3\uFE0F  ON-CHAIN STATS\n"));

  const table = new Table({
    head: [
      chalk.white.bold("Agent"),
      chalk.white.bold("Wins"),
      chalk.white.bold("Losses"),
      chalk.white.bold("Avg Score"),
      chalk.white.bold("Battles"),
    ],
    style: { head: [], border: ["gray"] },
  });

  for (const agent of agents) {
    const stats = statsMap.get(agent.name);
    if (!stats) continue;
    const avg = stats.battlesPlayed > 0
      ? (stats.totalScore / stats.battlesPlayed).toFixed(1)
      : "N/A";
    table.push([
      colorize(agent, chalk.bold(agent.displayName)),
      chalk.green(String(stats.wins)),
      chalk.red(String(stats.losses)),
      chalk.white(avg) + chalk.gray("/10"),
      String(stats.battlesPlayed),
    ]);
  }

  console.log(table.toString());
  console.log();
}

// ── 9. On-Chain Leaderboard ─────────────────────────────────────────

export function showOnChainLeaderboard(entries: LeaderboardEntry[]): void {
  console.log(chalk.bold.yellow("\n\u26D3\uFE0F  ON-CHAIN LEADERBOARD\n"));

  if (entries.length === 0) {
    console.log(chalk.gray("  No agents registered on-chain yet.\n"));
    return;
  }

  const table = new Table({
    head: [
      chalk.white.bold("Rank"),
      chalk.white.bold("Agent"),
      chalk.white.bold("On-Chain Wins"),
      chalk.white.bold("On-Chain Losses"),
      chalk.white.bold("Avg Score"),
      chalk.white.bold("Battles"),
    ],
    style: { head: [], border: ["gray"] },
  });

  const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

  entries.forEach((entry, i) => {
    const medal = medals[i] ?? " ";
    const avg = entry.stats.battlesPlayed > 0
      ? (entry.stats.totalScore / entry.stats.battlesPlayed).toFixed(1)
      : "N/A";
    table.push([
      `${medal} ${i + 1}`,
      chalk.bold(entry.name),
      chalk.green(String(entry.stats.wins)),
      chalk.red(String(entry.stats.losses)),
      chalk.white(avg) + chalk.gray("/10"),
      String(entry.stats.battlesPlayed),
    ]);
  });

  console.log(table.toString());
  console.log();
}

// ── 10. Vote Stats ──────────────────────────────────────────────────

export function showVoteStats(voteStats: VoteStats): void {
  console.log(chalk.bold.yellow("\n\uD83D\uDDF3\uFE0F  VOTE STATS\n"));

  if (voteStats.totalVotes === 0) {
    console.log(chalk.gray("  No votes cast yet. Vote during battles!\n"));
    return;
  }

  const pct = ((voteStats.agreedWithJudge / voteStats.totalVotes) * 100).toFixed(0);
  console.log(
    boxen(
      [
        `${chalk.bold("Total Votes:")}   ${voteStats.totalVotes}`,
        `${chalk.bold("Agreed:")}        ${chalk.green(String(voteStats.agreedWithJudge))}`,
        `${chalk.bold("Disagreed:")}     ${chalk.red(String(voteStats.totalVotes - voteStats.agreedWithJudge))}`,
        "",
        `\uD83D\uDDF3\uFE0F  Your agreement with Judge Llama 4: ${chalk.bold(pct + "%")} (${voteStats.agreedWithJudge}/${voteStats.totalVotes} battles)`,
      ].join("\n"),
      {
        padding: 1,
        margin: { top: 0, bottom: 1, left: 1, right: 1 },
        borderStyle: "round",
        borderColor: "yellow",
      },
    ),
  );
}

// ── 11. Spinner helper ──────────────────────────────────────────────

export { default as ora } from "ora";
