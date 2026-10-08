import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { createDefaultProfile } from "../src/domain/config";
import { dataset } from "../src/data/generate";
import { usePlanner } from "../src/stores/planner";

const key = "zhiyuantong:v1";
let records: Map<string, string>;
beforeEach(() => {
  records = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (name: string) => records.get(name) ?? null,
    setItem: (name: string, value: string) => records.set(name, value),
  });
  setActivePinia(createPinia());
});
afterEach(() => vi.unstubAllGlobals());

describe("独立偏好档案保存", () => {
  it("旧百分比初始化为新偏好，同时保留成绩、选科、收藏和对比", () => {
    const { preferences, advancedEnabled, ...oldProfile } = createDefaultProfile();
    const id = dataset.majors[0].id;
    records.set(key, JSON.stringify({
      profile: { ...oldProfile, score: 500, subjects: ["政治", "历史", "地理"], weights: { region: 100 } },
      savedIds: [id],
      compareIds: [id],
    }));
    const planner = usePlanner();
    expect(planner.hasProfile).toBe(true);
    expect(planner.profile.score).toBe(500);
    expect(planner.profile.subjects).toEqual(["政治", "历史", "地理"]);
    expect(planner.profile.preferences).toEqual(preferences);
    expect(planner.profile.advancedEnabled).toBe(advancedEnabled);
    expect(planner.savedIds).toEqual([id]);
    expect(planner.compareIds).toEqual([id]);
    const persisted = JSON.parse(records.get(key)!);
    expect(persisted.preferenceVersion).toBe(2);
    expect(persisted.profile.weights).toBeUndefined();
  });
  it("新档案刷新后保留原始档位和开关，停用的进阶档位不会丢失", async () => {
    const planner = usePlanner();
    const profile = createDefaultProfile();
    profile.preferences.school = 10;
    profile.preferences.employment = 9;
    planner.saveProfile(profile);
    await nextTick();
    setActivePinia(createPinia());
    const restored = usePlanner();
    expect(restored.hasProfile).toBe(true);
    expect(restored.profile).toEqual(profile);
    expect(restored.profile.advancedEnabled).toBe(false);
    expect(restored.profile.preferences.employment).toBe(9);
  });
});
