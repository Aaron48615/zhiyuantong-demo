<script setup lang="ts">
import { OFFICIAL_SOURCES } from "../domain/config";
import { usePlanner } from "../stores/planner";
const planner = usePlanner();
const steps = [
  {
    number: "01",
    title: "填写你的情况",
    description: "输入成绩和选科，再说说你看重什么。",
  },
  {
    number: "02",
    title: "查看匹配理由",
    description: "分别看偏好匹配与风险分档，理解每项得分。",
  },
  {
    number: "03",
    title: "比较并保留候选",
    description: "并排比较学校、专业和费用，整理自己的选择。",
  },
];
</script>
<template>
  <section class="hero">
    <p class="eyebrow">面向上海普通本科考生</p>
    <h1>从你的偏好出发，<br />找到值得比较的选择。</h1>
    <p class="hero-copy">
      学校、专业、城市和费用，很难只用一个排名决定。先筛选符合选科要求的专业，再看看哪些选择更符合你的想法。
    </p>
    <div class="actions">
      <RouterLink class="button" to="/profile"
        >{{ planner.hasProfile ? "调整档案与偏好" : "开始选择" }}
        <span aria-hidden="true">→</span></RouterLink
      ><RouterLink class="button secondary" to="/recommendations">{{
        planner.hasProfile ? "继续查看推荐" : "先看示例推荐"
      }}</RouterLink>
    </div>
    <p v-if="planner.hasProfile" class="small muted">
      当前档案：{{ planner.summary }}
    </p>
  </section>
  <section class="step-grid" aria-label="使用流程">
    <article v-for="step in steps" :key="step.number" class="panel">
      <span class="step-number">{{ step.number }}</span>
      <h2>{{ step.title }}</h2>
      <p class="muted">{{ step.description }}</p>
    </article>
  </section>
  <section class="panel source-section">
    <h2>先了解数据，再看推荐</h2>
    <p>
      本版本以 2026 年上海普通本科为背景。官方规则与成绩分布有可查来源；50
      所学校样本中的专业配置、专业组、评分、就业和录取位次均为模拟，用于体验功能，不代表高校实际招生情况。
    </p>
    <div class="notice">
      推荐中的“匹配分”表示偏好契合程度，“冲、稳、保”是模拟位次规则的分档。两者分别展示，都不构成录取承诺。
    </div>
    <details>
      <summary>查看官方参考资料与适用范围</summary>
      <ul class="source-list">
        <li v-for="source in OFFICIAL_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer"
            >{{ source.title }} ↗</a
          >
        </li>
      </ul>
      <p class="small muted">
        历史资料是专业组投档线，不能直接当作组内具体专业录取线。2026
        年最终投档结果不参与本原型的填报期计算。
      </p>
    </details>
  </section>
</template>
