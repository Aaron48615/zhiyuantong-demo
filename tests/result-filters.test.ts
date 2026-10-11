import { describe, expect, it } from "vitest";
import { createDefaultProfile } from "../src/domain/config";
import { dataset } from "../src/data/generate";
import { recommend } from "../src/domain/recommend";
import { filterResults, SCORE_FILTER_DIMENSIONS, scoreFilterError } from "../src/domain/result-filters";
import { isScore } from "../src/domain/scoring";

const items = recommend(dataset, createDefaultProfile());
const base = { query: "", risk: "全部" as const, dimension: "", minimum: 80 };

describe("维度最低分筛选", () => {
  it("未启用时不限制结果，也不改写原数组", () => {
    const order = items.map((item) => item.id);
    const result = filterResults(items, { ...base, minimum: "" });
    expect(result).toEqual(items);
    expect(result).not.toBe(items);
    result.reverse();
    expect(items.map((item) => item.id)).toEqual(order);
  });
  it("十四个维度都使用对应实体的分数，保留达到整数阈值的结果", () => {
    expect(SCORE_FILTER_DIMENSIONS).toHaveLength(14);
    for (const dimension of SCORE_FILTER_DIMENSIONS) {
      const minimum = Math.floor(items[0][dimension.scope].scores[dimension.index]!);
      const result = filterResults(items, { ...base, dimension: dimension.key, minimum });
      expect(result).toContain(items[0]);
      expect(result.map((item) => item.id)).toEqual(items
        .filter((item) => isScore(item[dimension.scope].scores[dimension.index]) && item[dimension.scope].scores[dimension.index]! >= minimum)
        .map((item) => item.id));
    }
  });
  it("搜索、风险和分数条件同时生效，100分允许空结果，清除后恢复", () => {
    const expected = items[0];
    const filters = { ...base, dimension: "major-0", minimum: Math.floor(expected.major.scores[0]!),
      risk: expected.risk, query: ` ${expected.school.name} ` };
    const result = filterResults(items, filters);
    expect(result).toContain(expected);
    expect(result.every((item) => item.school.name.includes(expected.school.name)
      && item.risk === expected.risk && item.major.scores[0]! >= filters.minimum)).toBe(true);
    expect(filterResults(items, { ...base, dimension: "major-0", minimum: 100 }).every((item) => item.major.scores[0] === 100)).toBe(true);
    expect(filterResults(items, base)).toHaveLength(items.length);
  });
  it("拒绝空白、小数、越界或未知维度，缺失和无效分数不通过", () => {
    for (const minimum of ["", -1, 101, 79.5, NaN, Infinity]) {
      expect(scoreFilterError("school-0", minimum)).not.toBe("");
      expect(filterResults(items, { ...base, dimension: "school-0", minimum })).toEqual([]);
    }
    expect(scoreFilterError("school-99", 80)).not.toBe("");
    expect(scoreFilterError("school-0", 0)).toBe("");
    expect(scoreFilterError("school-0", 100)).toBe("");
    const incomplete = [[], [NaN], [Infinity], [-1], [101]].map((scores) => ({ ...items[0], school: { ...items[0].school, scores } }));
    expect(filterResults(incomplete, { ...base, dimension: "school-0", minimum: 0 })).toEqual([]);
  });
});
