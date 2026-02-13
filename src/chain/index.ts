import { ethers } from "ethers";
import chalk from "chalk";
import { config } from "../config.ts";
import type { BattleResult } from "../types/index.ts";
import { uploadBattleToIPFS, isIPFSConfigured, getIPFSLink } from "./ipfs.ts";

// ── Deployed contract loader ────────────────────────────────────────

interface DeployedInfo {
  address: string;
  abi: ethers.InterfaceAbi;
}

let _deployedCache: DeployedInfo | null | undefined;

function loadDeployed(): DeployedInfo | null {
  if (_deployedCache !== undefined) return _deployedCache;

  try {
    const path = decodeURIComponent(new URL("deployed.json", import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
    const raw = JSON.parse(
      require("fs").readFileSync(path, "utf-8"),
    ) as DeployedInfo;
    _deployedCache = raw;
    return raw;
  } catch {
    _deployedCache = null;
    return null;
  }
}

export function isContractDeployed(): boolean {
  return loadDeployed() !== null;
}

export function getContractAddress(): string | null {
  return loadDeployed()?.address ?? null;
}

// ── Contract instance ───────────────────────────────────────────────

function getContract(): ethers.Contract | null {
  const deployed = loadDeployed();
  if (!deployed) {
    console.log(chalk.yellow("  Contract not deployed. Run: bun run deploy"));
    return null;
  }
  if (!config.bnbTestnetRpc) {
    console.log(chalk.yellow("  BNB_TESTNET_RPC not set — on-chain features disabled"));
    return null;
  }
  if (!config.walletPrivateKey) {
    console.log(chalk.yellow("  WALLET_PRIVATE_KEY not set — on-chain features disabled"));
    return null;
  }

  const provider = new ethers.JsonRpcProvider(config.bnbTestnetRpc);
  const wallet = new ethers.Wallet(config.walletPrivateKey, provider);
  return new ethers.Contract(deployed.address, deployed.abi, wallet);
}

function getReadOnlyContract(): ethers.Contract | null {
  const deployed = loadDeployed();
  if (!deployed) return null;
  if (!config.bnbTestnetRpc) return null;

  const provider = new ethers.JsonRpcProvider(config.bnbTestnetRpc);
  return new ethers.Contract(deployed.address, deployed.abi, provider);
}

/**
 * Check if the deployed ABI has the new recordBattle with 8 params (includes _ipfsHash).
 * The old contract has 7 params; the new one has 8.
 */
function hasIpfsSupport(): boolean {
  const deployed = loadDeployed();
  if (!deployed) return false;
  const abi = deployed.abi as Array<{ name?: string; inputs?: unknown[] }>;
  const recordFn = abi.find(
    (entry) => entry.name === "recordBattle" && Array.isArray(entry.inputs),
  );
  return (recordFn?.inputs?.length ?? 0) >= 8;
}

/**
 * Check if the deployed ABI has the getLeaderboard function.
 */
function hasLeaderboardSupport(): boolean {
  const deployed = loadDeployed();
  if (!deployed) return false;
  const abi = deployed.abi as Array<{ name?: string }>;
  return abi.some((entry) => entry.name === "getLeaderboard");
}

// ── Public API ──────────────────────────────────────────────────────

export interface RecordResult {
  txHash: string;
  battleNumber: number;
  ipfsCid?: string;
}

export async function recordBattle(
  result: BattleResult,
): Promise<RecordResult | null> {
  try {
    const contract = getContract();
    if (!contract) return null;

    // Upload to IPFS first (optional)
    let ipfsCid = "";
    if (isIPFSConfigured()) {
      const cid = await uploadBattleToIPFS(result);
      if (cid) {
        ipfsCid = cid;
        console.log(chalk.cyan(`  IPFS: ${getIPFSLink(cid)}`));
      }
    }

    const winner = result.verdict.winner;
    const loser = result.agents.find((a) => a !== winner)!;
    const winnerScore = Math.round(result.verdict.scores[winner] ?? 0);
    const loserScore = Math.round(result.verdict.scores[loser] ?? 0);

    // Support both old contract (7 params) and new contract (8 params with ipfsHash)
    let tx;
    if (hasIpfsSupport()) {
      tx = await contract.getFunction("recordBattle")(
        result.id,
        winner,
        loser,
        winnerScore,
        loserScore,
        result.prompt.category,
        result.verdict.reasoning,
        ipfsCid,
      );
    } else {
      tx = await contract.getFunction("recordBattle")(
        result.id,
        winner,
        loser,
        winnerScore,
        loserScore,
        result.prompt.category,
        result.verdict.reasoning,
      );
      if (ipfsCid) {
        console.log(chalk.gray("  Note: Deployed contract does not store IPFS hash. Redeploy for full IPFS support."));
      }
    }

    const receipt = await tx.wait();

    // Parse BattleRecorded event
    let battleNumber = 0;
    if (receipt) {
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === "BattleRecorded") {
            battleNumber = Number(parsed.args[0]);
          }
        } catch {
          // skip unparseable logs
        }
      }
    }

    return { txHash: tx.hash, battleNumber, ipfsCid: ipfsCid || undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("insufficient funds")) {
      console.log(
        chalk.yellow(
          "  Wallet has no tBNB — get some from https://www.bnbchain.org/en/testnet-faucet",
        ),
      );
    } else {
      console.log(chalk.yellow(`  On-chain recording failed: ${msg}`));
    }

    return null;
  }
}

