import inquirer from "inquirer";
import chalk from "chalk";
import figlet from "figlet";
import {
  showTitle,
  showBattleHeader,
  showHeadToHead,
  showVerdict,
  showBattleReceipt,
  showOnChainLeaderboard,
  showVoteStats,
  ora,
} from "./ui/index.ts";
import { showBracket } from "./ui/bracket.ts";
import { collectResponses } from "./ui/stream.ts";
import { generateBattleReport, generateTournamentReport } from "./ui/report.ts";
import { callAgent, AGENT_MODELS } from "./agents/index.ts";
import { summarizeBattle } from "./agents/summarize.ts";
import { judgeBattle } from "./battle/judge.ts";
import { updateGameState } from "./battle/elo.ts";
import {
  getRandomPromptByCategoryAndDifficulty,
  getRandomPromptByDifficulty,
} from "./battle/prompts.ts";
import {
  createTournamentBracket,
  getNextMatch,
  advanceTournament,
  getRoundName,
  getDifficultyForRound,
} from "./battle/tournament.ts";
import {
  recordBattle,
  isContractDeployed,
  getContractAddress,
  getOnChainLeaderboard,
} from "./chain/index.ts";
import { requireApiKey } from "./config.ts";
import type {
  AgentName,
  BattlePrompt,
  BattleResponse,
  BattleResult,
  Difficulty,
  GameState,
  Tournament,
} from "./types/index.ts";
import type { OnChainStats } from "./chain/index.ts";

// ── Agent definitions ───────────────────────────────────────────────

const ALL_AGENTS: AgentName[] = ["claude", "grok", "gpt", "gemini", "glm", "kimi", "deepseek", "minimax"];

function createInitialState(): GameState {
  return {
    agents: {
      // Closed-source
      claude: {
        name: "claude",
        displayName: "Claude Opus 4.6",
        model: AGENT_MODELS.claude,
        color: "magenta",
        elo: 1000,
        wins: 0,
        losses: 0,
      },
      grok: {
        name: "grok",
        displayName: "Grok 4.1 Fast",
        model: AGENT_MODELS.grok,
        color: "red",
        elo: 1000,
        wins: 0,
        losses: 0,
      },
      gpt: {
        name: "gpt",
        displayName: "GPT 5.2 Codex",
        model: AGENT_MODELS.gpt,
        color: "green",
        elo: 1000,
        wins: 0,
        losses: 0,
      },
      gemini: {
        name: "gemini",
        displayName: "Gemini 3 Pro",
        model: AGENT_MODELS.gemini,
        color: "cyan",
        elo: 1000,
        wins: 0,
        losses: 0,
      },
      // Open-source
      glm: {
        name: "glm",
        displayName: "GLM 5",
        model: AGENT_MODELS.glm,
        color: "blue",
        elo: 1000,
        wins: 0,
        losses: 0,
      },
      kimi: {
        name: "kimi",
        displayName: "Kimi K2.5",
        model: AGENT_MODELS.kimi,
        color: "yellow",
        elo: 1000,
        wins: 0,
        losses: 0,
      },
      deepseek: {
        name: "deepseek",
        displayName: "DeepSeek V3.2",
        model: AGENT_MODELS.deepseek,
        color: "white",
        elo: 1000,
        wins: 0,
        losses: 0,
      },
      minimax: {
        name: "minimax",
        displayName: "MiniMax M2.5",
        model: AGENT_MODELS.minimax,
        color: "gray",
        elo: 1000,
        wins: 0,
        losses: 0,
      },
    },
    battleHistory: [],
    voteStats: { totalVotes: 0, agreedWithJudge: 0 },
  };
}

let gameState: GameState = createInitialState();

// ── Main menu ───────────────────────────────────────────────────────

type MenuChoice = "battle" | "tournament" | "leaderboard" | "history" | "vote_stats" | "exit";

