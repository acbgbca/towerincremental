import type { MatchState } from '../types';
import { INCOME_RATE } from '../../config/gameConfig';

export class IncomeSystem {
  constructor(private state: MatchState) {}

  update(delta: number): void {
    this.state.money += INCOME_RATE * (delta / 1000);
  }
}
