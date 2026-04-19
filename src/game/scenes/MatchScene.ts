import Phaser from 'phaser';
import { FIELD } from '../../render/palette';
import { drawTower } from '../../render/shapes';
import { BOARD_WIDTH, BOARD_HEIGHT, TOWER_MARGIN, TOWER_WIDTH } from '../../config/gameConfig';
import { Troop } from '../entities/Troop';
import type { TroopType } from '../types';

export class MatchScene extends Phaser.Scene {
  playerTroops: Troop[] = [];
  enemyTroops: Troop[] = [];

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
    this.playerTroops = this.updateTroops(this.playerTroops, delta);
    this.enemyTroops = this.updateTroops(this.enemyTroops, delta);
  }

  private updateTroops(troops: Troop[], delta: number): Troop[] {
    return troops.filter((troop) => {
      troop.update(delta);
      if (troop.isOutOfBounds()) {
        troop.destroy();
        return false;
      }
      return true;
    });
  }
}
