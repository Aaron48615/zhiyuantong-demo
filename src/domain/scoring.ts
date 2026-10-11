import type { DimensionScore, IndicatorData, IndicatorResult, Major, School, ScoreValue } from "./types";

export const SCORING_VERSION = "indicator-scores-v1";
export const RECOMMENDATION_VERSION = "explainable-scores-v3";
export const SCORING_YEAR = 2025;

export interface IndicatorRule {
  id: string;
  label: string;
  unit: string;
  weight: number;
  lower: number;
  upper: number;
  direction?: "negative";
  validMin?: number;
  validMax?: number;
  minSamples?: number;
  levels?: { value: number; label: string; score: number }[];
}
export interface DimensionRule {
  id: string;
  label: string;
  indicators: IndicatorRule[];
}
const percent = (id: string, label: string, weight: number, options: Partial<IndicatorRule> = {}): IndicatorRule =>
  ({ id, label, weight, unit: "%", lower: 0, upper: 100, validMin: 0, validMax: 100, ...options });
const accreditation = (weight: number): IndicatorRule => ({
  id: "accreditation", label: "专业认证状态", unit: "状态", weight, lower: 0, upper: 1,
  levels: [{ value: 0, label: "未取得", score: 0 }, { value: 1, label: "有效", score: 100 }],
});

// 区间和权重是本项目的演示规则，原始样本不对应院校真实调查或官方评价。
export const SCHOOL_RULES: DimensionRule[] = [
  { id: "academic", label: "学术声誉", indicators: [
    percent("assessedSubjectCoverage", "学科评估覆盖率", 50),
    { id: "researchPerTeacher", label: "人均研究成果", unit: "项/人", weight: 50, lower: 0, upper: 5, validMin: 0 },
  ] },
  { id: "teaching", label: "教学质量", indicators: [
    { id: "studentsPerTeacher", label: "生师比", unit: "学生/教师", weight: 40, lower: 5, upper: 30, direction: "negative", validMin: 1 },
    percent("qualityCourseCoverage", "优质课程覆盖率", 30),
    percent("teachingSatisfaction", "教学满意度", 30, { minSamples: 30 }),
  ] },
  { id: "employment", label: "就业质量", indicators: [
    percent("employmentRate", "毕业生就业比例（不含升学）", 40),
    percent("relatedJobRate", "专业相关岗位比例", 30),
    percent("graduateSatisfaction", "毕业生就业满意度", 30, { minSamples: 30 }),
  ] },
  { id: "facilities", label: "硬件设施", indicators: [
    { id: "equipmentPerStudent", label: "生均教学设备金额", unit: "元/人", weight: 60, lower: 0, upper: 40000, validMin: 0 },
    percent("facilityAccess", "教学设施可用率", 40),
  ] },
  { id: "faculty", label: "师资力量", indicators: [
    percent("doctorateTeacherRate", "博士学位教师比例", 50),
    { id: "teachingHours", label: "教师年均教学投入", unit: "小时/年", weight: 50, lower: 0, upper: 300, validMin: 0 },
  ] },
  { id: "international", label: "国际化程度", indicators: [
    percent("exchangeParticipation", "实际交流参与比例", 60, { upper: 20 }),
    percent("exchangeCoverage", "交流项目专业覆盖率", 40, { upper: 50 }),
  ] },
  { id: "culture", label: "校园文化", indicators: [
    percent("activityParticipation", "校园活动参与比例", 40),
    percent("campusSatisfaction", "校园体验满意度", 60, { minSamples: 30 }),
  ] },
  { id: "development", label: "发展潜力", indicators: [
    { id: "investmentGrowth", label: "近三年生均教学投入增幅", unit: "%", weight: 50, lower: -10, upper: 30, validMin: -100 },
    percent("subjectImprovement", "近三年学科建设改善比例", 50, { upper: 20 }),
  ] },
];
export const MAJOR_RULES: DimensionRule[] = [
  { id: "strength", label: "专业实力", indicators: [
    { id: "subjectLevel", label: "学科评价档位", unit: "档", weight: 60, lower: 1, upper: 5,
      levels: [1, 2, 3, 4, 5].map((value) => ({ value, label: `${value}档`, score: value * 20 })) },
    accreditation(40),
  ] },
  { id: "curriculum", label: "课程设置", indicators: [
    percent("coreCourseCoverage", "核心课程覆盖率", 60),
    percent("practiceCredits", "实践学分比例", 40, { upper: 50 }),
  ] },
  { id: "facultyMatch", label: "师资匹配度", indicators: [
    percent("teachingBackgroundMatch", "授课背景匹配比例", 60),
    percent("industryExperience", "相关行业实践教师比例", 40),
  ] },
  { id: "furtherStudy", label: "深造支持", indicators: [
    percent("furtherStudyRate", "毕业生深造比例", 60, { upper: 60 }),
    percent("researchTraining", "科研训练参与比例", 40),
  ] },
  { id: "salary", label: "薪资水平", indicators: [
    { id: "medianSalary", label: "毕业生月薪中位数", unit: "元/月", weight: 100, lower: 3000, upper: 15000, validMin: 0, minSamples: 30 },
  ] },
  { id: "recognition", label: "行业认可度", indicators: [
    accreditation(50), percent("employerSatisfaction", "用人单位满意度", 50, { minSamples: 30 }),
  ] },
];
export const PREFERENCE_RULES: DimensionRule[] = [
  { id: "publicService", label: "考公考编适配", indicators: [
    percent("publicJobMatch", "岗位专业要求匹配比例", 70),
    percent("publicJobCoverage", "可匹配岗位类别覆盖率", 30),
  ] },
  { id: "innovation", label: "创新机会", indicators: [
    percent("projectParticipation", "实践项目参与比例", 60),
    percent("innovationOpportunity", "创新训练机会覆盖率", 40),
  ] },
];

