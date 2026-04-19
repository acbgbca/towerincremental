import Phaser from 'phaser';
import { FIELD } from '../../render/palette';
import { drawTower } from '../../render/shapes';
import { BOARD_WIDTH, BOARD_HEIGHT, TOWER_MARGIN, TOWER_WIDTH } from '../../config/gameConfig';
import { Troop } from '../entities/Troop';
import { CombatSystem } from '../systems/CombatSystem';
import type { TroopType } from '../types';

export class MatchScene extends Phaser.Scene {
  playerTroops: Troop[] = [];
  enemyTroops: Troop[] = [];
  private combatSystem = new CombatSystem();

  constructor() {
    super({ key: 'Match' });
  }

  create(): void {
    this.add.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, BOARD_WIDTH, BOARD_HEIGHT, FIELD);
    drawTower(this, 'player');
    drawTower(this, 'enemy');
  }

  spawnTroop(side: 'player' | 'enemy', type: TroopType): void {
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
    this.playerTroops.forEach((t) => t.update(delta));
    this.enemyTroops.forEach((t) => t.update(delta));

    this.combatSystem.update(delta, this.playerTroops, this.enemyTroops);

    this.playerTroops = this.cleanupTroops(this.playerTroops);
    this.enemyTroops = this.cleanupTroops(this.enemyTroops);
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
