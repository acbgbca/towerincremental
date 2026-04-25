import { describe, it, expect, vi } from 'vitest';
import { WaveSystem } from '../../src/game/systems/WaveSystem';
import type { MatchWaveConfig } from '../../src/game/types';

const SIMPLE_CONFIG: MatchWaveConfig = {
  waves: [
    { troops: [{ type: 'base', count: 2, spawnIntervalMs: 100 }], breatherMs: 500 },
    { troops: [{ type: 'base', count: 3, spawnIntervalMs: 100 }], breatherMs: 0 },
  ],
};

function tick(ws: WaveSystem, totalMs: number, stepMs = 16): void {
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    ws.update(step);
    remaining -= step;
  }
}

describe('WaveSystem', () => {
  it('starts in BREATHER and immediately enters SPAWNING on first update', () => {
    const onSpawn = vi.fn();
    const ws = new WaveSystem(SIMPLE_CONFIG, onSpawn);
    expect(ws.state).toBe('BREATHER');
    expect(ws.currentWaveIndex).toBe(0);

    ws.update(16);
    expect(ws.state).toBe('SPAWNING');
  });

  it('spawns the configured number of troops on the configured interval', () => {
    const onSpawn = vi.fn();
    const ws = new WaveSystem(SIMPLE_CONFIG, onSpawn);

    tick(ws, 250);
    expect(onSpawn).toHaveBeenCalledTimes(2);
  });

  it('transitions through all waves and ends in DONE', () => {
    const onSpawn = vi.fn();
    const ws = new WaveSystem(SIMPLE_CONFIG, onSpawn);

    // Wave 1: 200ms spawning + 500ms breather = 700ms
    // Wave 2: 300ms spawning + 0ms breather   = 300ms
    // Total ≈ 1000ms; advance further to ensure DONE transition
    tick(ws, 2000);

    expect(ws.state).toBe('DONE');
    expect(onSpawn).toHaveBeenCalledTimes(2 + 3);
  });

  it('honours breather between waves', () => {
    const onSpawn = vi.fn();
    const ws = new WaveSystem(SIMPLE_CONFIG, onSpawn);

    tick(ws, 250);
    expect(onSpawn).toHaveBeenCalledTimes(2);
    expect(ws.state).toBe('BREATHER');
    expect(ws.currentWaveIndex).toBe(1);
    expect(ws.nextWaveInMs).toBeGreaterThan(0);

    // Mid-breather: still BREATHER, no new spawns
    tick(ws, 200);
    expect(onSpawn).toHaveBeenCalledTimes(2);
    expect(ws.state).toBe('BREATHER');
  });

  it('reports totalWaves from the config', () => {
    const ws = new WaveSystem(SIMPLE_CONFIG, () => {});
    expect(ws.totalWaves).toBe(2);
  });

  it('with empty waves config, starts in DONE and never spawns', () => {
    const onSpawn = vi.fn();
    const ws = new WaveSystem({ waves: [] }, onSpawn);
    expect(ws.state).toBe('DONE');

    tick(ws, 1000);
    expect(onSpawn).not.toHaveBeenCalled();
    expect(ws.state).toBe('DONE');
  });
});