export function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}
export function formatScore(value: ScoreValue | undefined, missing = "暂无评分"): string {
  return isScore(value) ? value.toFixed(1) : missing;
}
export function meanScore(values: ScoreValue[], expectedLength = values.length): ScoreValue {
  return values.length === expectedLength && values.length > 0 && values.every(isScore)
    ? values.reduce<number>((sum, value) => sum + (value as number), 0) / values.length
    : null;
}
export function compareScoresDescending(a: ScoreValue | undefined, b: ScoreValue | undefined): number {
  if (!isScore(a)) return isScore(b) ? 1 : 0;
  if (!isScore(b)) return -1;
  return b - a;
}
const numberText = (value: number) => Number(value.toFixed(4)).toString();

export function evaluateDimension(rule: DimensionRule, data: IndicatorData, year = SCORING_YEAR): DimensionScore {
  const validWeights = rule.indicators.length > 0 && rule.indicators.every((r) => Number.isFinite(r.weight) && r.weight > 0)
    && Math.abs(rule.indicators.reduce((sum, r) => sum + r.weight, 0) - 100) < 1e-8;
  const indicators = rule.indicators.map((r): IndicatorResult => {
    const observation = data[r.id];
    const value = observation?.value;
    let missingReason: string | null = null;
    if (value === null || value === undefined) missingReason = observation?.missingReason || "尚未提供该项数据";
    else if (!Number.isFinite(value)) missingReason = "原始值不是有效数字";
    else if (observation.unit !== r.unit) missingReason = `单位应为${r.unit}`;
    else if (observation.year !== year) missingReason = `需要${year}年同口径数据`;
    else if ((r.validMin !== undefined && value < r.validMin) || (r.validMax !== undefined && value > r.validMax)) missingReason = "原始值超出有效范围";
    else if (r.minSamples && (!Number.isInteger(observation.sampleSize) || observation.sampleSize! < r.minSamples)) missingReason = `样本量不足${r.minSamples}份`;
    else if (!validWeights) missingReason = "指标权重配置无效";
    else if (r.levels ? !r.levels.some((level) => level.value === value) : !Number.isFinite(r.lower) || !Number.isFinite(r.upper) || r.upper <= r.lower) missingReason = "换算规则与原始值不匹配";
    const level = r.levels?.find((item) => item.value === value);
    const ruleText = r.levels
      ? r.levels.map((item) => `${item.label}＝${item.score}分`).join("；")
      : `${r.direction === "negative" ? "越小越高分；100－" : ""}100×（原始值－${r.lower}）÷（${r.upper}－${r.lower}），限制在0—100分`;
    let normalized: ScoreValue = null;
    if (!missingReason) {
      const forward = Math.min(100, Math.max(0, 100 * (value! - r.lower) / (r.upper - r.lower)));
      normalized = r.levels ? level!.score : r.direction === "negative" ? 100 - forward : forward;
      if (!isScore(normalized)) { normalized = null; missingReason = "换算结果无效"; }
    }
    const contribution = normalized === null ? null : normalized * r.weight / 100;
    return {
      id: r.id, label: r.label, rawValue: typeof value === "number" && Number.isFinite(value) ? value : null,
      rawLabel: typeof value !== "number" || !Number.isFinite(value) ? "暂无数据" : level?.label ?? String(value),
      unit: r.unit, year: observation?.year ?? null, sampleSize: observation?.sampleSize,
      sourceLabel: "项目模拟指标样本", normalized, weight: r.weight, contribution,
      rule: ruleText,
      calculation: normalized === null ? missingReason! : `${numberText(normalized)}×${r.weight}%＝${numberText(contribution!)}分`,
      missingReason,
    };
  });
  const missingReasons = indicators.filter((item) => item.missingReason).map((item) => `${item.label}：${item.missingReason}`);
  const score = validWeights && !missingReasons.length
    ? Math.round(indicators.reduce((sum, item) => sum + item.contribution!, 0) * 10) / 10 : null;
  return { id: rule.id, label: rule.label, score, version: SCORING_VERSION, year, indicators, missingReasons };
}

export function scoreSchool<T extends Pick<School, "indicators">>(school: T) {
  const scoreDetails = SCHOOL_RULES.map((rule) => evaluateDimension(rule, school.indicators));
  return { ...school, scores: scoreDetails.map((detail) => detail.score), scoreDetails };
}
export function scoreMajor<T extends Pick<Major, "indicators">>(major: T) {
  const scoreDetails = MAJOR_RULES.map((rule) => evaluateDimension(rule, major.indicators));
  const preferenceScoreDetails = PREFERENCE_RULES.map((rule) => evaluateDimension(rule, major.indicators));
  return { ...major, scores: scoreDetails.map((detail) => detail.score), scoreDetails, preferenceScoreDetails,
    publicService: preferenceScoreDetails[0].score, innovation: preferenceScoreDetails[1].score };
}
