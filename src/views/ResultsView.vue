<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { usePlanner } from "../stores/planner";
import { fetchRecommendations } from "../services/api";
import { SCHOOL_DIMENSIONS, MAJOR_DIMENSIONS } from "../domain/config";
import type { Recommendation } from "../domain/types";
import ResultCard from "../components/ResultCard.vue";
const planner = usePlanner();
const items = ref<Recommendation[]>([]);
const loading = ref(false);
const error = ref("");
const mode = ref("api");
const query = ref("");
const risk = ref("全部");
const order = ref("match");
const page = ref(1);
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
    }
  } catch (err) {
    if (id === requestId)
      error.value = err instanceof Error ? err.message : "加载失败，请重试";
  } finally {
    if (id === requestId) loading.value = false;
  }
}
watch(() => planner.profile, load, { deep: true, immediate: true });
watch([query, risk, order], () => {
  page.value = 1;
});
const filtered = computed(() => {
  const result = items.value
    .filter((item) =>
      `${item.school.name}${item.major.name}${item.school.city}`.includes(
        query.value.trim(),
      ),
    )
    .filter((item) => risk.value === "全部" || item.risk === risk.value);
  return result.sort((a, b) => {
    if (order.value === "cost")
      return (
        a.major.tuition +
        a.major.livingCost -
        b.major.tuition -
        b.major.livingCost
      );
    if (order.value.startsWith("school-"))
      return (
        b.school.scores[Number(order.value.slice(7))] -
        a.school.scores[Number(order.value.slice(7))]
      );
    if (order.value.startsWith("major-"))
      return (
        b.major.scores[Number(order.value.slice(6))] -
        a.major.scores[Number(order.value.slice(6))]
      );
    return b.score - a.score;
  });
});
const visible = computed(() => filtered.value.slice(0, page.value * 20));
</script>
<template>
  <div class="page-heading">
    <p class="eyebrow">第二步 / 查看与筛选</p>
    <h1>适合你的选择</h1>
    <p class="muted">先满足选科要求，再按你的九项偏好匹配排序。</p>
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
  <div class="notice">
    本页的专业设置、匹配分和风险分档均使用模拟数据。偏好匹配高，不代表录取机会高。<span
      v-if="mode === 'local'"
    >
      当前使用本地演示计算，API 服务未连接。</span
    >
  </div>
  <section class="filters" aria-label="筛选推荐">
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
    <div class="risk-filters" role="group" aria-label="风险分档">
      <button
        v-for="value in ['全部', '冲', '稳', '保', '数据不足']"
        :key="value"
        type="button"
        class="risk-filter"
        :aria-pressed="risk === value"
        @click="risk = value"
      >
        {{ value }}
      </button>
    </div>
  </section>
  <div v-if="loading" class="empty-state" role="status">正在生成推荐…</div>
  <div v-else-if="error" class="empty-state">
    <p role="alert">{{ error }}</p>
    <button @click="load">重新加载</button>
  </div>
  <template v-else>
    <div class="row between result-summary">
      <p>
        共 <strong>{{ filtered.length }}</strong> 个学校与专业组合
      </p>
      <span class="muted">每次展示 20 项</span>
    </div>
    <div v-if="!filtered.length" class="empty-state">
      <h2>没有符合当前条件的样本</h2>
      <p>
        {{
          planner.profile.score < 403
            ? "当前分数低于上海 2026 年普通本科控制线 403 分，本原型不覆盖专科或征求志愿。"
            : "可以尝试清空搜索、切换风险分档或调整意向专业。选科要求不会因偏好设置而放宽。"
        }}
      </p>
      <RouterLink class="button secondary" to="/profile"
        >检查档案与偏好</RouterLink
      >
    </div>
    <div v-else class="result-grid">
      <ResultCard v-for="item in visible" :key="item.id" :item="item" />
    </div>
    <div v-if="visible.length < filtered.length" class="load-more">
      <button class="secondary" @click="page++">
        再显示 20 项（已显示 {{ visible.length }} 项）
      </button>
    </div>
  </template>
  <aside
    v-if="planner.compareIds.length"
    class="compare-dock"
    aria-label="已选对比"
  >
    <span
      >已选对比 <strong>{{ planner.compareIds.length }}</strong> / 3 项</span
    >
    <RouterLink class="button" to="/compare">查看对比 →</RouterLink>
  </aside>
</template>
