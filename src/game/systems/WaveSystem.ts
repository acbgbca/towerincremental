import type { MatchWaveConfig, TroopType, WaveSystemState } from '../types';

export type WaveSpawnCallback = (type: TroopType) => void;

export class WaveSystem {
  state: WaveSystemState = 'BREATHER';
  currentWaveIndex = 0;
  nextSpawnInMs = 0;
  nextWaveInMs = 0;

  private currentGroupIndex = 0;
  private troopsRemainingInGroup = 0;

  constructor(
    private readonly config: MatchWaveConfig,
    private readonly onSpawn: WaveSpawnCallback,
  ) {
    if (config.waves.length === 0) {
      this.state = 'DONE';
      return;
    }
    this.troopsRemainingInGroup = config.waves[0].troops[0]?.count ?? 0;
  }

  get totalWaves(): number {
    return this.config.waves.length;
  }

  get troopsRemainingInWave(): number {
    const wave = this.config.waves[this.currentWaveIndex];
    if (!wave) return 0;
    let total = this.troopsRemainingInGroup;
    for (let i = this.currentGroupIndex + 1; i < wave.troops.length; i++) {
      total += wave.troops[i].count;
    }
    return total;
  }

  update(delta: number): void {
    if (this.state === 'DONE') return;

    if (this.state === 'BREATHER') {
      this.nextWaveInMs -= delta;
      if (this.nextWaveInMs > 0) return;
      if (this.currentWaveIndex >= this.config.waves.length) {
        this.state = 'DONE';
        return;
      }
      this.state = 'SPAWNING';
      this.nextSpawnInMs = 0;
    }

    if (this.state === 'SPAWNING') {
      this.nextSpawnInMs -= delta;
      const wave = this.config.waves[this.currentWaveIndex];
      let group = wave.troops[this.currentGroupIndex];
      while (this.nextSpawnInMs <= 0 && this.troopsRemainingInGroup > 0) {
        this.onSpawn(group.type);
        this.troopsRemainingInGroup -= 1;
        this.nextSpawnInMs += group.spawnIntervalMs;
        if (this.troopsRemainingInGroup === 0 && this.currentGroupIndex + 1 < wave.troops.length) {
          this.currentGroupIndex += 1;
          group = wave.troops[this.currentGroupIndex];
          this.troopsRemainingInGroup = group.count;
          this.nextSpawnInMs = 0;
        }
      }
      if (this.troopsRemainingInGroup === 0) {
        this.state = 'BREATHER';
        this.nextWaveInMs = wave.breatherMs;
        this.currentWaveIndex += 1;
        this.currentGroupIndex = 0;
        const nextWave = this.config.waves[this.currentWaveIndex];
        this.troopsRemainingInGroup = nextWave?.troops[0]?.count ?? 0;
      }
    }
  }
}
