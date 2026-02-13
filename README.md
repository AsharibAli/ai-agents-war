# AI Agents War

A terminal-based AI battle arena where 8 AI models compete head-to-head — judged by an open-source Llama 4 model. All LLM calls go through [OpenRouter](https://openrouter.ai) — you only need **one API key**.

## Models

### Closed-Source

| Role | Model | OpenRouter ID | Color |
|------|-------|---------------|-------|
| Contestant | Claude Opus 4.6 | `anthropic/claude-opus-4.6` | magenta |
| Contestant | Grok 4.1 Fast | `x-ai/grok-4.1-fast` | red |
| Contestant | GPT 5.2 Codex | `openai/gpt-5.2-codex` | green |
| Contestant | Gemini 3 Pro | `google/gemini-3-pro-preview` | cyan |

### Open-Source

| Role | Model | OpenRouter ID | Color |
|------|-------|---------------|-------|
| Contestant | GLM 5 | `z-ai/glm-5` | blue |
| Contestant | Kimi K2.5 | `moonshotai/kimi-k2.5` | yellow |
| Contestant | DeepSeek V3.2 | `deepseek/deepseek-v3.2` | white |
| Contestant | MiniMax M2.5 | `minimax/minimax-m2.5` | gray |
| Judge | Meta Llama 4 Maverick | `meta-llama/llama-4-maverick` | — |

OpenRouter supports 400+ models. Full catalog at https://openrouter.ai/models

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

### Smart Contract Architecture

```
AIAgentsWar.sol
├── Battle struct        (battleId, winner, loser, scores, category, reasoning, ipfsHash, timestamp)
├── battles[]            (append-only array of all battles)
├── battleIndex          (mapping battleId → array index for lookup)
├── agentStats           (mapping agentName → {wins, losses, totalScore, battlesPlayed})
├── registeredAgents[]   (auto-registered agent names for leaderboard)
├── totalBattles         (global counter)
├── BattleRecorded event (indexed battleNumber + full battle data + ipfsHash)
└── getLeaderboard()     (returns all agents and their stats)
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

## Project Structure

```
src/
  index.ts              Entry point and game loop
  config.ts             Environment loader
  agents/
    index.ts            OpenRouter client + model map + streaming
    personalities.ts    Agent personality system prompts
  battle/
    prompts.ts          Battle prompts with difficulty tiers
    judge.ts            Judge verdict logic (Llama 4)
    elo.ts              ELO calculation with K-factor tiers
    tournament.ts       Tournament bracket system
  chain/
    contracts/          AIAgentsWar.sol Solidity contract
    deploy.ts           Compile + deploy script
    index.ts            Contract interaction + on-chain leaderboard
    ipfs.ts             Pinata IPFS integration
  ui/
    index.ts            Terminal display components
    stream.ts           Side-by-side streaming display
    bracket.ts          ASCII tournament bracket
    report.ts           Markdown report generator
  types/
    index.ts            Shared TypeScript interfaces
```

## Graceful Degradation

All optional features degrade gracefully:
- No `PINATA_JWT`? IPFS upload skipped, battles continue
- No contract deployed? On-chain features hidden, battles continue
- No `WALLET_PRIVATE_KEY`? Chain features disabled, battles continue
- Streaming fails? Falls back to non-streaming mode
- A model fails? Tries fallback model, shows error if both fail
