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
import { rankForScore, validateProfile } from "../domain/recommend";
import { normalizePreferences } from "../domain/preferences";
import { MAJOR_NAMES, REGIONS } from "../data/generate";
import type { Profile, WeightKey } from "../domain/types";
import WeightControl from "../components/WeightControl.vue";

const planner = usePlanner();
const router = useRouter();
const draft = reactive<Omit<Profile, "score"> & { score: number | "" }>({
  ...JSON.parse(JSON.stringify(planner.profile)),
  score: planner.hasProfile ? planner.profile.score : "",
});
const errors = ref<string[]>([]);
const errorBox = ref<HTMLElement>();
const range = computed(() =>
  draft.score === "" ? null : rankForScore(Number(draft.score)),
);
const activeFields = computed(() =>
  WEIGHT_FIELDS.slice(0, draft.advancedEnabled ? 9 : 5),
);
const total = computed(() =>
  activeFields.value.reduce((sum, { key }) => sum + draft.preferences[key], 0),
);
const preview = computed(() =>
  normalizePreferences(draft.preferences, draft.advancedEnabled),
);
const selectedPreset = computed(
  () =>
    PRESETS.find(
      (item) =>
        item.advancedEnabled === draft.advancedEnabled &&
        WEIGHT_FIELDS.every(
          (field) => item.preferences[field.key] === draft.preferences[field.key],
        ),
    )?.name,
);
function changeWeight(key: WeightKey, value: number) {
  draft.preferences[key] = value;
}
function preset(item: (typeof PRESETS)[number]) {
  draft.preferences = { ...item.preferences };
  draft.advancedEnabled = item.advancedEnabled;
}
async function submit() {
  const normalized = {
    ...draft,
    score: draft.score === "" ? NaN : Number(draft.score),
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
      先确认报考条件，再调整选择的侧重点。
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
          ><small v-else-if="draft.score === ''">填写总分后显示同分区间参考</small
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
        各项重视程度独立调整，0 表示不参与，10 表示非常重视。保存时按启用项换算比例。
      </p>
      <div class="chips preset-list">
        <button
          v-for="item in PRESETS"
          :key="item.name"
          type="button"
          class="secondary small-button"
          :aria-pressed="selectedPreset === item.name"
          @click="preset(item)"
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
          :value="draft.preferences[field.key]"
          :weight="preview[field.key]"
          @change="changeWeight(field.key, $event)"
        />
      </div>
    </section>
    <section class="panel advanced-panel">
      <div class="advanced-toggle">
        <span>
          <span class="advanced-title">
            <strong>进阶偏好</strong>
            <span class="weight-badge">{{ draft.advancedEnabled ? "已启用" : "未启用" }}</span>
          </span>
          <small>启用后加入就业、考公考编、创新与费用四项偏好</small>
        </span>
        <button
          class="advanced-switch"
          type="button"
          role="switch"
          aria-label="启用进阶偏好"
          aria-controls="advanced-settings"
          :aria-checked="draft.advancedEnabled"
          @click="draft.advancedEnabled = !draft.advancedEnabled"
        ><span aria-hidden="true"></span></button>
      </div>
      <div v-if="draft.advancedEnabled" id="advanced-settings" class="advanced-content">
        <p class="small muted">关闭进阶偏好后，这四项不参与计算，设置值会保留。</p>
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
            :value="draft.preferences[field.key]"
            :weight="preview[field.key]"
            @change="changeWeight(field.key, $event)"
          />
        </div>
      </div>
    </section>
    <section class="panel preference-preview" aria-label="权重预览">
      <h2>保存后使用的比例</h2>
      <p class="small muted">根据当前启用项的重视程度换算，保存后应用到推荐。</p>
      <div v-if="total > 0" class="preference-preview-grid">
        <div v-for="field in activeFields" :key="field.key">
          <span>{{ field.label }}</span><strong>{{ preview[field.key].toFixed(1) }}%</strong>
        </div>
      </div>
      <p v-else class="small">请至少将一项已启用的重视程度设为 1 或以上。</p>
    </section>
    <div class="form-submit">
      <div class="submit-summary">
        已启用 {{ activeFields.length }} 项偏好 <strong>{{ total > 0 ? "100%" : "尚未设置" }}</strong>
      </div>
      <button type="submit">保存并查看推荐 →</button>
    </div>
  </form>
</template>
