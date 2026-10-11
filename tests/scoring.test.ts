import { describe, expect, it } from "vitest";
import { generateDataset } from "../src/data/generate";
import { createDefaultProfile } from "../src/domain/config";
import { evaluateDimension, MAJOR_RULES, SCHOOL_RULES, SCORING_YEAR, scoreSchool } from "../src/domain/scoring";
import { recommend } from "../src/domain/recommend";
import { filterResults, sortResults } from "../src/domain/result-filters";
import { answerFromData } from "../src/domain/assistant";
import type { IndicatorData } from "../src/domain/types";

const data = generateDataset();
const observation = (value: number | null, unit = "%") => ({ value, unit, year: SCORING_YEAR, source: "simulated" as const, sampleSize: 100 });
const employment = SCHOOL_RULES.find((rule) => rule.id === "employment")!;

describe("指标评分计算", () => {
  it("就业质量手算80×40%＋70×30%＋60×30%=71，并保留各项证据", () => {
    const metrics: IndicatorData = { employmentRate: observation(80), relatedJobRate: observation(70), graduateSatisfaction: observation(60) };
    const result = evaluateDimension(employment, metrics);
    expect(result.score).toBe(71);
    expect(result.indicators.map((item) => item.contribution)).toEqual([32, 21, 18]);
    expect(result.indicators.map((item) => item.rawValue)).toEqual([80, 70, 60]);
    expect(result.missingReasons).toEqual([]);
  });
  it("生师比越低得分越高；有效数据超出换算区间时截到边界", () => {
    const rule = { id: "ratio", label: "生师比", indicators: [{ ...SCHOOL_RULES[1].indicators[0], weight: 100 }] };
    const result = (value: number) => evaluateDimension(rule, { studentsPerTeacher: observation(value, "学生/教师") });
    expect(result(5).score).toBe(100);
    expect(result(17.5).score).toBe(50);
    expect(result(30).score).toBe(0);
    expect(result(2).score).toBe(100);
    expect(result(40).score).toBe(0);
    expect(result(0).score).toBeNull();
  });
  it("零是真实值，缺失、年份、单位、样本量和非有限值分别给出原因", () => {
    const complete: IndicatorData = { employmentRate: observation(0), relatedJobRate: observation(0), graduateSatisfaction: observation(0) };
    expect(evaluateDimension(employment, complete).score).toBe(0);
    const cases = [
      { ...observation(null), missingReason: "调查待补" },
      { ...observation(80), year: 2024 },
      { ...observation(80), unit: "人" },
      { ...observation(80), sampleSize: 12 },
      observation(NaN), observation(Infinity), observation(-1), observation(101),
    ];
    for (const value of cases) {
      const result = evaluateDimension(employment, { ...complete, graduateSatisfaction: value });
      expect(result.score).toBeNull();
      expect(result.indicators[2].contribution).toBeNull();
      expect(result.missingReasons).toHaveLength(1);
      expect(result.indicators[0].weight).toBe(40);
    }
  });
  it("评级只接受已定义档位，错误区间和权重不能计算出总分", () => {
    const metrics = structuredClone(data.majors[0].indicators);
    metrics.subjectLevel.value = 5;
    metrics.accreditation.value = 1;
    expect(evaluateDimension(MAJOR_RULES[0], metrics).score).toBe(100);
    metrics.subjectLevel.value = 6;
    expect(evaluateDimension(MAJOR_RULES[0], metrics).score).toBeNull();
    const badRange = { ...employment, indicators: employment.indicators.map((r) => ({ ...r, lower: 100, upper: 100 })) };
    const badWeights = { ...employment, indicators: employment.indicators.map((r) => ({ ...r, weight: 50 })) };
    const sample = { employmentRate: observation(80), relatedJobRate: observation(70), graduateSatisfaction: observation(60) };
    expect(evaluateDimension(badRange, sample).score).toBeNull();
    expect(evaluateDimension(badWeights, sample).score).toBeNull();
  });
  it("全部维度都能追到原始指标，修改指标会重新计算并替换旧分数", () => {
    for (const school of data.schools) expect(school.scoreDetails).toHaveLength(8);
    for (const major of data.majors) {
      expect(major.scoreDetails).toHaveLength(6);
      for (const dimension of [...major.scoreDetails, ...major.preferenceScoreDetails]) {
        expect(dimension.indicators.length).toBeGreaterThan(0);
        if (dimension.score !== null) expect(dimension.score).toBeCloseTo(dimension.indicators.reduce((sum, item) => sum + item.contribution!, 0), 0);
      }
    }
    const changed = structuredClone(data.schools[0]);
    changed.indicators.employmentRate.value = 80;
    changed.indicators.relatedJobRate.value = 70;
    changed.indicators.graduateSatisfaction.value = 60;
    changed.scores[2] = 99;
    expect(scoreSchool(changed).scores[2]).toBe(71);
    const result = recommend({ schools: [changed], majors: [data.majors[0]] }, createDefaultProfile())[0];
    expect(result.school.scores[2]).toBe(71);
    expect(result.school.scoreDetails[2].score).toBe(71);
  });
});

