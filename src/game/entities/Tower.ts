import Phaser from 'phaser';
import { TOWER_WIDTH, TOWER } from '../../config/gameConfig';
import { drawTower, drawTowerHpBar, type HpBar, type Side } from '../../render/shapes';
import type { Damageable } from '../types';

export class Tower implements Damageable {
  private rect: Phaser.GameObjects.Rectangle;
  private hpBar: HpBar;
  readonly side: Side;
  maxHp: number;
  currentHp: number;

  constructor(scene: Phaser.Scene, side: Side, maxHp: number = TOWER.maxHp) {
    this.side = side;
    this.rect = drawTower(scene, side);
    this.maxHp = maxHp;
    this.currentHp = this.maxHp;
    this.hpBar = drawTowerHpBar(scene, side);
    this.refreshHpBar();
  }

  get x(): number {
    return this.rect.x;
  }

  get width(): number {
    return TOWER_WIDTH;
  }

  takeDamage(n: number): void {
    this.currentHp = Math.max(0, this.currentHp - n);
    this.refreshHpBar();
  }

  isAlive(): boolean {
    return this.currentHp > 0;
  }

  resetHp(newMaxHp?: number): void {
    if (newMaxHp !== undefined) this.maxHp = newMaxHp;
    this.currentHp = this.maxHp;
    this.refreshHpBar();
  }

  private refreshHpBar(): void {
    const ratio = this.currentHp / this.maxHp;
    this.hpBar.fill.setSize(TOWER_WIDTH * ratio, this.hpBar.fill.height);
    const color = ratio > 0.5 ? 0x00aa00 : ratio > 0.25 ? 0xffaa00 : 0xcc0000;
    this.hpBar.fill.setFillStyle(color);
  }
}
