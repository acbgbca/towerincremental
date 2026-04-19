export type TroopType = 'base';
export type TroopState = 'WALKING' | 'ATTACKING' | 'DEAD';

export interface TroopStats {
  walkSpeed: number;
  width: number;
  height: number;
  hp: number;
  damage: number;
  attackInterval: number;
}

export interface Damageable {
  takeDamage(n: number): void;
  isAlive(): boolean;
}

export interface MatchResult {
  winner: 'player' | 'enemy';
}
