import type Phaser from 'phaser';
import type { GameState } from '../state/GameState';
import { MenuScreen } from './MenuScreen';
import { SettingsScreen } from './SettingsScreen';

export class LaunchController {
  readonly menuScreen: MenuScreen;
  readonly settingsScreen: SettingsScreen;

  constructor(
    private game: Phaser.Game,
    gameState: GameState,
  ) {
    this.menuScreen = new MenuScreen(gameState);
    this.settingsScreen = new SettingsScreen(gameState);
  }

  start(): void {
    this.menuScreen.setContinueHandler(() => this.handleStart());
    this.menuScreen.setPrestigeHandler(() => this.handleStart());
    this.menuScreen.setSettingsHandler(() => this.settingsScreen.show());
    this.settingsScreen.setBackHandler(() => this.menuScreen.show());
    this.menuScreen.show();
  }

  private handleStart(): void {
    this.menuScreen.hide();
    this.game.scene.start('Match');
  }
}
