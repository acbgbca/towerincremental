import type { Troop } from '../entities/Troop';
import { TROOP_BASE } from '../../config/gameConfig';

function overlaps(a: Troop, b: Troop): boolean {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2
  );
}

export class CombatSystem {
  update(delta: number, playerTroops: Troop[], enemyTroops: Troop[]): void {
    // Step 1: Engage any overlapping opponent (regardless of their combat state).
    // A WALKING troop always stops when it touches an opponent. If the opponent
    // is already engaged, only the new attacker changes state — the opponent
    // keeps its existing target. A symmetric enemy pass ensures a re-WALKING
    // enemy re-engages instead of walking away after its original target dies.
    for (const player of playerTroops) {
      if (player.state !== 'WALKING') continue;
      for (const enemy of enemyTroops) {
        if (enemy.state === 'DEAD') continue;
        if (overlaps(player, enemy)) {
          player.state = 'ATTACKING';
          player.currentTarget = enemy;
          if (enemy.state === 'WALKING') {
            enemy.state = 'ATTACKING';
            enemy.currentTarget = player;
          }
          break;
        }
      }
    }

    for (const enemy of enemyTroops) {
      if (enemy.state !== 'WALKING') continue;
      for (const player of playerTroops) {
        if (player.state === 'DEAD') continue;
        if (overlaps(enemy, player)) {
          enemy.state = 'ATTACKING';
          enemy.currentTarget = player;
          if (player.state === 'WALKING') {
            player.state = 'ATTACKING';
            player.currentTarget = enemy;
          }
          break;
        }
      }
    }

    // Step 2: Collect all damage to apply this tick (enables mutual kills)
    const pendingDamage = new Map<Troop, number>();
    for (const troop of [...playerTroops, ...enemyTroops]) {
      if (troop.state !== 'ATTACKING' || !troop.currentTarget) continue;
      troop.attackTimer += delta;
      if (troop.attackTimer >= TROOP_BASE.attackInterval) {
        const current = pendingDamage.get(troop.currentTarget) ?? 0;
        pendingDamage.set(troop.currentTarget, current + TROOP_BASE.damage);
        troop.attackTimer = 0;
      }
    }
    for (const [troop, damage] of pendingDamage) {
      troop.takeDamage(damage);
    }

    // Step 3: Release survivors whose target just died
    for (const troop of [...playerTroops, ...enemyTroops]) {
      if (troop.state === 'ATTACKING' && troop.currentTarget?.state === 'DEAD') {
        troop.state = 'WALKING';
        troop.currentTarget = null;
        troop.attackTimer = 0;
      }
    }
  }
}
