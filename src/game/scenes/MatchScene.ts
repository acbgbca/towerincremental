import Phaser from 'phaser';
import { FIELD } from '../../render/palette';
import { BOARD_WIDTH, BOARD_HEIGHT, TOWER_MARGIN, TOWER_WIDTH } from '../../config/gameConfig';
import { Troop } from '../entities/Troop';
import { Tower } from '../entities/Tower';
import { CombatSystem } from '../systems/CombatSystem';
import { MatchResultOverlay } from '../../ui/MatchResultOverlay';
import type { TroopType, MatchResult } from '../types';

export class MatchScene extends Phaser.Scene {
  playerTroops: Troop[] = [];
  enemyTroops: Troop[] = [];
  playerTower!: Tower;
  enemyTower!: Tower;
  private combatSystem = new CombatSystem();
  private overlay!: MatchResultOverlay;
  private matchEnded = false;

  constructor() {
    super({ key: 'Match' });
  }

  create(): void {
    this.add.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, BOARD_WIDTH, BOARD_HEIGHT, FIELD);
    this.playerTower = new Tower(this, 'player');
    this.enemyTower = new Tower(this, 'enemy');
    this.overlay = new MatchResultOverlay(() => this.resetMatch());
    this.matchEnded = false;
  }

  spawnTroop(side: 'player' | 'enemy', type: TroopType): void {
    if (this.matchEnded) return;
    const x =
      side === 'player'
        ? TOWER_MARGIN + TOWER_WIDTH
        : BOARD_WIDTH - TOWER_MARGIN - TOWER_WIDTH;
    const y = BOARD_HEIGHT / 2;
    const troop = new Troop(this, side, type, x, y);
    if (side === 'player') {
      this.playerTroops.push(troop);
    } else {
      this.enemyTroops.push(troop);
    }
  }

  update(_time: number, delta: number): void {
    if (this.matchEnded) return;

    this.playerTroops.forEach((t) => t.update(delta));
    this.enemyTroops.forEach((t) => t.update(delta));

    this.combatSystem.update(delta, this.playerTroops, this.enemyTroops, this.playerTower, this.enemyTower);

    this.playerTroops = this.cleanupTroops(this.playerTroops);
    this.enemyTroops = this.cleanupTroops(this.enemyTroops);

    if (!this.playerTower.isAlive()) {
      this.endMatch('enemy');
    } else if (!this.enemyTower.isAlive()) {
      this.endMatch('player');
    }
  }

  resetMatch(): void {
    this.playerTroops.forEach((t) => t.destroy());
    this.enemyTroops.forEach((t) => t.destroy());
    this.playerTroops = [];
    this.enemyTroops = [];
    this.playerTower.resetHp();
    this.enemyTower.resetHp();
    this.matchEnded = false;
  }

  private endMatch(winner: 'player' | 'enemy'): void {
    this.matchEnded = true;
    const result: MatchResult = { winner };
    this.events.emit('match:end', result);
    this.overlay.show(winner);
  }

  private cleanupTroops(troops: Troop[]): Troop[] {
    return troops.filter((t) => {
      if (t.state === 'DEAD' || t.isOutOfBounds()) {
        t.destroy();
        return false;
      }
      return true;
    });
  }
}
