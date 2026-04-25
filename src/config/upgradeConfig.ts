export interface UpgradeDef {
  id: 'incomeRate' | 'towerMaxHp';
  label: string;
  baseCost: number;
  growth: number;
  perTierDelta: number;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'incomeRate',  label: 'Income Rate',  baseCost: 50,  growth: 1.5, perTierDelta: 2   },
  { id: 'towerMaxHp', label: 'Tower Max HP', baseCost: 75,  growth: 1.6, perTierDelta: 100 },
];

export function nextCost(def: UpgradeDef, currentTier: number): number {
  return Math.floor(def.baseCost * Math.pow(def.growth, currentTier));
}

export function effectiveValue(def: UpgradeDef, base: number, currentTier: number): number {
  return base + def.perTierDelta * currentTier;
}
