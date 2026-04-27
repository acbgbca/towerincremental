import Phaser from 'phaser';
import { drawProjectile, type Side } from '../../render/shapes';
import type { Damageable, TroopType } from '../types';
import type { Troop } from './Troop';

export interface ProjectileTarget extends Damageable {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

export interface ProjectileImpact {
  attacker: Troop;
  attackerSide: Side;
  target: ProjectileTarget;
  damage: number;
}

export class Projectile {
  private circle: Phaser.GameObjects.Arc;
  private scene: Phaser.Scene;
  expired = false;

  readonly attacker: Troop;
  readonly target: ProjectileTarget;
  readonly damage: number;
  readonly speed: number;
  readonly attackerSide: Side;

  constructor(scene: Phaser.Scene, attacker: Troop, target: ProjectileTarget, type: TroopType, speed: number) {
    this.scene = scene;
    this.attacker = attacker;
    this.target = target;
    this.damage = attacker.damage;
    this.speed = speed;
    this.attackerSide = attacker.side;
    this.circle = drawProjectile(scene, attacker.side, type, attacker.x, attacker.y);
  }

  get x(): number {
    return this.circle.x;
  }

  get y(): number {
    return this.circle.y;
  }

  update(delta: number): void {
    if (this.expired) return;
    if (!this.target.isAlive()) {
      this.expired = true;
      return;
    }

    const dx = this.target.x - this.circle.x;
    const dy = this.target.y - this.circle.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * (delta / 1000);

    if (dist <= this.target.width / 2 || dist <= step) {
      this.target.takeDamage(this.damage);
      const impact: ProjectileImpact = {
        attacker: this.attacker,
        attackerSide: this.attackerSide,
        target: this.target,
        damage: this.damage,
      };
      this.scene.events.emit('projectile:impact', impact);
      this.expired = true;
      return;
    }

    this.circle.x += (dx / dist) * step;
    this.circle.y += (dy / dist) * step;
  }

  destroy(): void {
    this.circle.destroy();
  }
}
