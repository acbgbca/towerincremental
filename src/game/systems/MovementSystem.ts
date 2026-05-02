import {
  AVOIDANCE_LOOK_AHEAD_X,
  AVOIDANCE_RADIUS,
  AVOIDANCE_SPEED,
  LANE_BAND,
} from '../../config/gameConfig';
import type { Troop } from '../entities/Troop';

const LANE_MIN_Y = LANE_BAND.centerY - LANE_BAND.height / 2;
const LANE_MAX_Y = LANE_BAND.centerY + LANE_BAND.height / 2;

export function applyAvoidance(troops: Troop[], delta: number): void {
  const dt = delta / 1000;

  for (const t of troops) {
    if (t.state !== 'WALKING') continue;

    let lateral = 0;

    for (const f of troops) {
      if (f === t) continue;
      if (f.state === 'DEAD') continue;

      const ahead = t.direction === 1 ? f.x > t.x : f.x < t.x;
      if (!ahead) continue;

      const dx = f.x - t.x;
      if (Math.abs(dx) > AVOIDANCE_LOOK_AHEAD_X) continue;

      const dy = f.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist > AVOIDANCE_RADIUS) continue;

      const strength = 1 - dist / AVOIDANCE_RADIUS;
      const diff = t.y - f.y;
      const side = diff !== 0 ? Math.sign(diff) : (t.id % 2 === 0 ? 1 : -1);

      lateral += side * strength * AVOIDANCE_SPEED * dt;
    }

    if (lateral !== 0) {
      const next = t.y + lateral;
      t.y = Math.max(LANE_MIN_Y, Math.min(LANE_MAX_Y, next));
    }
  }
}
