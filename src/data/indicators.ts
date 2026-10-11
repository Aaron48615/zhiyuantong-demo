import type { IndicatorData } from "../domain/types";
import { SCORING_YEAR, type DimensionRule } from "../domain/scoring";

// 每个实体单独生成原始指标，评分只在 scoring.ts 中计算。
export function generateIndicators(rules: DimensionRule[], entityId: string, seed: number): IndicatorData {
  let state = seed >>> 0;
  for (const char of entityId) state = (Math.imul(state, 31) + char.charCodeAt(0)) >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const data: IndicatorData = {};
  for (const rule of rules) for (const metric of rule.indicators) {
    if (data[metric.id]) continue;
    const value = metric.levels
      ? metric.levels[Math.floor(random() * metric.levels.length)].value
      : Math.round((metric.lower + (metric.upper - metric.lower) * (0.35 + random() * 0.6)) * 10) / 10;
    data[metric.id] = {
      value, year: SCORING_YEAR, unit: metric.unit, source: "simulated",
      ...(metric.minSamples ? { sampleSize: 80 + Math.floor(random() * 220) } : {}),
    };
  }
  return data;
}