export interface OnChainStats {
  wins: number;
  losses: number;
  totalScore: number;
  battlesPlayed: number;
}

export async function getOnChainStats(
  agentName: string,
): Promise<OnChainStats | null> {
  try {
    const contract = getContract();
    if (!contract) return null;

    const stats = await contract.getFunction("getAgentStats")(agentName);
    return {
      wins: Number(stats.wins),
      losses: Number(stats.losses),
      totalScore: Number(stats.totalScore),
      battlesPlayed: Number(stats.battlesPlayed),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.yellow(`  Failed to fetch on-chain stats: ${msg}`));
    return null;
  }
}

export async function getOnChainBattleCount(): Promise<number | null> {
  try {
    const contract = getContract();
    if (!contract) return null;

    return Number(await contract.getFunction("getTotalBattles")());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.yellow(`  Failed to fetch battle count: ${msg}`));
    return null;
  }
}

export interface OnChainBattle {
  battleId: string;
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
  category: string;
  judgeReasoning: string;
  ipfsHash: string;
  timestamp: number;
}

export async function getRecentOnChainBattles(
  count: number,
): Promise<OnChainBattle[] | null> {
  try {
    const contract = getContract();
    if (!contract) return null;

    const raw = await contract.getFunction("getRecentBattles")(count);
    return (raw as unknown[]).map((b: unknown) => {
      const battle = b as {
        battleId: string;
        winner: string;
        loser: string;
        winnerScore: bigint;
        loserScore: bigint;
        category: string;
        judgeReasoning: string;
        ipfsHash?: string;
        timestamp: bigint;
      };
      return {
        battleId: battle.battleId,
        winner: battle.winner,
        loser: battle.loser,
        winnerScore: Number(battle.winnerScore),
        loserScore: Number(battle.loserScore),
        category: battle.category,
        judgeReasoning: battle.judgeReasoning,
        ipfsHash: battle.ipfsHash ?? "",
        timestamp: Number(battle.timestamp) * 1000,
      };
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.yellow(`  Failed to fetch recent battles: ${msg}`));
    return null;
  }
}

// ── On-Chain Leaderboard ────────────────────────────────────────────

export interface LeaderboardEntry {
  name: string;
  stats: OnChainStats;
}

export async function getOnChainLeaderboard(): Promise<LeaderboardEntry[] | null> {
  if (!hasLeaderboardSupport()) {
    console.log(chalk.yellow("  Deployed contract does not support leaderboard. Redeploy with: bun run deploy"));
    return null;
  }

  try {
    const contract = getReadOnlyContract();
    if (!contract) return null;

    const [agents, stats] = await contract.getFunction("getLeaderboard")();
    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < agents.length; i++) {
      entries.push({
        name: agents[i] as string,
        stats: {
          wins: Number(stats[i].wins),
          losses: Number(stats[i].losses),
          totalScore: Number(stats[i].totalScore),
          battlesPlayed: Number(stats[i].battlesPlayed),
        },
      });
    }

    // Sort by wins descending
    entries.sort((a, b) => b.stats.wins - a.stats.wins);
    return entries;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.yellow(`  Failed to fetch on-chain leaderboard: ${msg}`));
    return null;
  }
}