async function mainMenu(): Promise<MenuChoice> {
  const { action } = await inquirer.prompt<{ action: MenuChoice }>([
    {
      type: "select",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "\u2694\uFE0F  Quick Battle", value: "battle" },
        { name: "\uD83C\uDFC6 Tournament", value: "tournament" },
        { name: "\uD83D\uDCCA Leaderboard", value: "leaderboard" },
        { name: "\uD83D\uDCDC Battle History", value: "history" },
        { name: "\uD83D\uDDF3\uFE0F  Vote Stats", value: "vote_stats" },
        { name: "\uD83D\uDEAA Exit", value: "exit" },
      ],
    },
  ]);
  return action;
}

// ── Agent selection ─────────────────────────────────────────────────

async function selectAgents(): Promise<[AgentName, AgentName] | null> {
  const agents = Object.values(gameState.agents);

  const { picked } = await inquirer.prompt<{ picked: AgentName[] }>([
    {
      type: "checkbox",
      name: "picked",
      message: "Pick exactly 2 agents to battle:",
      choices: agents.map((a) => ({
        name: `${a.displayName} (ELO: ${a.elo})`,
        value: a.name,
      })),
      validate: (input: AgentName[]) =>
        input.length === 2 || "You must pick exactly 2 agents.",
    },
  ]);

  return [picked[0]!, picked[1]!];
}

// ── Category selection ──────────────────────────────────────────────

async function selectCategory(): Promise<BattlePrompt["category"] | "random"> {
  const { category } = await inquirer.prompt<{ category: string }>([
    {
      type: "select",
      name: "category",
      message: "Choose a battle category:",
      choices: [
        { name: "\uD83C\uDFB2 Random", value: "random" },
        { name: "\uD83D\uDDE3\uFE0F  Debate", value: "debate" },
        { name: "\uD83D\uDCBB Code", value: "code" },
        { name: "\u2753 Riddle", value: "riddle" },
        { name: "\uD83D\uDD25 Roast", value: "roast" },
        { name: "\u265F\uFE0F  Strategy", value: "strategy" },
      ],
    },
  ]);
  return category as BattlePrompt["category"] | "random";
}

// ── Difficulty selection ────────────────────────────────────────────

async function selectDifficulty(): Promise<Difficulty> {
  const { difficulty } = await inquirer.prompt<{ difficulty: Difficulty }>([
    {
      type: "select",
      name: "difficulty",
      message: "Choose difficulty:",
      choices: [
        { name: "\u2B50 Easy (K=16)", value: "easy" },
        { name: "\u2B50\u2B50 Medium (K=32)", value: "medium" },
        { name: "\u2B50\u2B50\u2B50 Hard (K=48)", value: "hard" },
      ],
    },
  ]);
  return difficulty;
}

// ── Get prompt helper ───────────────────────────────────────────────

function getPrompt(
  category: BattlePrompt["category"] | "random",
  difficulty: Difficulty,
): BattlePrompt {
  if (category === "random") {
    return getRandomPromptByDifficulty(difficulty);
  }
  return getRandomPromptByCategoryAndDifficulty(category, difficulty);
}

// ── Audience vote ───────────────────────────────────────────────────

async function audienceVote(
  agent1Name: AgentName,
  agent2Name: AgentName,
): Promise<AgentName | null> {
  const a1 = gameState.agents[agent1Name];
  const a2 = gameState.agents[agent2Name];

  const { vote } = await inquirer.prompt<{ vote: string }>([
    {
      type: "select",
      name: "vote",
      message: "\uD83D\uDDF3\uFE0F  Who do you think won?",
      choices: [
        { name: a1.displayName, value: agent1Name },
        { name: a2.displayName, value: agent2Name },
        { name: "Skip voting", value: "skip" },
      ],
    },
  ]);

  if (vote === "skip") return null;
  return vote as AgentName;
}

function showVoteResult(userPick: AgentName | null, judgeWinner: AgentName): void {
  if (userPick === null) return;

  if (userPick === judgeWinner) {
    console.log(chalk.green("  \u2705 You agreed with Judge Llama 4!"));
    gameState.voteStats.agreedWithJudge++;
  } else {
    const userAgent = gameState.agents[userPick];
    const judgeAgent = gameState.agents[judgeWinner];
    console.log(
      chalk.red(`  \u274C You disagreed! You picked ${userAgent.displayName}, Llama picked ${judgeAgent.displayName}`),
    );
  }
  gameState.voteStats.totalVotes++;
  console.log();
}

