import type Phaser from 'phaser';
import type { GameState } from '../state/GameState';
import { MenuScreen } from './MenuScreen';

export class LaunchController {
  readonly menuScreen: MenuScreen;

  constructor(
    private game: Phaser.Game,
    gameState: GameState,
  ) {
    this.menuScreen = new MenuScreen(gameState);
  }

  start(): void {
    this.menuScreen.setContinueHandler(() => this.handleStart());
    this.menuScreen.setPrestigeHandler(() => this.handleStart());
    this.menuScreen.show();
  }

  private handleStart(): void {
    this.menuScreen.hide();
    this.game.scene.start('Match');
  }
}
