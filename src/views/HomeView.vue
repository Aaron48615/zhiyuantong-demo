<script setup lang="ts">
import { OFFICIAL_SOURCES } from "../domain/config";
import { usePlanner } from "../stores/planner";
import RiskGuide from "../components/RiskGuide.vue";
const planner = usePlanner();
const steps = [
  {
    number: "01",
    title: "填写档案",
    description: "填写成绩、选科和个人偏好。",
  },
  {
    number: "02",
    title: "查看推荐",
    description: "了解匹配理由与风险分档。",
  },
  {
    number: "03",
    title: "整理候选",
    description: "比较学校与专业，保留意向选择。",
  },
];
</script>
<template>
  <section class="hero">
    <h1>志愿报考辅助系统</h1>
    <p class="hero-copy">
      结合成绩、选科和个人偏好，辅助你筛选学校与专业。
    </p>
    <div class="actions">
      <RouterLink class="button" to="/profile"
        >{{ planner.hasProfile ? "调整档案与偏好" : "开始选择" }}
        <span aria-hidden="true">→</span></RouterLink
      ><RouterLink class="button secondary" to="/recommendations">{{
        planner.hasProfile ? "继续查看推荐" : "先看看推荐"
      }}</RouterLink>
    </div>
    <p v-if="planner.hasProfile" class="small muted">
      当前档案：{{ planner.summary }}
    </p>
  </section>
  <section class="home-how-to" aria-labelledby="how-to-title">
    <h2 id="how-to-title">怎么使用这个系统？</h2>
    <div class="step-grid">
      <article v-for="step in steps" :key="step.number" class="panel">
        <span class="step-number">{{ step.number }}</span>
        <h3>{{ step.title }}</h3>
        <p class="muted">{{ step.description }}</p>
      </article>
    </div>
  </section>
  <section class="panel source-section">
    <h2>推荐说明</h2>
    <p>匹配分表示学校与专业有多符合你的偏好。“冲、稳、保”含义如下：</p>
    <RiskGuide />
    <details>
      <summary>官方资料与适用范围</summary>
      <ul class="source-list">
        <li v-for="source in OFFICIAL_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer"
            >{{ source.title }} ↗</a
          >
        </li>
      </ul>
      <p class="small muted">
        历史资料是专业组投档线，不能直接当作组内具体专业录取线。2026
        年最终投档结果不参与填报期计算。
      </p>
    </details>
  </section>
</template>
