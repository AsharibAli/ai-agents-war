import type { BattleResult, Difficulty, GameState } from "../types/index.ts";

const K_FACTORS: Record<Difficulty, number> = {
  easy: 16,
  medium: 32,
  hard: 48,
};

export function calculateElo(
  winnerElo: number,
  loserElo: number,
  kFactor: number = 32,
): { newWinnerElo: number; newLoserElo: number } {
  const expectedWinner = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + 10 ** ((winnerElo - loserElo) / 400));

  const newWinnerElo = Math.round(winnerElo + kFactor * (1 - expectedWinner));
  const newLoserElo = Math.round(loserElo + kFactor * (0 - expectedLoser));

  return { newWinnerElo, newLoserElo };
}

export function getKFactor(difficulty: Difficulty): number {
  return K_FACTORS[difficulty];
}

export function updateGameState(
  state: GameState,
  result: BattleResult,
): GameState {
  const winner = result.verdict.winner;
  const loser = result.agents.find((a) => a !== winner)!;

  const kFactor = getKFactor(result.prompt.difficulty);

  const { newWinnerElo, newLoserElo } = calculateElo(
    state.agents[winner].elo,
    state.agents[loser].elo,
    kFactor,
  );

  return {
    ...state,
    agents: {
      ...state.agents,
      [winner]: {
        ...state.agents[winner],
        elo: newWinnerElo,
        wins: state.agents[winner].wins + 1,
      },
      [loser]: {
        ...state.agents[loser],
        elo: newLoserElo,
        losses: state.agents[loser].losses + 1,
      },
    },
    battleHistory: [...state.battleHistory, result],
  };
}
