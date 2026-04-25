export interface GameState {
  enemyLevel: number;
}

export function defaultGameState(): GameState {
  return { enemyLevel: 1 };
}