describe("缺失评分贯穿候选流程", () => {
  it("启用项缺失则保留候选但不算总分；关掉该偏好后可按完整数据评分", () => {
    const profile = createDefaultProfile();
    const result = recommend(data, profile);
    const missing = result.find((item) => item.id === "school-50-major-1")!;
    expect(missing.score).toBeNull();
    expect(missing.missingFactors).toEqual(["学校综合排名"]);
    expect(missing.factors.map((factor) => factor.weight)).toEqual([20, 20, 20, 20, 20, 0, 0, 0, 0]);
    expect(missing.factors.find((factor) => factor.key === "school")?.contribution).toBeNull();
    expect(result.at(-1)?.score).toBeNull();
    profile.preferences.school = 0;
    const withoutSchool = recommend(data, profile).find((item) => item.id === missing.id)!;
    expect(withoutSchool.score).not.toBeNull();
    expect(withoutSchool.missingFactors).toEqual([]);
    expect(withoutSchool.factors.find((factor) => factor.key === "school")?.contribution).toBe(0);
  });
  it("未启用的缺失进阶指标不影响基础评分，也不改写独立档位", () => {
    const major = structuredClone(data.majors[0]);
    major.indicators.publicJobMatch.value = null;
    const profile = createDefaultProfile();
    const preferences = { ...profile.preferences };
    const sample = { schools: data.schools, majors: [major] };
    expect(recommend(sample, profile)[0].score).not.toBeNull();
    profile.advancedEnabled = true;
    expect(recommend(sample, profile)[0].score).toBeNull();
    expect(profile.preferences).toEqual(preferences);
  });
  it("缺失维度排序置后，零分可排在缺失之前，阈值0也不会收进缺失项", () => {
    const profile = createDefaultProfile();
    const school = structuredClone(data.schools[0]);
    school.indicators.activityParticipation.value = 0;
    school.indicators.campusSatisfaction.value = 0;
    const sample = { schools: [school, data.schools[49]], majors: [data.majors[0], data.majors[294]] };
    const items = recommend(sample, profile);
    expect(sortResults(items, "school-6").map((item) => item.school.scores[6])).toEqual([0, null]);
    expect(filterResults(items, { query: "", risk: "全部", dimension: "school-6", minimum: 0 }).map((item) => item.id)).toEqual([data.majors[0].id]);
    expect(filterResults(items, { query: "", risk: "全部", dimension: "school-6", minimum: 1 })).toEqual([]);
  });
  it("薪资样本不足保留详细原因，问答不输出null分", () => {
    const profile = createDefaultProfile();
    const item = recommend(data, profile).find((item) => item.id === "school-1-major-6")!;
    expect(item.major.scoreDetails[4].missingReasons).toEqual(["毕业生月薪中位数：样本量不足30份"]);
    expect(item.score).toBeNull();
    const answer = answerFromData([{ role: "user", content: "上海大学国际经济与贸易的评分怎么算" }], profile);
    expect(answer.category).toBe("评分依据");
    expect(answer.answer).toContain("资料待补");
    expect(answer.answer).not.toMatch(/null|NaN/);
  });
});
