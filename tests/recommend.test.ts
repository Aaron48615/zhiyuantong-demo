import { describe, expect, it } from "vitest";
import { generateDataset } from "../src/data/generate";
import distribution from "../src/data/score-distribution-2026.json";
import { createDefaultProfile, PRESETS, WEIGHT_FIELDS } from "../src/domain/config";
import {
  recommend,
  rankForScore,
  validateProfile,
  assessRisk,
} from "../src/domain/recommend";
import { normalizePreferences } from "../src/domain/preferences";
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
    for (const { key } of WEIGHT_FIELDS) profile.preferences[key] = 0;
    profile.preferences.region = 10;
    const result = recommend(data, profile);
    expect(result.length).toBe(100);
    expect(result.every((r) => !r.major.requiredSubjects.length)).toBe(true);
    profile.majorNames = ["软件工程"];
    expect(recommend(data, profile)).toEqual([]);
  });
  it("推荐理由使用文字，并区分高权重下的优势与不足", () => {
    const profile = createDefaultProfile();
    profile.advancedEnabled = true;
    for (const { key } of WEIGHT_FIELDS) profile.preferences[key] = 0;
    profile.preferences.publicService = 10;
    const high = { ...data.majors[0], publicService: 85 };
    const low = { ...high, id: "low-public-service", publicService: 45 };
    const results = recommend({ schools: data.schools, majors: [high, low] }, profile);
    expect(results[0].reasons).toEqual(["考公考编友好度高"]);
    expect(results[1].reasons).toEqual(["考公考编适配情况仍需权衡"]);
    expect(results[0].factors.find((f) => f.key === "publicService")?.contribution).toBe(85);

    profile.preferences.publicService = 0;
    profile.preferences.cost = 10;
    profile.budget = high.tuition + high.livingCost;
    expect(recommend({ schools: data.schools, majors: [high] }, profile)[0].reasons)
      .toEqual(["学费与生活费在你的预算内"]);
    profile.budget -= 1;
    expect(recommend({ schools: data.schools, majors: [high] }, profile)[0].reasons)
      .toEqual(["学费与生活费超出你的预算"]);
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
  it("默认只换算基础五项，改变停用的进阶档位不影响推荐", () => {
    const profile = createDefaultProfile();
    const weights = normalizePreferences(profile.preferences, false);
    expect(Object.values(weights)).toEqual([20, 20, 20, 20, 20, 0, 0, 0, 0]);
    const original = recommend(data, profile);
    profile.preferences.employment = 10;
    profile.preferences.publicService = 0;
    profile.preferences.innovation = 1;
    profile.preferences.cost = 9;
    profile.budget = NaN;
    expect(recommend(data, profile)).toEqual(original);
    profile.advancedEnabled = true;
    expect(validateProfile(profile).join()).toContain("预算");
  });
  it("独立档位换算保留精度，开关进阶不改写原始档位", () => {
    const profile = createDefaultProfile();
    profile.preferences.school = 10;
    const before = { ...profile.preferences };
    const basic = normalizePreferences(profile.preferences, false);
    expect(basic.school).toBeCloseTo(100 / 3, 12);
    expect(basic.region).toBeCloseTo(100 / 6, 12);
    const advanced = normalizePreferences(profile.preferences, true);
    expect(advanced.school).toBe(20);
    expect(advanced.employment).toBe(10);
    expect(Object.values(advanced).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 12);
    expect(normalizePreferences(profile.preferences, false)).toEqual(basic);
    expect(profile.preferences).toEqual(before);
  });
  it("全零仅按启用项判断，拒绝越界或非整数档位", () => {
    const profile = createDefaultProfile();
    for (const { key } of WEIGHT_FIELDS.slice(0, 5)) profile.preferences[key] = 0;
    expect(validateProfile(profile).join()).toContain("至少");
    expect(() => recommend(data, profile)).toThrow("至少");
    profile.advancedEnabled = true;
    expect(validateProfile(profile)).toEqual([]);
    for (const value of [-1, 11, 2.5, NaN]) {
      profile.preferences.employment = value;
      expect(validateProfile(profile).join()).toContain("0—10");
    }
  });
  it("所有预设合法，就业和费用预设启用进阶，均衡与学校预设关闭", () => {
    for (const preset of PRESETS) {
      const profile = { ...createDefaultProfile(), preferences: { ...preset.preferences }, advancedEnabled: preset.advancedEnabled };
      expect(validateProfile(profile)).toEqual([]);
      expect(Object.values(normalizePreferences(profile.preferences, profile.advancedEnabled)).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 12);
      expect(preset.advancedEnabled).toBe(["更重视就业", "更重视费用"].includes(preset.name));
    }
  });
  it("无效请求给出错误，不使用静默默认值替代", () => {
    expect(validateProfile(null).length).toBeGreaterThan(0);
    expect(validateProfile({}).length).toBeGreaterThan(0);
    const profile = createDefaultProfile();
    profile.preferences.cost = 11;
    expect(() => recommend(data, profile)).toThrow("0—10");
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
