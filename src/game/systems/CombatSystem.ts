import type { Troop } from '../entities/Troop';
import type { Tower } from '../entities/Tower';
import type { ProjectileTarget } from '../entities/Projectile';
import type { Damageable } from '../types';

interface RangeTarget extends Damageable {
  x: number;
  y: number;
  width: number;
}

interface RangeOrigin {
  x: number;
  y: number;
  range: number;
}

export function distanceToNearEdge(
  self: { x: number; y: number },
  target: { x: number; y: number; width: number },
): number {
  const dx = self.x - target.x;
  const dy = self.y - target.y;
  return Math.hypot(dx, dy) - target.width / 2;
}

export function pickTarget(
  self: RangeOrigin,
  troops: RangeTarget[],
  tower: RangeTarget,
): RangeTarget | null {
  let best: RangeTarget | null = null;
  let bestDist = Infinity;
  for (const candidate of troops) {
    if (!candidate.isAlive()) continue;
    const d = distanceToNearEdge(self, candidate);
    if (d <= self.range && d < bestDist) {
      best = candidate;
      bestDist = d;
    }
  }
  if (tower.isAlive()) {
    const d = distanceToNearEdge(self, tower);
    if (d <= self.range && d < bestDist) {
      best = tower;
      bestDist = d;
    }
  }
  return best;
}

export class CombatSystem {
  constructor(private spawnProjectile: (attacker: Troop, target: ProjectileTarget) => void) {}

  update(
    delta: number,
    playerTroops: Troop[],
    enemyTroops: Troop[],
    playerTower: Tower,
    enemyTower: Tower,
  ): void {
    for (const player of playerTroops) {
      if (player.state !== 'WALKING') continue;
      const target = pickTarget(player, enemyTroops, enemyTower);
      if (target) {
        player.state = 'ATTACKING';
        player.currentTarget = target;
      }
    }

    for (const enemy of enemyTroops) {
      if (enemy.state !== 'WALKING') continue;
      const target = pickTarget(enemy, playerTroops, playerTower);
      if (target) {
        enemy.state = 'ATTACKING';
        enemy.currentTarget = target;
      }
    }

    for (const troop of [...playerTroops, ...enemyTroops]) {
      if (troop.state !== 'ATTACKING' || !troop.currentTarget) continue;
      troop.attackTimer += delta;
      if (troop.attackTimer >= troop.attackInterval) {
        this.spawnProjectile(troop, troop.currentTarget as ProjectileTarget);
        troop.attackTimer = 0;
      }
    }

    for (const troop of [...playerTroops, ...enemyTroops]) {
      if (troop.state === 'ATTACKING' && troop.currentTarget && !troop.currentTarget.isAlive()) {
        troop.state = 'WALKING';
        troop.currentTarget = null;
        troop.attackTimer = 0;
      }
    }
  }
}
