import Phaser from 'phaser';
import { PLAYER, ENEMY, TROOP_PLAYER, TROOP_ENEMY } from './palette';
import { BOARD_WIDTH, BOARD_HEIGHT, TOWER_WIDTH, TOWER_HEIGHT, TOWER_MARGIN } from '../config/gameConfig';
import { TROOP_TYPES } from '../config/troopTypes';
import type { TroopType } from '../game/types';

export type Side = 'player' | 'enemy';

export function drawTower(scene: Phaser.Scene, side: Side): Phaser.GameObjects.Rectangle {
  const color = side === 'player' ? PLAYER : ENEMY;
  const x =
    side === 'player'
      ? TOWER_MARGIN + TOWER_WIDTH / 2
      : BOARD_WIDTH - TOWER_MARGIN - TOWER_WIDTH / 2;
  const y = BOARD_HEIGHT / 2;
  return scene.add.rectangle(x, y, TOWER_WIDTH, TOWER_HEIGHT, color);
}

export function drawTroop(
  scene: Phaser.Scene,
  side: Side,
  type: TroopType,
  x: number,
  y: number,
): Phaser.GameObjects.Rectangle {
  const baseColor = side === 'player' ? TROOP_PLAYER : TROOP_ENEMY;
  const color = shadeForType(baseColor, type);
  const stats = TROOP_TYPES[type];
  return scene.add.rectangle(x, y, stats.width, stats.height, color);
}

export function drawProjectile(
  scene: Phaser.Scene,
  side: Side,
  type: TroopType,
  x: number,
  y: number,
): Phaser.GameObjects.Arc {
  const baseColor = side === 'player' ? TROOP_PLAYER : TROOP_ENEMY;
  const color = shadeForType(baseColor, type);
  const radius = TROOP_TYPES[type].projectileRadius;
  return scene.add.circle(x, y, radius, color);
}

export interface HpBar {
  bg: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
}

export function drawTroopHpBar(
  scene: Phaser.Scene,
  type: TroopType,
  x: number,
  y: number,
): HpBar {
  const BAR_HEIGHT = 4;
  const width = TROOP_TYPES[type].width;
  const bg = scene.add.rectangle(x, y, width, BAR_HEIGHT, 0x333333);
  const fill = scene.add.rectangle(x - width / 2, y, width, BAR_HEIGHT, 0x00aa00);
  fill.setOrigin(0, 0.5);
  return { bg, fill };
}

export function drawTowerHpBar(scene: Phaser.Scene, side: Side): HpBar {
  const BAR_HEIGHT = 6;
  const x =
    side === 'player'
      ? TOWER_MARGIN + TOWER_WIDTH / 2
      : BOARD_WIDTH - TOWER_MARGIN - TOWER_WIDTH / 2;
  const y = BOARD_HEIGHT / 2 - TOWER_HEIGHT / 2 - 10;
  const bg = scene.add.rectangle(x, y, TOWER_WIDTH, BAR_HEIGHT, 0x333333);
  const fill = scene.add.rectangle(x - TOWER_WIDTH / 2, y, TOWER_WIDTH, BAR_HEIGHT, 0x00aa00);
  fill.setOrigin(0, 0.5);
  return { bg, fill };
}

function shadeForType(baseColor: number, type: TroopType): number {
  if (type === 'archer') return blend(baseColor, 0xffffff, 0.25);
  if (type === 'tank') return blend(baseColor, 0x000000, 0.3);
  return baseColor;
}

function blend(hex: number, target: number, amount: number): number {
  const r1 = (hex >> 16) & 0xff;
  const g1 = (hex >> 8) & 0xff;
  const b1 = hex & 0xff;
  const r2 = (target >> 16) & 0xff;
  const g2 = (target >> 8) & 0xff;
  const b2 = target & 0xff;
  const r = Math.round(r1 + (r2 - r1) * amount);
  const g = Math.round(g1 + (g2 - g1) * amount);
  const b = Math.round(b1 + (b2 - b1) * amount);
  return (r << 16) | (g << 8) | b;
}
