import Phaser from 'phaser';
import { PLAYER, ENEMY, TROOP_PLAYER, TROOP_ENEMY } from './palette';
import { BOARD_WIDTH, BOARD_HEIGHT, TOWER_WIDTH, TOWER_HEIGHT, TOWER_MARGIN, TROOP_BASE } from '../config/gameConfig';

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

export function drawTroop(scene: Phaser.Scene, side: Side, x: number, y: number): Phaser.GameObjects.Rectangle {
  const color = side === 'player' ? TROOP_PLAYER : TROOP_ENEMY;
  return scene.add.rectangle(x, y, TROOP_BASE.width, TROOP_BASE.height, color);
}
