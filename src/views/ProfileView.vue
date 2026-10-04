<script setup lang="ts">
import { computed, nextTick, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { usePlanner } from "../stores/planner";
import {
  PRESETS,
  SUBJECTS,
  WEIGHT_FIELDS,
  createDefaultProfile,
} from "../domain/config";
import {
  rankForScore,
  updateWeight,
  validateProfile,
} from "../domain/recommend";
import { MAJOR_NAMES, REGIONS } from "../data/generate";
import type { Profile, WeightKey, Weights } from "../domain/types";
import WeightControl from "../components/WeightControl.vue";

const planner = usePlanner();
const router = useRouter();
const draft = reactive<Profile>(JSON.parse(JSON.stringify(planner.profile)));
const advanced = ref(false);
const errors = ref<string[]>([]);
const errorBox = ref<HTMLElement>();
const range = computed(() => rankForScore(Number(draft.score)));
const total = computed(() =>
  Object.values(draft.weights).reduce((sum, value) => sum + value, 0),
);
const advancedTotal = computed(() =>
  WEIGHT_FIELDS.slice(5).reduce(
    (sum, field) => sum + draft.weights[field.key],
    0,
  ),
);
const selectedPreset = computed(
  () =>
    PRESETS.find((item) =>
      WEIGHT_FIELDS.every(
        (field) => item.weights[field.key] === draft.weights[field.key],
      ),
    )?.name,
);
function changeWeight(key: WeightKey, value: number) {
  draft.weights = updateWeight(draft.weights, key, value);
}
function preset(weights: Weights) {
  draft.weights = { ...weights };
}
async function submit() {
  const normalized = {
    ...draft,
    score: Number(draft.score),
    rank:
      draft.rank === null || String(draft.rank) === ""
        ? null
        : Number(draft.rank),
    budget: Number(draft.budget),
  };
  errors.value = validateProfile(normalized);
  if (errors.value.length) {
    await nextTick();
    errorBox.value?.focus();
    return;
  }
  planner.saveProfile(normalized);
  router.push("/recommendations");
}
function reset() {
  Object.assign(draft, createDefaultProfile());
  errors.value = [];
  planner.notify("已恢复示例档案，提交后生效");
}
</script>
<template>
  <div class="page-heading">
    <p class="eyebrow">第一步 / 了解你的情况</p>
    <h1>档案与偏好</h1>
    <p class="muted">
      先确认报考条件，再调整选择的侧重点。档案仅保存在当前浏览器。
    </p>
  </div>
  <form class="form-layout" @submit.prevent="submit" novalidate>
    <div
      v-if="errors.length"
      ref="errorBox"
      class="notice error"
      role="alert"
      tabindex="-1"
    >
      <strong>请检查以下内容</strong>
      <ul>
        <li v-for="error in errors" :key="error">{{ error }}</li>
      </ul>
    </div>
    <section class="panel">
      <div class="row between section-heading">
        <h2>考生基本信息</h2>
        <button class="text-button" type="button" @click="reset">
          使用示例档案
        </button>
      </div>
      <p class="muted small">上海 · 2026 年 · 普通本科批次</p>
      <div class="form-grid">
        <label
          >高考总分 <span class="required">必填</span
          ><input
            v-model.number="draft.score"
            type="number"
            min="0"
            max="660"
            inputmode="numeric"
            required
          /><small>上海本科总分满分 660 分</small></label
        >
        <label
          >位次 <span class="muted">可选</span
          ><input
            v-model.number="draft.rank"
            type="number"
            min="1"
            max="100000"
            inputmode="numeric"
            placeholder="不确定可以留空"
          /><small v-if="range" class="rank-hint"
            >官方同分区间参考：{{ range.start.toLocaleString() }}—{{
              range.end.toLocaleString()
            }}</small
          ><small v-else>当前分数未找到公开本科成绩分布记录</small></label
        >
      </div>
      <fieldset>
        <legend>
          选考科目 <span class="required">选择 3 门</span
          ><span class="selection-count"
            >已选 {{ draft.subjects.length }}/3 门</span
          >
        </legend>
        <div class="subject-grid">
          <label v-for="subject in SUBJECTS" :key="subject" class="subject-chip"
            ><input
              v-model="draft.subjects"
              type="checkbox"
              :value="subject"
              :disabled="
                draft.subjects.length >= 3 && !draft.subjects.includes(subject)
              "
            /><span>{{ subject }}</span></label
          >
        </div>
      </fieldset>
      <fieldset>
        <legend>
          意向专业 <span class="muted small">可多选，不选表示不限</span>
        </legend>
        <div class="chips">
          <label v-for="name in MAJOR_NAMES" :key="name" class="check-chip"
            ><input
              v-model="draft.majorNames"
              type="checkbox"
              :value="name"
            /><span>{{ name }}</span></label
          >
        </div>
      </fieldset>
      <fieldset>
        <legend>
          想去的省市
          <span class="muted small">作为偏好，不强制排除其他地区</span>
        </legend>
        <div class="chips">
          <label v-for="region in REGIONS" :key="region" class="check-chip">
            <input v-model="draft.regions" type="checkbox" :value="region" />
            <span>{{ region }}</span>
          </label>
        </div>
      </fieldset>
    </section>
    <section class="panel">
      <h2>选择你的侧重点</h2>
      <p class="muted small">
        可先使用预设，再逐项调整。修改一项后，其余八项按比例分配，总和保持
        100%。
      </p>
      <div class="chips preset-list">
        <button
          v-for="item in PRESETS"
          :key="item.name"
          type="button"
          class="secondary small-button"
          :aria-pressed="selectedPreset === item.name"
          @click="preset(item.weights)"
        >
          {{ item.name }}
        </button>
      </div>
      <label class="compact-field"
        >城市类别<select v-model="draft.cityTier">
          <option>不限</option>
          <option>一线城市</option>
          <option>区域中心城市</option>
          <option>其他城市</option></select
        ><small>原型城市分组，仅用于偏好示例，不是权威城市排名</small></label
      >
      <div class="weight-grid">
        <WeightControl
          v-for="field in WEIGHT_FIELDS.slice(0, 5)"
          :key="field.key"
          :id="`weight-${field.key}`"
          :label="field.label"
          :hint="field.hint"
          :value="draft.weights[field.key]"
          @change="changeWeight(field.key, $event)"
        />
      </div>
    </section>
    <section class="panel advanced-panel">
      <button
        class="advanced-toggle"
        type="button"
        :aria-expanded="advanced"
        aria-controls="advanced-settings"
        @click="advanced = !advanced"
      >
        <span
          ><span class="advanced-title"
            ><strong>进阶设置</strong
            ><span class="weight-badge">当前共 {{ advancedTotal }}%</span></span
          ><small>就业、考公考编、创新与费用</small></span
        ><span aria-hidden="true">{{ advanced ? "收起 −" : "展开 +" }}</span>
      </button>
      <div v-if="advanced" id="advanced-settings" class="advanced-content">
        <p class="small muted">收起不会停用这些设置，四项权重始终参与计算。</p>
        <label class="compact-field"
          >年度学费与生活费预算（元）<input
            v-model.number="draft.budget"
            type="number"
            min="5000"
            max="200000"
            step="1000"
          /><small
            >费用作为偏好评分参考，超预算项目会降低费用匹配分。</small
          ></label
        >
        <div class="weight-grid">
          <WeightControl
            v-for="field in WEIGHT_FIELDS.slice(5)"
            :key="field.key"
            :id="`weight-${field.key}`"
            :label="field.label"
            :hint="field.hint"
            :value="draft.weights[field.key]"
            @change="changeWeight(field.key, $event)"
          />
        </div>
      </div>
    </section>
    <div class="form-submit">
      <div class="submit-summary">
        九项权重合计 <strong>{{ total }}%</strong>
      </div>
      <button type="submit">保存并查看推荐 →</button>
    </div>
  </form>
</template>
