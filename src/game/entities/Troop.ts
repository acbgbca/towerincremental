import Phaser from 'phaser';
import { BOARD_WIDTH, TROOP_BASE } from '../../config/gameConfig';
import { drawTroop } from '../../render/shapes';
import type { Side } from '../../render/shapes';
import type { TroopType } from '../types';

export class Troop {
  private rect: Phaser.GameObjects.Rectangle;
  private direction: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, side: Side, _type: TroopType, x: number, y: number) {
    this.scene = scene;
    this.direction = side === 'player' ? 1 : -1;
    this.rect = drawTroop(scene, side, x, y);
  }

  get x(): number {
    return this.rect.x;
  }

  update(delta: number): void {
    this.rect.x += TROOP_BASE.walkSpeed * this.direction * (delta / 1000);
  }

  isOutOfBounds(): boolean {
    return this.direction === 1 ? this.rect.x > BOARD_WIDTH : this.rect.x < 0;
  }

  destroy(): void {
    this.rect.destroy();
    this.scene.events.emit('troop:despawn', this);
  }
}
