import type { MatchWaveConfig, WaveSystemState } from '../types';

export type WaveSpawnCallback = () => void;

export class WaveSystem {
  state: WaveSystemState = 'BREATHER';
  currentWaveIndex = 0;
  nextSpawnInMs = 0;
  nextWaveInMs = 0;
  troopsRemainingInWave = 0;

  constructor(
    private readonly config: MatchWaveConfig,
    private readonly onSpawn: WaveSpawnCallback,
  ) {
    if (config.waves.length === 0) {
      this.state = 'DONE';
      return;
    }
    this.troopsRemainingInWave = config.waves[0].troops[0]?.count ?? 0;
  }

  get totalWaves(): number {
    return this.config.waves.length;
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
      const interval = wave.troops[0].spawnIntervalMs;
      while (this.nextSpawnInMs <= 0 && this.troopsRemainingInWave > 0) {
        this.onSpawn();
        this.troopsRemainingInWave -= 1;
        this.nextSpawnInMs += interval;
      }
      if (this.troopsRemainingInWave === 0) {
        this.state = 'BREATHER';
        this.nextWaveInMs = wave.breatherMs;
        this.currentWaveIndex += 1;
        const nextWave = this.config.waves[this.currentWaveIndex];
        this.troopsRemainingInWave = nextWave?.troops[0]?.count ?? 0;
      }
    }
  }
}
