<div align="center">

![AI Agents War Main Picture](./public/ai-agents-war.png)

A CLI-based battle arena where top AI language models fight head-to-head, judged by an open-source AI, with every result recorded on BNB Chain & IPFS.

</div>

## Why Build this?

There's no transparent, verifiable way to compare AI models head-to-head. Benchmarks are static. Leaderboards are self-reported. Nobody lets you watch the fight happen live.

I built a system where:

- Real models compete on the same prompt in real-time
- An independent open-source model judges with no corporate loyalty
- Every result is permanently stored on-chain and on IPFS
- Anyone can verify any battle, anytime

## Why Is It?

AI Agents War pits 4 closed-source models against 4 open-source models in live battles across debate, coding, riddles, roasts, and strategy. Meta's Llama 4 Maverick — a neutral open-source model — judges every fight. Results are recorded on BNB Chain. Full battle data lives on IPFS.

- Closed-source: Claude · Grok · GPT · Gemini

- Open-source: GLM · Kimi · DeepSeek · MiniMax

- Judge: Llama 4 Maverick (neutral, open-source)

## Features

- **8 AI Agents** — Claude, Grok, GPT, Gemini (closed-source) vs GLM, Kimi, DeepSeek, MiniMax (open-source)
- **Agent Personalities** — Each agent has a unique system prompt reflecting their character
- **Live Streaming** — Both agent responses stream side-by-side in the terminal
- **Tournament Mode** — 8-agent single-elimination bracket (QF/SF/Finals)
- **Battle Difficulty Tiers** — Easy/Medium/Hard with different ELO K-factors
- **Audience Voting** — Vote before the judge reveals their verdict
- **IPFS Storage** — Store full battle data on IPFS via Pinata
- **On-Chain Recording** — Record results on BNB Chain smart contract
- **On-Chain Leaderboard** — View agent rankings from the smart contract
- **Battle Reports** — Export shareable markdown reports
- **ELO Rating System** — Standard competitive rating with difficulty-based K-factors

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- [OpenRouter](https://openrouter.ai/settings/keys) API key
- (Optional) BNB Testnet RPC + wallet for on-chain features
- (Optional) [Pinata](https://pinata.cloud) JWT for IPFS storage

## Setup

```bash
git clone https://github.com/asharibali/ai-agents-war && cd ai-agent-war
bun install
cp .env.example .env
```

Edit `.env` and add your keys:

```
OPENROUTER_API_KEY=sk-or-...
BNB_TESTNET_RPC=https://data-seed-prebsc-1-s1.bnbchain.org:8545
WALLET_PRIVATE_KEY=0x...
PINATA_JWT=...
```

Get your API key at https://openrouter.ai/settings/keys

## Run

```bash
bun start
# or
bun run src/index.ts
# or with hot reload
bun dev
```

## How It Works

### Quick Battle

1. Pick 2 AI agents from the roster of 8
2. Choose a battle category (debate, code, riddle, roast, strategy) or random
3. Choose difficulty (Easy/Medium/Hard)
4. Both agents stream responses side-by-side via OpenRouter
5. Vote on who you think won
6. Meta Llama 4 Maverick judges on creativity, accuracy, clarity, entertainment
7. See if you agreed with the judge
8. ELO ratings update (K-factor scales with difficulty)
9. Optionally record on BNB Chain + IPFS
10. Optionally export a markdown battle report

### Tournament Mode

1. All 8 agents enter a single-elimination bracket
2. Quarter-finals use Easy prompts, semis use Medium, finals use Hard
3. Watch the ASCII bracket update as winners advance
4. Champion crowned with celebration display
5. Batch record all tournament battles on-chain

### Difficulty Tiers

| Tier | K-Factor | ELO Impact |
|------|----------|------------|
| Easy | 16 | Low swing |
| Medium | 32 | Normal |
| Hard | 48 | High stakes |

## On-Chain Recording

Battle results are recorded in a deployed **AIAgentsWar** smart contract on BNB Chain Testnet.

### Architecture

```
┌──────────────────────────────────────────────────────┐
│              CLI Interface (Bun + TypeScript)         │
│                                                      │
│   Quick Battle  ·  Tournament  ·  Leaderboard        │
│                        │                             │
│            OpenRouter API (Single Gateway)            │
│            1 Key → 8 Models → 400+ Available         │
│                        │                             │
│     8 Agent Callers · Llama 4 Judge · Live Stream    │
│                        │                             │
│              BNB Chain  ·  IPFS (Pinata)             │
└──────────────────────────────────────────────────────┘
```

### Setup

1. Set `BNB_TESTNET_RPC` and `WALLET_PRIVATE_KEY` in `.env`
2. Get testnet BNB from https://www.bnbchain.org/en/testnet-faucet
3. Deploy the contract:
   ```bash
   bun run deploy
   ```
4. After battles, choose "Record on BNB Chain" when prompted
5. View on-chain leaderboard from main menu

## IPFS Storage

Battle data (prompt, responses, verdict) can be stored on IPFS via Pinata for permanent verifiable storage.

1. Get a JWT from https://pinata.cloud
2. Set `PINATA_JWT` in `.env`
3. When recording on-chain, battle data is automatically uploaded to IPFS first
4. The IPFS CID is stored in the smart contract alongside the battle result

## Battle Reports

After any battle or tournament, export a shareable markdown report to `./reports/`.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) (TypeScript, no transpiler needed)
- **API Gateway**: [OpenRouter](https://openrouter.ai) (single key for all models)
- **AI Agents**: 8 models with unique personalities
- **Judge**: Meta Llama 4 Maverick (open-source)
- **Blockchain**: [ethers.js](https://docs.ethers.org/v6/) v6 + BNB Chain Testnet
- **IPFS**: Pinata SDK for decentralized battle storage
- **Terminal UI**: chalk, boxen, cli-table3, ora, figlet, inquirer

Build with ❤️ by [Asharib Ali](https://www.asharib.xyz/)
