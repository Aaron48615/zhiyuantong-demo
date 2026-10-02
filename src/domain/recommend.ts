import distribution from "../data/score-distribution-2026.json";
import { SUBJECTS, WEIGHT_FIELDS } from "./config";
import type {
  Dataset,
  Major,
  Profile,
  Recommendation,
  Risk,
  Weights,
} from "./types";

export function rankForScore(score: number) {
  const row = distribution.rows.find(
    (item) => item.score === score || (item.topCoded && score >= item.score),
  );
  return row
    ? { start: row.cumulative - row.count + 1, end: row.cumulative }
    : null;
}

export function validateProfile(input: unknown): string[] {
  if (!input || typeof input !== "object") return ["考生信息格式无效"];
  const p = input as Profile;
  const errors: string[] = [];
  if (p.province !== "上海" || p.year !== 2026)
    errors.push("当前仅支持上海 2026 年普通本科演示");
  if (!Number.isInteger(p.score) || p.score < 0 || p.score > 660)
    errors.push("高考总分须为 0—660 的整数");
  if (
    p.rank !== null &&
    (!Number.isInteger(p.rank) || p.rank < 1 || p.rank > 100000)
  )
    errors.push("位次须为 1—100000 的整数，或留空");
  if (
    !Array.isArray(p.subjects) ||
    new Set(p.subjects).size !== 3 ||
    p.subjects.length !== 3 ||
    p.subjects.some((s) => !SUBJECTS.includes(s))
  )
    errors.push("请选择三门不同的选考科目");
  if (
    !Array.isArray(p.regions) ||
    p.regions.length > 10 ||
    p.regions.some((s) => typeof s !== "string" || s.length > 20)
  )
    errors.push("地域偏好格式无效");
  if (
    !Array.isArray(p.majorNames) ||
    p.majorNames.length > 20 ||
    p.majorNames.some((s) => typeof s !== "string" || s.length > 50)
  )
    errors.push("专业偏好格式无效");
  if (!["不限", "一线城市", "区域中心城市", "其他城市"].includes(p.cityTier))
    errors.push("城市类别无效");
  if (!Number.isFinite(p.budget) || p.budget < 5000 || p.budget > 200000)
    errors.push("年度费用预算须在 5000—200000 元之间");
  const weights = p.weights;
  if (
    !weights ||
    WEIGHT_FIELDS.some(
      ({ key }) =>
        !Number.isFinite(weights[key]) ||
        weights[key] < 0 ||
        weights[key] > 100,
    )
  )
    errors.push("每项偏好权重须在 0—100 之间");
  else if (
    Math.abs(
      WEIGHT_FIELDS.reduce((sum, { key }) => sum + weights[key], 0) - 100,
    ) > 0.01
  )
    errors.push("九项偏好权重之和须为 100%");
  return errors;
}

// 修改一项后，将剩余权重按原比例分配；用最大余数法保证整数总和正好是 100。
export function updateWeight(
  weights: Weights,
  key: keyof Weights,
  input: number,
): Weights {
  const value = Math.max(
    0,
    Math.min(100, Math.round(Number.isFinite(input) ? input : 0)),
  );
  const others = WEIGHT_FIELDS.map((f) => f.key).filter((k) => k !== key);
  const total = others.reduce((sum, k) => sum + weights[k], 0);
  const parts = others.map((k) => ({
    key: k,
    exact: (100 - value) * (total ? weights[k] / total : 1 / others.length),
  }));
  const result = { ...weights, [key]: value };
  parts.forEach((part) => {
    result[part.key] = Math.floor(part.exact);
  });
  let remaining =
    100 - value - parts.reduce((sum, part) => sum + result[part.key], 0);
  parts
    .sort((a, b) => (b.exact % 1) - (a.exact % 1))
    .forEach((part) => {
      if (remaining-- > 0) result[part.key]++;
    });
  return result;
}

export function assessRisk(
  major: Major,
  profile: Profile,
): { risk: Risk; reason: string } {
  const rank = profile.rank ?? rankForScore(profile.score)?.end;
  const history = major.history
    .filter((item) => item.year < profile.year && item.minRank > 0)
    .sort((a, b) => a.minRank - b.minRank);
  if (!rank || history.length < 3)
    return {
      risk: "数据不足",
      reason: "缺少考生位次或前三年可比数据，暂不评估。",
    };
  const reference = history[Math.floor(history.length / 2)].minRank;
  const ratio = rank / reference;
  const risk = ratio <= 0.85 ? "保" : ratio <= 1.05 ? "稳" : "冲";
  return {
    risk,
    reason: `以${profile.rank ? "填写的" : "同分区间末位"}位次 ${rank.toLocaleString("zh-CN")}，对照前三年模拟专业录取位次中位数 ${reference.toLocaleString("zh-CN")}；比值 ${ratio.toFixed(2)}。≤0.85 为保，≤1.05 为稳，其余为冲。这是演示分档规则，不代表真实录取概率。`,
  };
}

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

export function recommend(data: Dataset, profile: Profile): Recommendation[] {
  const errors = validateProfile(profile);
  if (errors.length) throw new Error(errors.join("；"));
  // 上海 2026 普通本科控制线为 403；本原型不处理征求志愿及其他批次。
  if (profile.score < 403) return [];
  const schools = new Map(data.schools.map((school) => [school.id, school]));
  return data.majors
    .filter((major) =>
      major.requiredSubjects.every((subject) =>
        profile.subjects.includes(subject),
      ),
    )
    .filter(
      (major) =>
        !profile.majorNames.length || profile.majorNames.includes(major.name),
    )
    .map((major) => {
      const school = schools.get(major.schoolId);
      if (!school) throw new Error(`专业 ${major.id} 关联的学校不存在`);
      const values: Weights = {
        region:
          !profile.regions.length || profile.regions.includes(school.province)
            ? 100
            : 30,
        city:
          profile.cityTier === "不限" || profile.cityTier === school.tier
            ? 100
            : 40,
        school: mean(school.scores),
        major: mean(major.scores),
        faculty: major.scores[2],
        employment: (school.scores[2] + major.scores[4]) / 2,
        publicService: major.publicService,
        innovation: major.innovation,
        cost: Math.min(
          100,
          (profile.budget / (major.tuition + major.livingCost)) * 100,
        ),
      };
      const factors = WEIGHT_FIELDS.map(({ key, label }) => ({
        key,
        label,
        value: values[key],
        weight: profile.weights[key],
        contribution: (values[key] * profile.weights[key]) / 100,
      }));
      const reasons = [...factors]
        .filter((f) => f.weight > 0)
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 3)
        .map(
          (f) =>
            `${f.label} ${f.value.toFixed(1)} 分 × ${f.weight}% ≈ ${f.contribution.toFixed(1)} 分`,
        );
      const assessment = assessRisk(major, profile);
      return {
        id: major.id,
        school,
        major,
        score:
          Math.round(factors.reduce((sum, f) => sum + f.contribution, 0) * 10) /
          10,
        risk: assessment.risk,
        riskReason: assessment.reason,
        factors,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
