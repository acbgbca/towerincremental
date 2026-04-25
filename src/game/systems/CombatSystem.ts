import type { Troop } from '../entities/Troop';
import type { Tower } from '../entities/Tower';
import type { Damageable, MatchState } from '../types';
import { TOWER } from '../../config/gameConfig';

function overlaps(a: Troop, b: Troop): boolean {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2
  );
}

function atTower(troop: Troop, tower: Tower, direction: 1 | -1): boolean {
  if (direction === 1) {
    return troop.x + troop.width / 2 + TOWER.attackTargetingMargin >= tower.x - tower.width / 2;
  } else {
    return troop.x - troop.width / 2 - TOWER.attackTargetingMargin <= tower.x + tower.width / 2;
  }
}

export class CombatSystem {
  update(delta: number, playerTroops: Troop[], enemyTroops: Troop[], playerTower: Tower, enemyTower: Tower, matchState: MatchState): void {
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

    // Step 1b: Tower targeting — walking troops that reach the opposing tower
    if (enemyTower.isAlive()) {
      for (const player of playerTroops) {
        if (player.state !== 'WALKING') continue;
        if (atTower(player, enemyTower, 1)) {
          player.state = 'ATTACKING';
          player.currentTarget = enemyTower;
        }
      }
    }

    if (playerTower.isAlive()) {
      for (const enemy of enemyTroops) {
        if (enemy.state !== 'WALKING') continue;
        if (atTower(enemy, playerTower, -1)) {
          enemy.state = 'ATTACKING';
          enemy.currentTarget = playerTower;
        }
      }
    }

    // Step 2: Collect all damage to apply this tick (enables mutual kills)
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
      const wasAlive = target.isAlive();
      target.takeDamage(damage);
      if (playerAttacks.has(target)) {
        if (target === enemyTower) {
          matchState.towerDamageDealt += damage;
        } else if (wasAlive && !target.isAlive() && enemyTroopSet.has(target)) {
          matchState.troopsDefeated++;
        }
      }
    }

    // Step 3: Release survivors whose target just died
    for (const troop of [...playerTroops, ...enemyTroops]) {
      if (troop.state === 'ATTACKING' && troop.currentTarget && !troop.currentTarget.isAlive()) {
        troop.state = 'WALKING';
        troop.currentTarget = null;
        troop.attackTimer = 0;
      }
    }
  }
}
