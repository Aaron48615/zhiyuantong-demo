<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { usePlanner } from "../stores/planner";
import { fetchRecommendations } from "../services/api";
import { SCHOOL_DIMENSIONS, MAJOR_DIMENSIONS } from "../domain/config";
import type { Recommendation, Risk } from "../domain/types";
import { filterResults, sortResults, SCORE_FILTER_DIMENSIONS, scoreFilterError } from "../domain/result-filters";
import ResultCard from "../components/ResultCard.vue";
import PageHelp from "../components/PageHelp.vue";
import { dataset } from "../data/generate";
const planner = usePlanner();
const items = ref<Recommendation[]>([]);
const loading = ref(false);
const error = ref("");
const mode = ref("api");
const query = ref("");
const risk = ref<Risk | "全部">("全部");
const risks: (Risk | "全部")[] = ["全部", "冲", "稳", "保", "数据不足"];
const order = ref("match");
const scoreDimension = ref("");
const minimumScore = ref<number | string>(80);
const scoreError = computed(() => scoreFilterError(scoreDimension.value, minimumScore.value));
const scoreFilterLabel = computed(() =>
  SCORE_FILTER_DIMENSIONS.find((item) => item.key === scoreDimension.value)?.label,
);
function clearScoreFilter() {
  scoreDimension.value = "";
  minimumScore.value = 80;
}
const page = ref(1);
const pageSize = 20;
const filtersElement = ref<HTMLElement>();
const compareExpanded = ref(false);
let requestId = 0;
async function load() {
  const id = ++requestId;
  loading.value = true;
  error.value = "";
  try {
    const response = await fetchRecommendations(planner.profile);
    if (id === requestId) {
      items.value = response.items;
      mode.value = response.mode;
      page.value = 1;
    }
  } catch (err) {
    if (id === requestId)
      error.value = err instanceof Error ? err.message : "加载失败，请重试";
  } finally {
    if (id === requestId) loading.value = false;
  }
}
watch(() => planner.profile, load, { deep: true, immediate: true });
watch([query, risk, order, scoreDimension, minimumScore], () => {
  page.value = 1;
});
const filtered = computed(() => {
  const result = filterResults(items.value, {
    query: query.value,
    risk: risk.value,
    dimension: scoreDimension.value,
    minimum: minimumScore.value,
  });
  return sortResults(result, order.value);
});
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const pageNumbers = computed(() => {
  const total = totalPages.value;
  const start = Math.max(1, Math.min(page.value - 2, total - 4));
  const pages = new Set([1, total]);
  for (let value = start; value <= Math.min(total, start + 4); value++) pages.add(value);
  const ordered = [...pages].sort((a, b) => a - b);
  return ordered.flatMap((value, index) =>
    index > 0 && value - ordered[index - 1] > 1 ? ["…", value] : [value],
  );
});
async function changePage(value: number) {
  page.value = Math.max(1, Math.min(totalPages.value, value));
  await nextTick();
  filtersElement.value?.scrollIntoView({ block: "start" });
}
const compared = computed(() =>
  planner.compareIds.flatMap((id) => {
    const major = dataset.majors.find((item) => item.id === id);
    const school = dataset.schools.find((item) => item.id === major?.schoolId);
    return major && school ? [{ id, major: major.name, school: school.name }] : [];
  }),
);
</script>
<template>
  <div class="page-heading">
    <p class="eyebrow">第二步 / 查看与筛选</p>
    <h1>适合你的选择</h1>
    <p class="muted">先满足选科要求，再按你启用的偏好匹配排序。</p>
  </div>
  <div class="profile-summary">
    <p>
      <span class="muted"
        >{{ planner.hasProfile ? "当前档案" : "示例档案" }}：</span
      ><strong>{{ planner.profile.score }} 分</strong> ·
      {{ planner.profile.subjects.join(" / ") }}
    </p>
    <RouterLink class="text-button" to="/profile">调整偏好 →</RouterLink>
  </div>
  <div v-if="mode === 'local'" class="notice" role="status">
    当前使用本地计算，接口暂不可用或评分规则已更新。
  </div>
  <PageHelp page="results" />
  <section ref="filtersElement" class="filters" aria-label="筛选推荐">
    <div class="filter-controls">
      <label
        >搜索学校或专业<input
          v-model="query"
          type="search"
          placeholder="例如：上海大学、软件工程"
      /></label>
      <label
        >排序方式<select v-model="order">
          <option value="match">偏好匹配优先</option>
          <option value="cost">年费用从低到高</option>
          <optgroup label="学校维度">
            <option
              v-for="(label, i) in SCHOOL_DIMENSIONS"
              :key="label"
              :value="`school-${i}`"
            >
              {{ label }}优先
            </option>
          </optgroup>
          <optgroup label="专业维度">
            <option
              v-for="(label, i) in MAJOR_DIMENSIONS"
              :key="label"
              :value="`major-${i}`"
            >
              {{ label }}优先
            </option>
          </optgroup>
        </select></label
      >
    </div>
    <details class="dimension-filter">
      <summary>
        按维度最低分筛选
        <span v-if="scoreFilterLabel && !scoreError">{{ scoreFilterLabel }} ≥ {{ minimumScore }} 分</span>
        <span v-else-if="scoreError">请修正分数</span>
        <span v-else>可选</span>
      </summary>
      <div class="dimension-filter-controls">
        <label>评分维度
          <select v-model="scoreDimension" aria-describedby="score-filter-hint">
            <option value="">不限制维度分数</option>
            <optgroup label="学校维度">
              <option v-for="(label, index) in SCHOOL_DIMENSIONS" :key="label" :value="`school-${index}`">{{ label }}</option>
            </optgroup>
            <optgroup label="专业维度">
              <option v-for="(label, index) in MAJOR_DIMENSIONS" :key="label" :value="`major-${index}`">{{ label }}</option>
            </optgroup>
          </select>
        </label>
        <label>最低分
          <input v-model.number="minimumScore" type="number" min="0" max="100" step="1"
            :disabled="!scoreDimension" :aria-invalid="!!scoreError"
            :aria-describedby="scoreError ? 'score-filter-error score-filter-hint' : 'score-filter-hint'" />
        </label>
        <button type="button" class="secondary" :disabled="!scoreDimension" @click="clearScoreFilter">清除分数条件</button>
      </div>
      <p id="score-filter-hint" class="muted">使用当前评分，可与搜索和风险分档同时筛选；不改变偏好权重。</p>
      <p v-if="scoreError" id="score-filter-error" class="field-error" role="alert">{{ scoreError }}</p>
    </details>
    <div class="filter-footer">
      <div class="risk-filters" role="group" aria-label="风险分档">
      <button
        v-for="value in risks"
        :key="value"
        type="button"
        class="risk-filter"
        :aria-pressed="risk === value"
        @click="risk = value"
      >
        {{ value }}
      </button>
      </div>
      <aside v-if="planner.compareIds.length" class="compare-toolbar" aria-label="已选对比">
        <button
          type="button"
          class="text-button"
          :aria-expanded="compareExpanded"
          aria-controls="compare-selection"
          @click="compareExpanded = !compareExpanded"
        >
          已选 {{ planner.compareIds.length }}/3
          <span>{{ compareExpanded ? "收起 −" : "管理 +" }}</span>
        </button>
        <RouterLink class="text-button" to="/compare">查看对比 →</RouterLink>
      </aside>
    </div>
    <ul v-if="planner.compareIds.length && compareExpanded" id="compare-selection" class="compare-selection">
      <li v-for="item in compared" :key="item.id">
        <span>{{ item.school }} · {{ item.major }}</span>
        <button
          type="button"
          class="text-button"
          :aria-label="`移除${item.school}${item.major}`"
          @click="planner.toggleCompare(item.id)"
        ><span aria-hidden="true">×</span></button>
      </li>
    </ul>
  </section>
  <div v-if="loading" class="empty-state" role="status">正在生成推荐…</div>
  <div v-else-if="error" class="empty-state">
    <p role="alert">{{ error }}</p>
    <button @click="load">重新加载</button>
  </div>
  <div v-else-if="scoreError" class="empty-state">
    <h2>请修正维度筛选条件</h2>
    <p>输入 0—100 的整数，或清除分数条件后继续查看推荐。</p>
    <button type="button" class="secondary" @click="clearScoreFilter">清除分数条件</button>
  </div>
  <template v-else>
    <div class="row between result-summary">
      <p>
        共 <strong>{{ filtered.length }}</strong> 个学校与专业组合
      </p>
      <span class="muted">每页 20 项 · 第 {{ page }} / {{ totalPages }} 页</span>
    </div>
    <div v-if="!filtered.length" class="empty-state">
      <h2>没有符合当前条件的专业</h2>
      <p>
        {{
          planner.profile.score < 403
            ? "当前分数低于上海 2026 年普通本科控制线 403 分，当前不覆盖专科或征求志愿。"
            : "可以尝试清空搜索、降低维度最低分、切换风险分档或调整意向专业。选科要求不会因偏好设置而放宽。"
        }}
      </p>
      <button v-if="scoreDimension" type="button" class="secondary" @click="clearScoreFilter">清除分数条件</button>
      <RouterLink class="button secondary" to="/profile"
        >检查档案与偏好</RouterLink
      >
    </div>
    <div v-else class="result-grid">
      <ResultCard v-for="item in visible" :key="item.id" :item="item" />
    </div>
    <nav v-if="filtered.length" class="pagination" aria-label="推荐结果分页">
      <button type="button" class="secondary" :disabled="page === 1" @click="changePage(page - 1)">上一页</button>
      <template v-for="(value, index) in pageNumbers" :key="index">
        <span v-if="value === '…'" class="pagination-ellipsis" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="secondary page-number"
          :aria-label="`第 ${value} 页`"
          :aria-current="page === value ? 'page' : undefined"
          @click="changePage(Number(value))"
        >{{ value }}</button>
      </template>
      <button type="button" class="secondary" :disabled="page === totalPages" @click="changePage(page + 1)">下一页</button>
    </nav>
  </template>
</template>