// ── Export report ───────────────────────────────────────────────────

function exportReport(result: BattleResult): void {
  const report = generateBattleReport(result, gameState.agents);
  const dir = "./reports";
  const fs = require("fs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = `${dir}/battle-${result.id}.md`;
  fs.writeFileSync(filePath, report);
  console.log(chalk.green(`  📄 Report saved to ${filePath}\n`));
}

function exportTournamentReport(tournament: Tournament): void {
  const report = generateTournamentReport(tournament, gameState.agents);
  const dir = "./reports";
  const fs = require("fs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = `${dir}/tournament-${tournament.id}.md`;
  fs.writeFileSync(filePath, report);
  console.log(chalk.green(`  📄 Report saved to ${filePath}\n`));
}

// ── Record on chain (automatic) ─────────────────────────────────────

async function autoRecordOnChain(result: BattleResult): Promise<void> {
  if (!isContractDeployed()) {
    console.log(chalk.gray("  ⛓️  Smart contract not deployed — skipping on-chain recording. Run: bun run deploy\n"));
    return;
  }

  const chainSpinner = ora("Recording on BNB Testnet + IPFS...").start();
  const chainResult = await recordBattle(result);
  if (chainResult) {
    chainSpinner.succeed("Recorded on-chain!");
    showBattleReceipt(
      chainResult.txHash,
      chainResult.battleNumber,
      getContractAddress(),
      chainResult.ipfsCid,
    );
    result.txHash = chainResult.txHash;
    result.ipfsCid = chainResult.ipfsCid;
  } else {
    chainSpinner.warn("On-chain recording failed (see warning above).");
  }
}

// ── Battle flow ─────────────────────────────────────────────────────

async function runBattle(): Promise<void> {
  const agents = await selectAgents();
  if (!agents) return;
  const [a1, a2] = agents;

  const category = await selectCategory();
  const difficulty = await selectDifficulty();
  const prompt = getPrompt(category, difficulty);

  const agent1 = gameState.agents[a1];
  const agent2 = gameState.agents[a2];

  showBattleHeader(agent1, agent2, prompt);

  // Collect responses with spinner (no live streaming)
  let responses: [BattleResponse, BattleResponse];
  try {
    responses = await collectResponses(agent1, agent2, prompt.prompt);
  } catch (err) {
    const spinner = ora("Agents are thinking...").start();
    const results = await Promise.allSettled([
      callAgent(a1, prompt.prompt),
      callAgent(a2, prompt.prompt),
    ]);

    const r1 = results[0]!;
    const r2 = results[1]!;

    if (r1.status === "rejected" || r2.status === "rejected") {
      spinner.fail("One or more agents failed to respond.");
      if (r1.status === "rejected") {
        console.log(chalk.red(`  ${agent1.displayName}: ${r1.reason instanceof Error ? r1.reason.message : r1.reason}`));
      }
      if (r2.status === "rejected") {
        console.log(chalk.red(`  ${agent2.displayName}: ${r2.reason instanceof Error ? r2.reason.message : r2.reason}`));
      }
      console.log();
      return;
    }

    spinner.succeed("Both agents have responded!");
    responses = [r1.value, r2.value] as [BattleResponse, BattleResponse];
  }

  // Summarize and display head-to-head panels
  const summarySpinner = ora("Summarizing responses...").start();
  const [summary1, summary2] = await summarizeBattle(responses);
  if (summary1.isFallback || summary2.isFallback) {
    summarySpinner.warn("Summaries ready (some used raw text fallback).");
  } else {
    summarySpinner.succeed("Summaries ready!");
  }

  showHeadToHead(agent1, agent2, responses[0], responses[1], summary1, summary2);

  // Audience vote (before judge)
  const userVote = await audienceVote(a1, a2);

  // Judge
  const judgeSpinner = ora("\uD83E\uDD99 Llama 4 is judging...").start();
  let verdict;
  try {
    verdict = await judgeBattle(prompt, responses);
  } catch (err) {
    judgeSpinner.fail("Judge failed to return a verdict.");
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.red(`  ${msg}\n`));
    return;
  }
  judgeSpinner.succeed("Verdict is in!");

  showVerdict(verdict, [agent1, agent2]);
  showVoteResult(userVote, verdict.winner);

  // Build result and update ELO
  const result: BattleResult = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    prompt,
    agents: [a1, a2],
    responses,
    verdict,
  };
  gameState = updateGameState(gameState, result);

  console.log(chalk.gray(`  ELO updated. (K=${prompt.difficulty === "easy" ? 16 : prompt.difficulty === "medium" ? 32 : 48})\n`));

  // On-chain recording (automatic)
  await autoRecordOnChain(result);

  // Export report (automatic)
  exportReport(result);
}

