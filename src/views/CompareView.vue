<script setup lang="ts">
import { computed } from "vue";
import { dataset } from "../data/generate";
import { recommend } from "../domain/recommend";
import { SCHOOL_DIMENSIONS, MAJOR_DIMENSIONS } from "../domain/config";
import { usePlanner } from "../stores/planner";
const planner = usePlanner();
const items = computed(() => {
  const results = recommend(dataset, planner.profile);
  return planner.compareIds.flatMap((id) => {
    const major = dataset.majors.find((m) => m.id === id);
    const school = dataset.schools.find((s) => s.id === major?.schoolId);
    return major && school
      ? [{ major, school, result: results.find((r) => r.id === id) }]
      : [];
  });
});
</script>
<template>
  <div class="page-heading">
    <p class="eyebrow">第三步 / 看清差异</p>
    <h1>专业对比</h1>
    <p class="muted">
      最多比较 3 个组合。评分、费用与就业为模拟数据，匹配分基于同一份考生档案。
    </p>
  </div>
  <div v-if="items.length < 2" class="notice">
    {{
      items.length
        ? "已选择 1 项，再加入至少 1 项即可形成对比。"
        : "还没有选择对比项目，请从推荐卡片加入 2—3 项。"
    }}
    <RouterLink to="/recommendations">去选专业 →</RouterLink>
  </div>
  <section v-if="items.length" class="panel table-scroll">
    <table class="compare-table">
      <thead>
        <tr>
          <th>对比项目</th>
          <th v-for="item in items" :key="item.major.id">
            <RouterLink :to="`/major/${item.major.id}`">{{
              item.school.name
            }}</RouterLink>
            <p>{{ item.major.name }}</p>
            <button
              class="text-button"
              :aria-label="`移除${item.school.name}${item.major.name}`"
              @click="planner.toggleCompare(item.major.id)"
            >
              移除
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>偏好匹配</th>
          <td v-for="item in items" :key="item.major.id">
            <strong>{{
              item.result ? `${item.result.score} 分` : "不符合当前筛选"
            }}</strong>
          </td>
        </tr>
        <tr>
          <th>模拟风险</th>
          <td v-for="item in items" :key="item.major.id">
            {{ item.result?.risk ?? "不评估" }}
          </td>
        </tr>
        <tr>
          <th>城市</th>
          <td v-for="item in items" :key="item.major.id">
            {{ item.school.city }}
          </td>
        </tr>
        <tr>
          <th>选科要求</th>
          <td v-for="item in items" :key="item.major.id">
            {{ item.major.requiredSubjects.join(" + ") || "不限" }}
          </td>
        </tr>
        <tr>
          <th>年度学费 / 生活费</th>
          <td v-for="item in items" :key="item.major.id">
            {{ item.major.tuition.toLocaleString() }} /
            {{ item.major.livingCost.toLocaleString() }} 元
          </td>
        </tr>
        <tr>
          <th>示例最高月起薪</th>
          <td v-for="item in items" :key="item.major.id">
            {{ item.major.employment.jobs[0].salary }} 元
          </td>
        </tr>
        <tr>
          <th>学校八维评分</th>
          <td :colspan="items.length" class="muted">0—100 分，均为模拟</td>
        </tr>
        <tr v-for="(label, i) in SCHOOL_DIMENSIONS" :key="label">
          <th>{{ label }}</th>
          <td v-for="item in items" :key="item.major.id">
            {{ item.school.scores[i] }}
          </td>
        </tr>
        <tr>
          <th>专业六维评分</th>
          <td :colspan="items.length" class="muted">0—100 分，均为模拟</td>
        </tr>
        <tr v-for="(label, i) in MAJOR_DIMENSIONS" :key="label">
          <th>{{ label }}</th>
          <td v-for="item in items" :key="item.major.id">
            {{ item.major.scores[i] }}
          </td>
        </tr>
        <tr>
          <th>保留候选</th>
          <td v-for="item in items" :key="item.major.id">
            <button
              class="secondary small-button"
              @click="planner.toggleSaved(item.major.id)"
            >
              {{
                planner.savedIds.includes(item.major.id)
                  ? "移出候选"
                  : "加入候选"
              }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
  <RouterLink class="button secondary" to="/recommendations"
    >继续挑选</RouterLink
  >
</template>
