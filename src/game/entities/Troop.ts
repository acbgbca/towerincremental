import Phaser from 'phaser';
import { BOARD_WIDTH, TROOP_BASE } from '../../config/gameConfig';
import { drawTroop, drawTroopHpBar, type HpBar } from '../../render/shapes';
import type { Side } from '../../render/shapes';
import type { TroopType, TroopState, TroopStats, Damageable } from '../types';

export class Troop implements Damageable {
  private rect: Phaser.GameObjects.Rectangle;
  private hpBar: HpBar;
  private direction: number;
  private scene: Phaser.Scene;
  private stats: TroopStats;

  state: TroopState = 'WALKING';
  currentHp: number;
  readonly maxHp: number;
  currentTarget: Damageable | null = null;
  attackTimer: number = 0;

  readonly type: TroopType;

  constructor(scene: Phaser.Scene, side: Side, type: TroopType, x: number, y: number, stats: TroopStats = TROOP_BASE) {
    this.scene = scene;
    this.stats = stats;
    this.type = type;
    this.direction = side === 'player' ? 1 : -1;
    const hpBarYOffset = stats.height / 2 + 6;
    this.rect = drawTroop(scene, side, type, x, y);
    this.maxHp = stats.hp;
    this.currentHp = this.maxHp;
    this.hpBar = drawTroopHpBar(scene, type, x, y - hpBarYOffset);
  }

  get x(): number {
    return this.rect.x;
  }

  get y(): number {
    return this.rect.y;
  }

  get width(): number {
    return this.stats.width;
  }

  get height(): number {
    return this.stats.height;
  }

  get damage(): number {
    return this.stats.damage;
  }

  get attackInterval(): number {
    return this.stats.attackInterval;
  }

  isAlive(): boolean {
    return this.state !== 'DEAD';
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
    this.hpBar.fill.setSize(this.stats.width * ratio, this.hpBar.fill.height);

    let color = 0xcc0000;
    if (ratio > 0.5) color = 0x00aa00;
    else if (ratio > 0.25) color = 0xffaa00;
    this.hpBar.fill.setFillStyle(color);
  }

  update(delta: number): void {
    if (this.state === 'WALKING') {
      this.rect.x += this.stats.walkSpeed * this.direction * (delta / 1000);
    }
    this.syncHpBarPosition();
  }

  private syncHpBarPosition(): void {
    const barY = this.rect.y - (this.stats.height / 2 + 6);
    this.hpBar.bg.setPosition(this.rect.x, barY);
    this.hpBar.fill.setPosition(this.rect.x - this.stats.width / 2, barY);
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
