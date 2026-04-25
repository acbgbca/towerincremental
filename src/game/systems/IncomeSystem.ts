import type { MatchState } from '../types';

export class IncomeSystem {
  constructor(private state: MatchState, readonly rate: number) {}

  update(delta: number): void {
    this.state.money += this.rate * (delta / 1000);
  }
}
