<script setup lang="ts">
import type { Recommendation } from "../domain/types";
import { usePlanner } from "../stores/planner";
defineProps<{ item: Recommendation }>();
const planner = usePlanner();
</script>
<template>
  <article class="result-card">
    <div class="row between">
      <span class="eyebrow"
        >{{ item.school.city }} · {{ item.school.level }}</span
      >
      <span class="risk-tag" :data-risk="item.risk"
        >{{ item.risk }} · 模拟</span
      >
    </div>
    <div class="row between align-start">
      <div>
        <h3>
          <RouterLink :to="`/major/${item.id}`">{{
            item.school.name
          }}</RouterLink>
        </h3>
        <p class="major-name">{{ item.major.name }}</p>
      </div>
      <div class="match-score">
        <strong>{{ item.score }}</strong
        ><span>偏好匹配 / 100</span>
      </div>
    </div>
    <p class="muted small">
      {{ item.major.groupName }} · 选科：{{
        item.major.requiredSubjects.join(" + ") || "不限"
      }}
    </p>
    <div class="card-facts">
      <span
        >年费用约
        {{
          ((item.major.tuition + item.major.livingCost) / 10000).toFixed(1)
        }}
        万</span
      ><span>示例起薪 {{ item.major.employment.jobs[0].salary }} 元/月</span>
    </div>
    <p class="small reason">{{ item.reasons[0] }}</p>
    <div class="actions">
      <RouterLink class="button small-button" :to="`/major/${item.id}`"
        >查看详情</RouterLink
      >
      <button
        class="secondary small-button"
        :aria-pressed="planner.compareIds.includes(item.id)"
        @click="planner.toggleCompare(item.id)"
      >
        {{ planner.compareIds.includes(item.id) ? "移出对比" : "加入对比" }}
      </button>
      <button
        class="text-button"
        :aria-pressed="planner.savedIds.includes(item.id)"
        @click="planner.toggleSaved(item.id)"
      >
        {{ planner.savedIds.includes(item.id) ? "已收藏" : "收藏" }}
      </button>
    </div>
  </article>
</template>
