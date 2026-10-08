<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { dataset } from "../data/generate";
import {
  SCHOOL_DIMENSIONS,
  MAJOR_DIMENSIONS,
  OFFICIAL_SOURCES,
} from "../domain/config";
import { recommend } from "../domain/recommend";
import { usePlanner } from "../stores/planner";
import DataChart from "../components/DataChart.vue";
const route = useRoute();
const planner = usePlanner();
const major = computed(() =>
  dataset.majors.find((m) => m.id === route.params.id),
);
const school = computed(() =>
  dataset.schools.find((s) => s.id === major.value?.schoolId),
);
const item = computed(() =>
  recommend(dataset, planner.profile).find((r) => r.id === major.value?.id),
);
</script>
<template>
  <template v-if="major && school">
    <RouterLink class="back-link" to="/recommendations">← 返回推荐</RouterLink>
    <div class="page-heading">
      <p class="eyebrow">
        {{ school.city }} · {{ school.level }} · {{ major.groupName }}
      </p>
      <h1>{{ school.name }}</h1>
      <p class="detail-major">
        {{ major.name }} <span class="tag">模拟专业样本</span>
      </p>
    </div>
    <div class="notice">
      专业是否开设、专业组构成、评分、就业及历史专业位次均为演示数据，未核实该校实际招生计划。正式报考须核对当年招生章程与专业目录。
    </div>
    <section class="panel">
      <div class="detail-overview">
        <div>
          <small>偏好匹配</small
          ><strong>{{ item ? item.score : "不适用" }}</strong>
        </div>
        <div>
          <small>模拟风险分档</small
          ><strong>{{ item?.risk ?? "不在当前筛选内" }}</strong>
        </div>
        <div>
          <small>年学费 + 生活费</small
          ><strong
            >{{
              ((major.tuition + major.livingCost) / 10000).toFixed(1)
            }}
            万元</strong
          >
        </div>
      </div>
      <p>
        选科要求：{{ major.requiredSubjects.join(" + ") || "不限" }}。{{
          major.requiredSubjects.length ? "所有要求科目须同时满足。" : ""
        }}
      </p>
      <div class="actions">
        <button
          :aria-pressed="planner.savedIds.includes(major.id)"
          @click="planner.toggleSaved(major.id)"
        >
          {{
            planner.savedIds.includes(major.id) ? "从候选移除" : "加入候选清单"
          }}</button
        ><button
          class="secondary"
          :aria-pressed="planner.compareIds.includes(major.id)"
          @click="planner.toggleCompare(major.id)"
        >
          {{
            planner.compareIds.includes(major.id) ? "移出对比" : "加入对比"
          }}</button
        ><RouterLink
          class="button secondary"
          :to="{
            path: '/assistant',
            query: { question: `为什么推荐${school.name}的${major.name}？` },
          }"
          >问问助手</RouterLink
        >
      </div>
    </section>
    <section class="panel">
      <h2>推荐理由与风险依据</h2>
      <template v-if="item"
        ><p v-for="reason in item.reasons" :key="reason" class="small">
          {{ reason }}
        </p>
        <p class="muted small">{{ item.riskReason }}</p>
        <details>
          <summary>查看偏好权重的完整计算</summary>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>偏好</th>
                  <th>维度分</th>
                  <th>权重</th>
                  <th>贡献分</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="factor in item.factors" :key="factor.key">
                  <td>{{ factor.label }}</td>
                  <td>{{ factor.value.toFixed(1) }}</td>
                  <td>{{ factor.weight.toFixed(1) }}%</td>
                  <td>{{ factor.contribution.toFixed(2) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="3">匹配得分（各贡献分相加，保留一位小数）</th>
                  <td>{{ item.score }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </details></template
      >
      <p v-else>
        该项目不符合当前选科、意向专业或普通本科分数条件，不显示个性化匹配分。仍可浏览资料样本。
      </p>
    </section>
    <div class="two-column">
      <section class="panel">
        <h2>学校八维评分 <small>模拟</small></h2>
        <DataChart
          kind="radar"
          :labels="SCHOOL_DIMENSIONS"
          :values="school.scores"
          title="学校评分"
        />
        <div class="score-list">
          <span v-for="(label, i) in SCHOOL_DIMENSIONS" :key="label"
            >{{ label }} <strong>{{ school.scores[i] }}</strong></span
          >
        </div>
      </section>
      <section class="panel">
        <h2>专业六维评分 <small>模拟</small></h2>
        <DataChart
          kind="radar"
          :labels="MAJOR_DIMENSIONS"
          :values="major.scores"
          title="专业评分"
        />
        <div class="score-list">
          <span v-for="(label, i) in MAJOR_DIMENSIONS" :key="label"
            >{{ label }} <strong>{{ major.scores[i] }}</strong></span
          >
        </div>
      </section>
      <section class="panel">
        <h2>毕业去向分布 <small>模拟</small></h2>
        <DataChart
          kind="pie"
          :labels="major.employment.destinations.map((d) => d.name)"
          :values="major.employment.destinations.map((d) => d.value)"
          title="毕业去向"
        />
        <div class="score-list">
          <span
            v-for="destination in major.employment.destinations"
            :key="destination.name"
            >{{ destination.name }}
            <strong>{{ destination.value }}%</strong></span
          >
        </div>
      </section>
      <section class="panel">
        <h2>近三年去向落实率 <small>模拟</small></h2>
        <DataChart
          kind="line"
          :labels="major.employment.trend.map((t) => String(t.year))"
          :values="major.employment.trend.map((t) => t.rate)"
          title="毕业去向落实率"
        />
        <p class="small muted">
          本示例将就业与升学均计入去向落实率，与毕业去向中的待就业比例相对应。此口径不等于只统计参加工作的就业率。
        </p>
      </section>
    </div>
    <section class="panel">
      <h2>典型岗位与地域流向 <small>模拟</small></h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>典型岗位</th>
              <th>示例月起薪</th>
              <th>主要行业</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in major.employment.jobs" :key="job.name">
              <td>{{ job.name }}</td>
              <td>{{ job.salary }} 元</td>
              <td>{{ job.industry }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="small">
        毕业生流向：{{
          major.employment.regions
            .map((r) => `${r.name} ${r.value}%`)
            .join(" · ")
        }}
      </p>
    </section>
    <section class="panel">
      <h2>历史参考资料</h2>
      <p class="small muted">
        以下位次是专业级模拟记录，不是官方专业组投档数据。2026
        年及之后的结果不参与计算。
      </p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>年份</th>
              <th>示例最低录取位次</th>
              <th>来源</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="history in major.history" :key="history.year">
              <td>{{ history.year }}</td>
              <td>{{ history.minRank.toLocaleString() }}</td>
              <td>模拟生成</td>
            </tr>
          </tbody>
        </table>
      </div>
      <details>
        <summary>官方专业组投档资料（与上述模拟记录分别查看）</summary>
        <ul class="source-list">
          <li v-for="source in OFFICIAL_SOURCES.slice(2)" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer"
              >{{ source.title }} ↗</a
            >
          </li>
        </ul>
        <p class="small muted">
          需要核实专业组构成是否跨年一致，不能仅凭相同组代码直接比较。官方资料未公布具体专业线时，本系统不会补写真实值。
        </p>
      </details>
    </section>
  </template>
  <div v-else class="empty-state">
    <h1>没有找到这个专业样本</h1>
    <RouterLink class="button" to="/recommendations">返回推荐列表</RouterLink>
  </div>
</template>
