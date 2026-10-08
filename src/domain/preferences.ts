import { WEIGHT_FIELDS } from "./config";
import type { Weights } from "./types";

// 输入保留独立档位，只有参与计算的项目才换算为百分比；计算不取整。
export function normalizePreferences(
  preferences: Weights,
  advancedEnabled: boolean,
): Weights {
  const active = WEIGHT_FIELDS.slice(0, advancedEnabled ? 9 : 5);
  const total = active.reduce((sum, { key }) => sum + preferences[key], 0);
  return Object.fromEntries(
    WEIGHT_FIELDS.map(({ key }, index) => [
      key,
      total > 0 && (advancedEnabled || index < 5)
        ? (preferences[key] / total) * 100
        : 0,
    ]),
  ) as Weights;
}
