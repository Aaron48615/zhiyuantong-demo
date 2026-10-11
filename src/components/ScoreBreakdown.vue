<script setup lang="ts">
import { nextTick, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import type { DimensionScore } from "../domain/types";
import { formatScore } from "../domain/scoring";
const props = defineProps<{ scores: DimensionScore[]; prefix: string }>();
const route = useRoute();
const anchor = (id: string) => `${props.prefix}-${id}`;
async function revealAnchor() {
  if (!props.scores.some((score) => route.hash === `#${anchor(score.id)}`)) return;
  await nextTick();
  document.getElementById(route.hash.slice(1))?.scrollIntoView({ block: "start" });
}
onMounted(revealAnchor);
watch(() => route.hash, revealAnchor);
const precise = (value: number) => Number(value.toFixed(4));
</script>

<template>
  <div class="score-breakdown">
    <details v-for="dimension in scores" :id="anchor(dimension.id)" :key="dimension.id"
      class="dimension-detail" :open="route.hash === `#${anchor(dimension.id)}`">
      <summary>
        <span>{{ dimension.label }}</span>
        <strong :class="{ 'missing-score': dimension.score === null }">{{ formatScore(dimension.score) }}</strong>
        <span class="breakdown-toggle" aria-hidden="true">＋</span>
      </summary>
      <div class="dimension-body">
        <p class="small muted">{{ dimension.year }} 年模拟指标 · 原始值与计算过程</p>
        <p v-if="dimension.score === null" class="missing-score small">{{ dimension.missingReasons.join("；") }}。资料补齐后再计算这一项评分。</p>
        <ol class="indicator-list">
          <li v-for="indicator in dimension.indicators" :key="indicator.id">
            <div class="indicator-heading">
              <h3>{{ indicator.label }}</h3>
              <span>{{ indicator.rawLabel }}<template v-if="indicator.rawValue !== null && !['档', '状态'].includes(indicator.unit)"> {{ indicator.unit }}</template></span>
            </div>
            <p class="indicator-meta">{{ indicator.sourceLabel }} · {{ indicator.year ?? '年份待补' }}<template v-if="indicator.sampleSize !== undefined"> · {{ indicator.sampleSize }} 份样本</template></p>
            <p class="indicator-rule">{{ indicator.rule }}</p>
            <dl class="indicator-calculation">
              <div><dt>换算得分</dt><dd>{{ indicator.normalized === null ? '暂无评分' : precise(indicator.normalized) }}</dd></div>
              <div><dt>指标权重</dt><dd>{{ indicator.weight }}%</dd></div>
              <div><dt>贡献分</dt><dd>{{ indicator.contribution === null ? '待补' : precise(indicator.contribution) }}</dd></div>
            </dl>
            <p class="indicator-equation" :class="{ 'missing-score': indicator.missingReason }">{{ indicator.calculation }}</p>
          </li>
        </ol>
        <p v-if="dimension.score !== null" class="dimension-total">贡献分相加：{{ dimension.indicators.map((item) => precise(item.contribution!)).join(' ＋ ') }} ＝ <strong>{{ formatScore(dimension.score) }} 分</strong><small>总分显示一位小数，计算保留原始精度。</small></p>
        <p class="rule-version">示例规则 {{ dimension.version }}</p>
      </div>
    </details>
  </div>
</template>
