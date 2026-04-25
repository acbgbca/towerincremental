export interface UpgradeState {
  incomeRate: number;
  towerMaxHp: number;
}

export interface GameState {
  enemyLevel: number;
  money: number;
  upgrades: UpgradeState;
}

export function defaultGameState(): GameState {
  return { enemyLevel: 1, money: 0, upgrades: { incomeRate: 0, towerMaxHp: 0 } };
}
