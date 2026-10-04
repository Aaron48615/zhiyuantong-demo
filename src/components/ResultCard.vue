<script setup lang="ts">
import type { Recommendation } from "../domain/types";
import { usePlanner } from "../stores/planner";
defineProps<{ item: Recommendation }>();
const planner = usePlanner();
</script>
<template>
  <article class="result-card">
    <div class="card-content">
      <div class="card-status">
        <div class="card-institution">
          <span>{{ item.school.city }}</span
          ><span class="tag">{{ item.school.level }}</span>
        </div>
        <span class="risk-tag" :data-risk="item.risk"
          >{{ item.risk }} · 模拟</span
        >
      </div>
      <div class="card-title-row">
        <div class="card-names">
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
      <div class="card-criteria">
        <span>{{ item.major.groupName }}</span>
        <span
          >选科要求：<strong>{{
            item.major.requiredSubjects.join(" + ") || "不限"
          }}</strong></span
        >
      </div>
      <div class="card-facts">
        <span
          >年费用
          <strong
            >约
            {{
              ((item.major.tuition + item.major.livingCost) / 10000).toFixed(1)
            }}
            万</strong
          ></span
        >
        <span
          >示例起薪
          <strong
            >{{
              item.major.employment.jobs[0].salary.toLocaleString()
            }}
            元/月</strong
          ></span
        >
      </div>
      <p v-if="item.reasons.length" class="reason">
        推荐理由：{{ item.reasons[0] }}
      </p>
    </div>
    <div class="card-actions">
      <RouterLink class="button small-button" :to="`/major/${item.id}`"
        >查看详情</RouterLink
      >
      <button
        class="secondary small-button"
        :aria-pressed="planner.compareIds.includes(item.id)"
        type="button"
        @click="planner.toggleCompare(item.id)"
      >
        {{ planner.compareIds.includes(item.id) ? "移出对比" : "加入对比" }}
      </button>
      <button
        class="text-button save-button"
        :aria-pressed="planner.savedIds.includes(item.id)"
        type="button"
        @click="planner.toggleSaved(item.id)"
      >
        <span aria-hidden="true">{{
          planner.savedIds.includes(item.id) ? "★" : "☆"
        }}</span
        >{{ planner.savedIds.includes(item.id) ? "已收藏" : "收藏" }}
      </button>
    </div>
  </article>
</template>
