import { describe, expect, it } from "vitest";
import { generateDataset } from "../src/data/generate";
import distribution from "../src/data/score-distribution-2026.json";
import { createDefaultProfile, WEIGHT_FIELDS } from "../src/domain/config";
import {
  recommend,
  updateWeight,
  rankForScore,
  validateProfile,
  assessRisk,
} from "../src/domain/recommend";
import { answerFromData } from "../src/domain/assistant";

const data = generateDataset();
describe("数据与来源边界", () => {
  it("固定种子可重现，包含50校300专业并维持关联关系", () => {
    expect(data).toEqual(generateDataset());
    expect(data.schools).toHaveLength(50);
    expect(data.majors).toHaveLength(300);
    expect(new Set(data.majors.map((m) => m.id)).size).toBe(300);
    for (const school of data.schools) {
      expect(data.majors.filter((m) => m.schoolId === school.id)).toHaveLength(
        6,
      );
      expect(school.scores).toHaveLength(8);
    }
    for (const major of data.majors) {
      expect(data.schools.some((s) => s.id === major.schoolId)).toBe(true);
      expect(major.scores).toHaveLength(6);
      expect(
        major.employment.destinations.reduce((s, d) => s + d.value, 0),
      ).toBe(100);
      expect(major.employment.regions.reduce((s, d) => s + d.value, 0)).toBe(
        100,
      );
      expect(major.employment.trend.at(-1)?.rate).toBe(
        100 -
          major.employment.destinations.find((d) => d.name === "待就业")!.value,
      );
      expect(
        major.employment.destinations.every(
          (d) => d.value >= 0 && d.value <= 100,
        ),
      ).toBe(true);
      expect(major.history.map((h) => h.year)).toEqual([2023, 2024, 2025]);
    }
  });
  it("官方分布累计人数连续，保留同分区间与顶部截断", () => {
    expect(distribution.rows).toHaveLength(214);
    let total = 0;
    for (const row of distribution.rows) {
      total += row.count;
      expect(row.cumulative).toBe(total);
    }
    expect(rankForScore(660)).toEqual({ start: 1, end: 58 });
    expect(rankForScore(615)).toEqual({ start: 59, end: 67 });
    expect(rankForScore(402)).toBeNull();
  });
});
describe("推荐逻辑", () => {
  it("示例档案有20项以上结果且包含冲稳保，各得分可重算", () => {
    const items = recommend(data, createDefaultProfile());
    expect(items.length).toBeGreaterThanOrEqual(20);
    expect(new Set(items.map((r) => r.risk))).toEqual(
      new Set(["冲", "稳", "保"]),
    );
    for (let i = 0; i < items.length; i++) {
      expect(items[i].score).toBeGreaterThanOrEqual(0);
      expect(items[i].score).toBeLessThanOrEqual(100);
      expect(items[i].score).toBeCloseTo(
        items[i].factors.reduce(
          (sum, f) => sum + (f.value * f.weight) / 100,
          0,
        ),
        0,
      );
      if (i) expect(items[i - 1].score).toBeGreaterThanOrEqual(items[i].score);
    }
  });
  it("选科是硬约束，地域偏好无法让无资格项目进入结果", () => {
    const profile = createDefaultProfile();
    profile.subjects = ["政治", "历史", "地理"];
    profile.weights = updateWeight(profile.weights, "region", 100);
    const result = recommend(data, profile);
    expect(result.length).toBe(100);
    expect(result.every((r) => !r.major.requiredSubjects.length)).toBe(true);
    profile.majorNames = ["软件工程"];
    expect(recommend(data, profile)).toEqual([]);
  });
  it("低于本科线返回空集，不凑推荐数量", () => {
    const profile = createDefaultProfile();
    profile.score = 402;
    expect(recommend(data, profile)).toEqual([]);
  });
  it("风险分档忽略填报年度及之后数据", () => {
    const major = data.majors[0];
    const profile = createDefaultProfile();
    expect(
      assessRisk(
        { ...major, history: [...major.history, { year: 2026, minRank: 1 }] },
        profile,
      ),
    ).toEqual(assessRisk(major, profile));
    expect(
      assessRisk({ ...major, history: [{ year: 2026, minRank: 1 }] }, profile)
        .risk,
    ).toBe("数据不足");
  });
  it("连续调整九个权重，始终得到0到100的整数且总和为100", () => {
    let weights = createDefaultProfile().weights;
    for (const { key } of WEIGHT_FIELDS)
      for (const value of [100, 0, 99, 37, 1, 50]) {
        weights = updateWeight(weights, key, value);
        expect(weights[key]).toBe(value);
        expect(Object.values(weights).reduce((s, v) => s + v, 0)).toBe(100);
        expect(
          Object.values(weights).every(
            (v) => Number.isInteger(v) && v >= 0 && v <= 100,
          ),
        ).toBe(true);
      }
  });
  it("无效请求给出错误，不使用静默默认值替代", () => {
    expect(validateProfile(null).length).toBeGreaterThan(0);
    expect(validateProfile({}).length).toBeGreaterThan(0);
    const profile = createDefaultProfile();
    profile.weights.cost = 0;
    expect(() => recommend(data, profile)).toThrow("100%");
  });
});
describe("基础问答", () => {
  it("六类问题具有对应处理并支持追问学校和专业", () => {
    const profile = createDefaultProfile();
    const questions = [
      ["平行志愿怎么投档", "政策咨询"],
      ["计算机和软件工程有什么区别", "专业解读"],
      ["自动化有什么岗位", "就业前景"],
      ["分数够上海大学软件工程吗", "择校建议"],
      ["喜欢计算机，推荐浙江学校", "偏好推荐"],
      ["近三年位次变化", "数据分析"],
    ];
    for (const [content, category] of questions)
      expect(
        answerFromData([{ role: "user", content }], profile).category,
      ).toBe(category);
    const reply = answerFromData(
      [
        { role: "user", content: "上海理工大学的软件工程怎么样" },
        { role: "assistant", content: "示例回答" },
        { role: "user", content: "它的就业岗位有哪些" },
      ],
      profile,
    );
    expect(reply.answer).toContain("上海理工大学 · 软件工程");
    expect(reply.answer).toContain("模拟数据");
  });
  it("未收录的学校不拿其他学校数据代替，专业解读对应问题", () => {
    const profile = createDefaultProfile();
    const unknown = answerFromData(
      [{ role: "user", content: "复旦大学的软件工程能录取吗" }],
      profile,
    );
    expect(unknown.category).toBe("数据范围");
    expect(unknown.answer).toContain("不在");
    expect(
      answerFromData([{ role: "user", content: "自动化学什么课程" }], profile)
        .answer,
    ).toContain("控制理论");
  });
});
