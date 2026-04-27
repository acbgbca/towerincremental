import Phaser from 'phaser';
import { FIELD } from '../../render/palette';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TOWER_MARGIN,
  TOWER_WIDTH,
  INCOME_RATE,
  TOWER,
  effectivePlayerStats,
  effectiveEnemyStats,
} from '../../config/gameConfig';
import { TROOP_TYPES } from '../../config/troopTypes';
import { wavesForLevel, EMPTY_WAVES } from '../../config/enemyWaves';
import { Troop } from '../entities/Troop';
import { Tower } from '../entities/Tower';
import { CombatSystem } from '../systems/CombatSystem';
import { IncomeSystem } from '../systems/IncomeSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { computeReward } from '../systems/RewardSystem';
import { UpgradeScreen } from '../../ui/UpgradeScreen';
import { Hud } from '../../ui/Hud';
import { UPGRADES, effectiveValue } from '../../config/upgradeConfig';
import { load as loadSave, save as persistSave } from '../../state/SaveStore';
import type { GameState } from '../../state/GameState';
import type { TroopType, MatchResult, MatchState, MatchWaveConfig } from '../types';

export class MatchScene extends Phaser.Scene {
  playerTroops: Troop[] = [];
  enemyTroops: Troop[] = [];
  playerTower!: Tower;
  enemyTower!: Tower;
  matchState: MatchState = { money: 0, troopDamageDealt: 0, towerDamageDealt: 0 };
  waveSystem!: WaveSystem;
  gameState!: GameState;
  private waveConfig: MatchWaveConfig = EMPTY_WAVES;
  private combatSystem = new CombatSystem();
  incomeSystem!: IncomeSystem;
  private overlay!: UpgradeScreen;
  private hud!: Hud;
  private matchEnded = false;

  constructor() {
    super({ key: 'Match' });
  }

  create(): void {
    this.gameState = loadSave();

    this.add.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT / 2, BOARD_WIDTH, BOARD_HEIGHT, FIELD);
    const playerMaxHp = effectiveValue(UPGRADES[1], TOWER.maxHp, this.gameState.upgrades.towerMaxHp);
    const incomeRate  = effectiveValue(UPGRADES[0], INCOME_RATE, this.gameState.upgrades.incomeRate);
    this.playerTower = new Tower(this, 'player', playerMaxHp);
    this.enemyTower = new Tower(this, 'enemy');
    this.overlay = new UpgradeScreen(
      this.gameState,
      () => this.resetMatch(),
      () => this.resetMatch(),
    );
    this.incomeSystem = new IncomeSystem(this.matchState, incomeRate);
    this.waveConfig = window.location.search.includes('test')
      ? EMPTY_WAVES
      : wavesForLevel(this.gameState.enemyLevel);
    this.waveSystem = this.buildWaveSystem();
    this.hud = new Hud(
      this.matchState,
      this.gameState,
      (type) => this.handleHudSpawn(type),
      () => this.waveSystem,
    );
    this.matchEnded = false;
  }

  spawnTroop(side: 'player' | 'enemy', type: TroopType): void {
    if (this.matchEnded) return;
    const x =
      side === 'player'
        ? TOWER_MARGIN + TOWER_WIDTH
        : BOARD_WIDTH - TOWER_MARGIN - TOWER_WIDTH;
    const y = BOARD_HEIGHT / 2;
    const stats =
      side === 'enemy'
        ? effectiveEnemyStats(type, this.gameState.enemyLevel)
        : effectivePlayerStats(type, this.gameState.prestigeTier);
    const troop = new Troop(this, side, type, x, y, stats);
    if (side === 'player') {
      this.playerTroops.push(troop);
    } else {
      this.enemyTroops.push(troop);
    }
  }

  update(_time: number, delta: number): void {
    if (this.matchEnded) return;

    this.incomeSystem.update(delta);
    this.waveSystem.update(delta);
    this.playerTroops.forEach((t) => t.update(delta));
    this.enemyTroops.forEach((t) => t.update(delta));

    this.combatSystem.update(delta, this.playerTroops, this.enemyTroops, this.playerTower, this.enemyTower, this.matchState);

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
    const playerMaxHp = effectiveValue(UPGRADES[1], TOWER.maxHp, this.gameState.upgrades.towerMaxHp);
    const incomeRate  = effectiveValue(UPGRADES[0], INCOME_RATE, this.gameState.upgrades.incomeRate);
    this.playerTower.resetHp(playerMaxHp);
    this.enemyTower.resetHp();
    this.matchState.money = 0;
    this.matchState.troopDamageDealt = 0;
    this.matchState.towerDamageDealt = 0;
    this.matchEnded = false;
    this.incomeSystem = new IncomeSystem(this.matchState, incomeRate);
    this.waveConfig = window.location.search.includes('test')
      ? EMPTY_WAVES
      : wavesForLevel(this.gameState.enemyLevel);
    this.waveSystem = this.buildWaveSystem();
    this.hud?.refreshSpawnButtons();
  }

  private handleHudSpawn(type: TroopType): void {
    const cost = TROOP_TYPES[type].cost;
    if (this.matchState.money < cost) return;
    this.matchState.money -= cost;
    this.spawnTroop('player', type);
  }

  private buildWaveSystem(): WaveSystem {
    return new WaveSystem(this.waveConfig, (type) => this.spawnTroop('enemy', type));
  }

  private endMatch(winner: 'player' | 'enemy'): void {
    this.matchEnded = true;
    const result: MatchResult = { winner };
    const reward = computeReward(this.matchState, result);
    this.gameState.money += reward;
    if (winner === 'player') {
      this.gameState.enemyLevel += 1;
    }
    persistSave(this.gameState);
    this.events.emit('match:end', result);
    this.overlay.show(winner, reward);
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
