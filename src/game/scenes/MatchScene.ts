import Phaser from 'phaser';
import { FIELD } from '../../render/palette';
import { BOARD_WIDTH, BOARD_HEIGHT, TOWER_MARGIN, TOWER_WIDTH, TROOP_BASE, ENEMY_LEVEL_STAT_STEP, INCOME_RATE, TOWER, effectivePlayerStats } from '../../config/gameConfig';
import { LEVEL_1_WAVES, EMPTY_WAVES } from '../../config/enemyWaves';
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
import type { TroopType, TroopStats, MatchResult, MatchState, MatchWaveConfig } from '../types';

export class MatchScene extends Phaser.Scene {
  playerTroops: Troop[] = [];
  enemyTroops: Troop[] = [];
  playerTower!: Tower;
  enemyTower!: Tower;
  matchState: MatchState = { money: 0, troopsDefeated: 0, towerDamageDealt: 0 };
  waveSystem!: WaveSystem;
  private gameState!: GameState;
  private enemyStats!: TroopStats;
  private playerStats!: TroopStats;
  private waveConfig: MatchWaveConfig = LEVEL_1_WAVES;
  private combatSystem = new CombatSystem();
  incomeSystem!: IncomeSystem;
  private overlay!: UpgradeScreen;
  private matchEnded = false;

  constructor() {
    super({ key: 'Match' });
  }

  create(): void {
    this.gameState = loadSave();
    this.enemyStats = this.computeEnemyStats();
    this.playerStats = effectivePlayerStats(this.gameState.prestigeTier);

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
    this.waveConfig = window.location.search.includes('test') ? EMPTY_WAVES : LEVEL_1_WAVES;
    this.waveSystem = this.buildWaveSystem();
    new Hud(
      this.matchState,
      this.gameState,
      () => {
        if (this.matchState.money >= TROOP_BASE.cost) {
          this.matchState.money -= TROOP_BASE.cost;
          this.spawnTroop('player', 'base');
        }
      },
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
    const stats = side === 'enemy' ? this.enemyStats : this.playerStats;
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
    this.matchState.troopsDefeated = 0;
    this.matchState.towerDamageDealt = 0;
    this.matchEnded = false;
    this.incomeSystem = new IncomeSystem(this.matchState, incomeRate);
    this.enemyStats = this.computeEnemyStats();
    this.playerStats = effectivePlayerStats(this.gameState.prestigeTier);
    this.waveSystem = this.buildWaveSystem();
  }

  private computeEnemyStats(): TroopStats {
    const level = this.gameState.enemyLevel;
    return {
      ...TROOP_BASE,
      hp: TROOP_BASE.hp + (level - 1) * ENEMY_LEVEL_STAT_STEP.hp,
      damage: TROOP_BASE.damage + (level - 1) * ENEMY_LEVEL_STAT_STEP.damage,
    };
  }

  private buildWaveSystem(): WaveSystem {
    return new WaveSystem(this.waveConfig, () => this.spawnTroop('enemy', 'base'));
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
