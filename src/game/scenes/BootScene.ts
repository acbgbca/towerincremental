import Phaser from 'phaser';
import { FIELD } from '../../render/palette';
import { drawTower } from '../../render/shapes';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../../config/gameConfig';

export class BootScene extends Phaser.Scene {
  playerTower!: Phaser.GameObjects.Rectangle;
  enemyTower!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.add.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, BOARD_WIDTH, BOARD_HEIGHT, FIELD);
    this.playerTower = drawTower(this, 'player');
    this.enemyTower = drawTower(this, 'enemy');
    if (window.location.search.includes('test')) {
      this.scene.start('Match');
    }
  }
}
