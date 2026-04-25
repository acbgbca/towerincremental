import { describe, it, expect } from 'vitest';
import { UPGRADES, nextCost, effectiveValue } from '../../src/config/upgradeConfig';

const incomeRateDef = UPGRADES.find((u) => u.id === 'incomeRate')!;
const towerMaxHpDef = UPGRADES.find((u) => u.id === 'towerMaxHp')!;

describe('nextCost', () => {
  it('at tier 0 equals baseCost', () => {
    expect(nextCost(incomeRateDef, 0)).toBe(incomeRateDef.baseCost);
    expect(nextCost(towerMaxHpDef, 0)).toBe(towerMaxHpDef.baseCost);
  });

  it('grows multiplicatively at tier 1', () => {
    expect(nextCost(incomeRateDef, 1)).toBe(Math.floor(incomeRateDef.baseCost * incomeRateDef.growth));
  });

  it('grows correctly at tier 5', () => {
    expect(nextCost(incomeRateDef, 5)).toBe(
      Math.floor(incomeRateDef.baseCost * Math.pow(incomeRateDef.growth, 5)),
    );
  });

  it('grows correctly at tier 10', () => {
    expect(nextCost(towerMaxHpDef, 10)).toBe(
      Math.floor(towerMaxHpDef.baseCost * Math.pow(towerMaxHpDef.growth, 10)),
    );
  });

  it('cost strictly increases with each tier', () => {
    for (let t = 0; t < 9; t++) {
      expect(nextCost(incomeRateDef, t + 1)).toBeGreaterThan(nextCost(incomeRateDef, t));
    }
  });
});

describe('effectiveValue', () => {
  it('at tier 0 equals base value', () => {
    expect(effectiveValue(incomeRateDef, 10, 0)).toBe(10);
    expect(effectiveValue(towerMaxHpDef, 500, 0)).toBe(500);
  });

  it('at tier N equals base + N * perTierDelta', () => {
    expect(effectiveValue(incomeRateDef, 10, 3)).toBe(10 + 3 * incomeRateDef.perTierDelta);
    expect(effectiveValue(towerMaxHpDef, 500, 5)).toBe(500 + 5 * towerMaxHpDef.perTierDelta);
  });
});
