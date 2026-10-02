<script setup lang="ts">
import { computed } from "vue";
import { dataset } from "../data/generate";
import { recommend } from "../domain/recommend";
import { usePlanner } from "../stores/planner";
const planner = usePlanner();
const items = computed(() => {
  const results = recommend(dataset, planner.profile);
  return planner.savedIds.flatMap((id) => {
    const major = dataset.majors.find((m) => m.id === id);
    const school = dataset.schools.find((s) => s.id === major?.schoolId);
    return major && school
      ? [{ major, school, result: results.find((r) => r.id === id) }]
      : [];
  });
});
function download() {
  const content = {
    title: "智愿通候选清单",
    purpose: "模拟数据演示，非正式志愿表",
    profile: planner.profile,
    items: items.value.map(({ school, major }, index) => ({
      order: index + 1,
      school: school.name,
      major: major.name,
      group: major.groupName,
      source: "simulated",
    })),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "zhiyuantong-shortlist.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>
<template>
  <div class="page-heading">
    <div class="row between">
      <div>
        <p class="eyebrow">整理你的选择</p>
        <h1>候选清单</h1>
      </div>
      <button v-if="items.length" class="secondary" @click="download">
        导出清单
      </button>
    </div>
    <p class="muted">
      已保留 {{ items.length }} 项 · 仅保存在当前浏览器，可调整顺序或导出 JSON
      备份。
    </p>
  </div>
  <div class="notice">
    这是学校与专业的收藏清单，不是正式志愿表。上海正式填报须按院校专业组组织组内专业，并明确调剂选项。
  </div>
  <div v-if="!items.length" class="empty-state">
    <h2>还没有保留的候选</h2>
    <p>从推荐结果中收藏几项，再回来比较与整理。</p>
    <RouterLink class="button" to="/recommendations">查看推荐</RouterLink>
  </div>
  <article
    v-for="(item, index) in items"
    :key="item.major.id"
    class="panel saved-card"
  >
    <span class="list-number">{{ String(index + 1).padStart(2, "0") }}</span>
    <div class="saved-content">
      <h2>
        <RouterLink :to="`/major/${item.major.id}`"
          >{{ item.school.name }} · {{ item.major.name }}</RouterLink
        >
      </h2>
      <p class="small muted">
        {{ item.school.city }} · {{ item.major.groupName }} ·
        {{
          item.result
            ? `匹配 ${item.result.score} 分 / ${item.result.risk}（模拟）`
            : "不符合当前档案或专业筛选条件，请重新核对"
        }}
      </p>
      <div class="actions">
        <button
          class="text-button"
          :disabled="index === 0"
          :aria-label="`上移第${index + 1}项`"
          @click="planner.moveSaved(index, -1)"
        >
          上移</button
        ><button
          class="text-button"
          :disabled="index === items.length - 1"
          :aria-label="`下移第${index + 1}项`"
          @click="planner.moveSaved(index, 1)"
        >
          下移</button
        ><button
          class="text-button"
          @click="planner.toggleCompare(item.major.id)"
        >
          {{
            planner.compareIds.includes(item.major.id) ? "移出对比" : "加入对比"
          }}</button
        ><button
          class="text-button danger"
          @click="planner.toggleSaved(item.major.id)"
        >
          移除
        </button>
      </div>
    </div>
  </article>
</template>
