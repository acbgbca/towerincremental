import Phaser from 'phaser';
import { BOARD_WIDTH, TROOP_BASE } from '../../config/gameConfig';
import { drawTroop, drawTroopHpBar, type HpBar } from '../../render/shapes';
import type { Side } from '../../render/shapes';
import type { TroopType, TroopState } from '../types';

const HP_BAR_Y_OFFSET = TROOP_BASE.height / 2 + 6;

export class Troop {
  private rect: Phaser.GameObjects.Rectangle;
  private hpBar: HpBar;
  private direction: number;
  private scene: Phaser.Scene;

  state: TroopState = 'WALKING';
  currentHp: number;
  readonly maxHp: number;
  currentTarget: Troop | null = null;
  attackTimer: number = 0;

  constructor(scene: Phaser.Scene, side: Side, _type: TroopType, x: number, y: number) {
    this.scene = scene;
    this.direction = side === 'player' ? 1 : -1;
    this.rect = drawTroop(scene, side, x, y);
    this.maxHp = TROOP_BASE.hp;
    this.currentHp = this.maxHp;
    this.hpBar = drawTroopHpBar(scene, x, y - HP_BAR_Y_OFFSET);
  }

  get x(): number {
    return this.rect.x;
  }

  get y(): number {
    return this.rect.y;
  }

  get width(): number {
    return TROOP_BASE.width;
  }

  get height(): number {
    return TROOP_BASE.height;
  }

  takeDamage(amount: number): void {
    this.currentHp -= amount;
    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.state = 'DEAD';
    }
    this.refreshHpBar();
  }

  private refreshHpBar(): void {
    const ratio = this.currentHp / this.maxHp;
    this.hpBar.fill.setSize(TROOP_BASE.width * ratio, this.hpBar.fill.height);

    let color = 0xcc0000;
    if (ratio > 0.5) color = 0x00aa00;
    else if (ratio > 0.25) color = 0xffaa00;
    this.hpBar.fill.setFillStyle(color);
  }

  update(delta: number): void {
    if (this.state === 'WALKING') {
      this.rect.x += TROOP_BASE.walkSpeed * this.direction * (delta / 1000);
    }
    this.syncHpBarPosition();
  }

  private syncHpBarPosition(): void {
    const barY = this.rect.y - HP_BAR_Y_OFFSET;
    this.hpBar.bg.setPosition(this.rect.x, barY);
    this.hpBar.fill.setPosition(this.rect.x - TROOP_BASE.width / 2, barY);
  }

  isOutOfBounds(): boolean {
    return this.direction === 1 ? this.rect.x > BOARD_WIDTH : this.rect.x < 0;
  }

  destroy(): void {
    this.rect.destroy();
    this.hpBar.bg.destroy();
    this.hpBar.fill.destroy();
    this.scene.events.emit('troop:despawn', this);
  }
}
