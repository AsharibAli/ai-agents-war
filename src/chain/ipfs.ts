import chalk from "chalk";
import type { BattleResult } from "../types/index.ts";

const PINATA_JWT = process.env.PINATA_JWT ?? "";

export function isIPFSConfigured(): boolean {
  return PINATA_JWT !== "";
}

export async function uploadBattleToIPFS(result: BattleResult): Promise<string | null> {
  if (!isIPFSConfigured()) {
    return null;
  }

  try {
    const battleData = {
      id: result.id,
      timestamp: result.timestamp,
      category: result.prompt.category,
      difficulty: result.prompt.difficulty,
      prompt: result.prompt.prompt,
      responses: result.responses.map((r) => ({
        agent: r.agent,
        response: r.response,
        timeMs: r.timeMs,
      })),
      verdict: result.verdict,
    };

    const blob = new Blob([JSON.stringify(battleData, null, 2)], {
      type: "application/json",
    });

    const formData = new FormData();
    formData.append("file", blob, `battle-${result.id}.json`);

    const metadata = JSON.stringify({
      name: `battle-${result.id}`,
      keyvalues: {
        app: "ai-agents-war",
        category: result.prompt.category,
        winner: result.verdict.winner,
      },
    });
    formData.append("pinataMetadata", metadata);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Pinata ${res.status}: ${body}`);
    }

    const json = (await res.json()) as { IpfsHash: string };
    return json.IpfsHash;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(chalk.yellow(`  IPFS upload failed: ${msg}`));
    return null;
  }
}

export async function getBattleFromIPFS(cid: string): Promise<object | null> {
  try {
    const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as object;
  } catch {
    return null;
  }
}

export function getIPFSLink(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
