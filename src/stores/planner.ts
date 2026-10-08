import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { createDefaultProfile } from "../domain/config";
import { validateProfile } from "../domain/recommend";
import { dataset } from "../data/generate";
import type { Profile } from "../domain/types";

const STORAGE_KEY = "zhiyuantong:v1";
export const usePlanner = defineStore("planner", () => {
  const profile = ref<Profile>(createDefaultProfile());
  const hasProfile = ref(false);
  const savedIds = ref<string[]>([]);
  const compareIds = ref<string[]>([]);
  const toast = ref("");
  const storageWarning = ref("");
  const validIds = new Set(dataset.majors.map((m) => m.id));
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved?.profile && typeof saved.profile === "object") {
      const restored = { ...saved.profile };
      if (saved.preferenceVersion !== 2) {
        const defaults = createDefaultProfile();
        restored.preferences = defaults.preferences;
        restored.advancedEnabled = false;
        delete restored.weights;
      }
      if (!validateProfile(restored).length) {
        profile.value = restored;
        hasProfile.value = true;
      }
    }
    if (Array.isArray(saved?.savedIds))
      savedIds.value = [
        ...new Set<string>(
          saved.savedIds.filter(
            (id: unknown) => typeof id === "string" && validIds.has(id),
          ),
        ),
      ].slice(0, 100);
    if (Array.isArray(saved?.compareIds))
      compareIds.value = [
        ...new Set<string>(
          saved.compareIds.filter(
            (id: unknown) => typeof id === "string" && validIds.has(id),
          ),
        ),
      ].slice(0, 3);
  } catch {
    storageWarning.value = "本机记录无法读取，已使用默认档案。";
  }
  watch(
    [profile, savedIds, compareIds, hasProfile],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            preferenceVersion: 2,
            profile: hasProfile.value ? profile.value : null,
            savedIds: savedIds.value,
            compareIds: compareIds.value,
          }),
        );
      } catch {
        storageWarning.value = "浏览器无法保存记录，关闭页面后可能丢失。";
      }
    },
    { deep: true, immediate: true },
  );
  let toastTimer: ReturnType<typeof setTimeout>;
  function notify(message: string) {
    toast.value = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.value = "";
    }, 3000);
  }
  function saveProfile(next: Profile) {
    profile.value = JSON.parse(JSON.stringify(next));
    hasProfile.value = true;
  }
  function toggleSaved(id: string) {
    if (savedIds.value.includes(id)) {
      savedIds.value = savedIds.value.filter((item) => item !== id);
      notify("已从候选清单移除");
    } else if (savedIds.value.length >= 100)
      notify("候选清单最多保存 100 项，请先整理");
    else if (validIds.has(id)) {
      savedIds.value.push(id);
      notify("已加入候选清单");
    }
  }
  function toggleCompare(id: string) {
    if (compareIds.value.includes(id))
      compareIds.value = compareIds.value.filter((item) => item !== id);
    else if (compareIds.value.length >= 3)
      notify("最多比较 3 项，请先移除一项");
    else if (validIds.has(id)) {
      compareIds.value.push(id);
      notify("已加入对比");
    }
  }
  function moveSaved(index: number, direction: number) {
    const next = index + direction;
    if (next < 0 || next >= savedIds.value.length) return;
    const copy = [...savedIds.value];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    savedIds.value = copy;
  }
  const summary = computed(
    () => `${profile.value.score} 分 · ${profile.value.subjects.join(" / ")}`,
  );
  return {
    profile,
    hasProfile,
    savedIds,
    compareIds,
    toast,
    storageWarning,
    summary,
    saveProfile,
    toggleSaved,
    toggleCompare,
    moveSaved,
    notify,
  };
});