// ── Tournament flow ─────────────────────────────────────────────────

async function runTournament(): Promise<void> {
  const art = figlet.textSync("TOURNAMENT", { font: "Small" });
  console.log(chalk.yellow(art));

  // Select category
  const category = await selectCategory();
  const categoryLabel = category === "random" ? "mixed" : category;

  let tournament = createTournamentBracket(ALL_AGENTS, categoryLabel);

  showBracket(tournament, gameState.agents);

  while (true) {
    const nextMatch = getNextMatch(tournament);
    if (!nextMatch) break;

    const roundName = getRoundName(nextMatch.round);
    const difficulty = getDifficultyForRound(nextMatch.round);
    const diffLabel = difficulty === "easy" ? "\u2B50" : difficulty === "medium" ? "\u2B50\u2B50" : "\u2B50\u2B50\u2B50";

    console.log(chalk.bold.yellow(`\n  ${roundName} #${nextMatch.matchNumber} ${diffLabel}`));

    const agent1 = gameState.agents[nextMatch.agent1];
    const agent2 = gameState.agents[nextMatch.agent2];

    // Get prompt for this match
    const prompt = category === "random"
      ? getRandomPromptByDifficulty(difficulty)
      : getRandomPromptByCategoryAndDifficulty(category as BattlePrompt["category"], difficulty);

    showBattleHeader(agent1, agent2, prompt);

    // Collect responses with spinner
    let responses: [BattleResponse, BattleResponse];
    try {
      responses = await collectResponses(agent1, agent2, prompt.prompt);
    } catch {
      const spinner = ora("Agents are thinking...").start();
      const results = await Promise.allSettled([
        callAgent(nextMatch.agent1, prompt.prompt),
        callAgent(nextMatch.agent2, prompt.prompt),
      ]);
      const r1 = results[0]!;
      const r2 = results[1]!;
      if (r1.status === "rejected" || r2.status === "rejected") {
        spinner.fail("Agent failed. Skipping match.");
        break;
      }
      spinner.succeed("Both agents have responded!");
      responses = [r1.value, r2.value] as [BattleResponse, BattleResponse];
    }

    // Summarize and display head-to-head panels
    const summarySpinner = ora("Summarizing responses...").start();
    const [summary1, summary2] = await summarizeBattle(responses);
    if (summary1.isFallback || summary2.isFallback) {
      summarySpinner.warn("Summaries ready (some used raw text fallback).");
    } else {
      summarySpinner.succeed("Summaries ready!");
    }

    showHeadToHead(agent1, agent2, responses[0], responses[1], summary1, summary2);

    // Audience vote
    const userVote = await audienceVote(nextMatch.agent1, nextMatch.agent2);

    // Judge
    const judgeSpinner = ora("\uD83E\uDD99 Llama 4 is judging...").start();
    let verdict;
    try {
      verdict = await judgeBattle(prompt, responses);
    } catch (err) {
      judgeSpinner.fail("Judge failed.");
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`  ${msg}\n`));
      break;
    }
    judgeSpinner.succeed("Verdict is in!");

    showVerdict(verdict, [agent1, agent2]);
    showVoteResult(userVote, verdict.winner);

    const result: BattleResult = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      prompt,
      agents: [nextMatch.agent1, nextMatch.agent2],
      responses,
      verdict,
    };
    gameState = updateGameState(gameState, result);

    // Find the actual index for this match in the tournament
    const idx = tournament.matches.findIndex(
      (m) => m.matchNumber === nextMatch.matchNumber,
    );
    tournament = advanceTournament(tournament, idx, result);

    console.log(chalk.gray("  ELO updated.\n"));

    // Show updated bracket
    showBracket(tournament, gameState.agents);

    // Pause between matches
    if (getNextMatch(tournament)) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Tournament complete
  if (tournament.champion) {
    const champ = gameState.agents[tournament.champion];
    const champArt = figlet.textSync("CHAMPION", { font: "Small" });
    console.log(chalk.yellow(champArt));
    console.log(chalk.bold.yellow(`  \uD83C\uDFC6 ${champ.displayName} \uD83C\uDFC6\n`));
  }

  // Record all tournament battles on chain (automatic)
  if (isContractDeployed()) {
    console.log(chalk.gray("  ⛓️  Recording tournament battles on BNB Chain + IPFS...\n"));
    for (const match of tournament.matches) {
      if (match.result) {
        const chainSpinner = ora(`Recording match #${match.matchNumber}...`).start();
        const chainResult = await recordBattle(match.result);
        if (chainResult) {
          chainSpinner.succeed(`Match #${match.matchNumber} recorded (tx: ${chainResult.txHash.slice(0, 10)}...)`);
          match.result.txHash = chainResult.txHash;
          match.result.ipfsCid = chainResult.ipfsCid;
        } else {
          chainSpinner.warn(`Match #${match.matchNumber} recording failed.`);
        }
      }
    }
  } else {
    console.log(chalk.gray("  ⛓️  Smart contract not deployed — skipping on-chain recording. Run: bun run deploy\n"));
  }

  // Export tournament report (automatic)
  exportTournamentReport(tournament);
}

