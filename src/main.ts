import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { MatchScene, setSharedMenuScreen } from './game/scenes/MatchScene';
import { BOARD_WIDTH, BOARD_HEIGHT } from './config/gameConfig';
import { createDebugSpawnButtons } from './ui/DebugSpawnButtons';
import { LaunchController } from './ui/LaunchController';
import { load as loadSave } from './state/SaveStore';
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
  scene: [BootScene, MatchScene],
};

const game = new Phaser.Game(config);
createDebugSpawnButtons();

if (import.meta.env.DEV || window.location.search.includes('test')) {
  (window as unknown as Record<string, unknown>)['__game__'] = game;
}

if (!window.location.search.includes('test')) {
  const gameState = loadSave();
  const launch = new LaunchController(game, gameState);
  setSharedMenuScreen(launch.menuScreen);
  launch.start();
}
