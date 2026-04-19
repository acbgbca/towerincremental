import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { BOARD_WIDTH, BOARD_HEIGHT } from './config/gameConfig';
import './styles.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV || window.location.search.includes('test')) {
  (window as unknown as Record<string, unknown>)['__game__'] = game;
}
