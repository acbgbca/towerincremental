export type TroopType = 'base';
export type TroopState = 'WALKING' | 'ATTACKING' | 'DEAD';

export interface TroopStats {
  walkSpeed: number;
  width: number;
  height: number;
  hp: number;
  damage: number;
  attackInterval: number;
  cost: number;
}

export interface MatchState {
  money: number;
}

export interface Damageable {
  takeDamage(n: number): void;
  isAlive(): boolean;
}

export interface MatchResult {
  winner: 'player' | 'enemy';
}

export type WaveSystemState = 'BREATHER' | 'SPAWNING' | 'DONE';

export interface WaveTroopGroup {
  type: TroopType;
  count: number;
  spawnIntervalMs: number;
}

export interface WaveDefinition {
  troops: WaveTroopGroup[];
  breatherMs: number;
}

export interface MatchWaveConfig {
  waves: WaveDefinition[];
}