// ── Leaderboard menu ────────────────────────────────────────────────

async function viewLeaderboard(): Promise<void> {
  const leaderSpinner = ora("Fetching on-chain leaderboard...").start();
  const entries = await getOnChainLeaderboard();
  if (entries && entries.length > 0) {
    leaderSpinner.succeed("On-chain leaderboard loaded!");
    showOnChainLeaderboard(entries);
  } else {
    leaderSpinner.warn("No on-chain leaderboard data available.");
  }
}

// ── Battle history ──────────────────────────────────────────────────

function showHistory(): void {
  const history = gameState.battleHistory;

  if (history.length === 0) {
    console.log(chalk.gray("\n  No battles yet.\n"));
    return;
  }

  console.log(chalk.bold.yellow("\n\uD83D\uDCDC BATTLE HISTORY\n"));

  const recent = history.slice(-10).reverse();
  for (const b of recent) {
    const winner = gameState.agents[b.verdict.winner];
    const loserName = b.agents.find((a) => a !== b.verdict.winner);
    if (!loserName) continue;
    const loserAgent = gameState.agents[loserName];
    const time = new Date(b.timestamp).toLocaleString();
    const chain = b.txHash ? chalk.green(" [on-chain]") : "";
    const ipfs = b.ipfsCid ? chalk.cyan(" [IPFS]") : "";
    const diff = b.prompt.difficulty === "easy" ? "\u2B50" : b.prompt.difficulty === "medium" ? "\u2B50\u2B50" : "\u2B50\u2B50\u2B50";

    console.log(
      `  ${chalk.gray(time)}  ${chalk.yellow(b.prompt.category.padEnd(8))} ${diff}  ` +
        `${chalk.bold(winner.displayName)} beat ${loserAgent.displayName}  ` +
        `${chalk.gray(`(${b.verdict.scores[b.verdict.winner]}--${b.verdict.scores[loserName]})`)}` +
        chain + ipfs,
    );
  }
  console.log();
}

// ── Game loop ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  showTitle();

  try {
    requireApiKey();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.red(`  ${msg}\n`));
    console.log(chalk.yellow("  Copy .env.example to .env and add your OpenRouter key.\n"));
    process.exit(1);
  }

  while (true) {
    const action = await mainMenu();

    switch (action) {
      case "battle":
        await runBattle();
        break;
      case "tournament":
        await runTournament();
        break;
      case "leaderboard":
        await viewLeaderboard();
        break;
      case "history":
        showHistory();
        break;
      case "vote_stats":
        showVoteStats(gameState.voteStats);
        break;
      case "exit":
        console.log(
          chalk.gray("\n  Thanks for watching the AI Agents War!\n"),
        );
        process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
