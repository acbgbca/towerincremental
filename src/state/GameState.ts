export interface GameState {
  enemyLevel: number;
  money: number;
}

export function defaultGameState(): GameState {
  return { enemyLevel: 1, money: 0 };
}
