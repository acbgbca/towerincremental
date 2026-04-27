import type { Troop } from '../entities/Troop';
import type { Tower } from '../entities/Tower';
import type { Damageable, MatchState } from '../types';

interface RangeTarget extends Damageable {
  x: number;
  width: number;
}

function distanceToNearEdge(self: Troop, target: RangeTarget): number {
  return Math.abs(self.x - target.x) - target.width / 2;
}

function pickTarget(
  self: Troop,
  troops: Troop[],
  tower: Tower,
): Damageable | null {
  let best: Damageable | null = null;
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
  update(
    delta: number,
    playerTroops: Troop[],
    enemyTroops: Troop[],
    playerTower: Tower,
    enemyTower: Tower,
    matchState: MatchState,
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

    // Two-pass damage so mutual kills resolve in the same tick.
    const pendingDamage = new Map<Damageable, number>();
    const playerAttacks = new Set<Damageable>();
    for (const troop of [...playerTroops, ...enemyTroops]) {
      if (troop.state !== 'ATTACKING' || !troop.currentTarget) continue;
      troop.attackTimer += delta;
      if (troop.attackTimer >= troop.attackInterval) {
        if (playerTroops.includes(troop)) playerAttacks.add(troop.currentTarget);
        const current = pendingDamage.get(troop.currentTarget) ?? 0;
        pendingDamage.set(troop.currentTarget, current + troop.damage);
        troop.attackTimer = 0;
      }
    }
    const enemyTroopSet = new Set<Damageable>(enemyTroops);
    for (const [target, damage] of pendingDamage) {
      target.takeDamage(damage);
      if (playerAttacks.has(target)) {
        if (target === enemyTower) {
          matchState.towerDamageDealt += damage;
        } else if (enemyTroopSet.has(target)) {
          matchState.troopDamageDealt += damage;
        }
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
