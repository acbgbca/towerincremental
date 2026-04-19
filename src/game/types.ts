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
