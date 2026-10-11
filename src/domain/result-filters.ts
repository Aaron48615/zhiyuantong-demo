import { MAJOR_DIMENSIONS, SCHOOL_DIMENSIONS } from "./config";
import type { Recommendation, Risk } from "./types";
import { compareScoresDescending, isScore } from "./scoring";

export const SCORE_FILTER_DIMENSIONS = [
  ...SCHOOL_DIMENSIONS.map((label, index) => ({
    key: `school-${index}`, label: `学校 · ${label}`, scope: "school" as const, index,
  })),
  ...MAJOR_DIMENSIONS.map((label, index) => ({
    key: `major-${index}`, label: `专业 · ${label}`, scope: "major" as const, index,
  })),
];

export function scoreFilterError(dimension: string, minimum: number | string): string {
  if (!dimension) return "";
  if (!SCORE_FILTER_DIMENSIONS.some((item) => item.key === dimension))
    return "请选择有效的学校或专业维度。";
  if (typeof minimum !== "number" || !Number.isInteger(minimum) || minimum < 0 || minimum > 100)
    return "最低分需要是 0—100 的整数。";
  return "";
}

export function sortResults(items: Recommendation[], order: string): Recommendation[] {
  return [...items].sort((a, b) => {
    if (order === "cost") return a.major.tuition + a.major.livingCost - b.major.tuition - b.major.livingCost || a.id.localeCompare(b.id);
    const dimension = SCORE_FILTER_DIMENSIONS.find((item) => item.key === order);
    return (dimension
      ? compareScoresDescending(a[dimension.scope].scores[dimension.index], b[dimension.scope].scores[dimension.index])
      : compareScoresDescending(a.score, b.score)) || a.id.localeCompare(b.id);
  });
}

export function filterResults(
  items: Recommendation[],
  filters: { query: string; risk: Risk | "全部"; dimension: string; minimum: number | string },
): Recommendation[] {
  if (scoreFilterError(filters.dimension, filters.minimum)) return [];
  const dimension = SCORE_FILTER_DIMENSIONS.find((item) => item.key === filters.dimension);
  const query = filters.query.trim();
  return items.filter((item) => {
    if (!`${item.school.name}${item.major.name}${item.school.city}`.includes(query)) return false;
    if (filters.risk !== "全部" && item.risk !== filters.risk) return false;
    if (!dimension) return true;
    const score = item[dimension.scope].scores[dimension.index];
    // 缺失值不能当作 0，也不能通过已启用的分数条件。
    return isScore(score) && score >= Number(filters.minimum);
  });
}
