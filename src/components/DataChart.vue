<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import type { ScoreValue } from "../domain/types";
import { formatScore } from "../domain/scoring";
import {
  init,
  use,
  type EChartsCoreOption,
  type EChartsType,
} from "echarts/core";
import { RadarChart, PieChart, LineChart } from "echarts/charts";
import {
  RadarComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  AriaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
use([
  RadarChart,
  PieChart,
  LineChart,
  RadarComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  AriaComponent,
  CanvasRenderer,
]);
const props = defineProps<{
  kind: "radar" | "pie" | "line";
  labels: string[];
  values: ScoreValue[];
  title: string;
}>();
const element = ref<HTMLElement>();
const complete = computed(() => props.labels.length === props.values.length && props.values.length > 0 && props.values.every((value) => typeof value === 'number' && Number.isFinite(value)));
let chart: EChartsType | undefined;
let observer: ResizeObserver | undefined;
function render() {
  if (!complete.value) { chart?.clear(); return; }
  if (!element.value?.clientWidth || !element.value.clientHeight) return;
  chart ??= init(element.value);
  chart.resize();
  const option: EChartsCoreOption = {
    color: [
      "#142a4a",
      "#2563eb",
      "#6096ce",
      "#9cbce0",
      "#c3d7eb",
      "#748198",
      "#a18b6b",
      "#c8b89d",
      "#d9dfe7",
    ],
    animation: false,
    aria: { enabled: true },
    tooltip: {},
  };
  if (props.kind === "radar") {
    option.radar = {
      indicator: props.labels.map((name) => ({ name, max: 100 })),
      radius: "58%",
      axisName: { fontSize: 11, color: "#4b5563" },
    };
    option.series = [
      {
        type: "radar",
        data: [{ value: props.values, name: props.title }],
        areaStyle: { opacity: 0.12 },
      },
    ];
  } else if (props.kind === "pie") {
    option.legend = { bottom: 0, textStyle: { fontSize: 11 } };
    option.series = [
      {
        type: "pie",
        radius: ["32%", "58%"],
        center: ["50%", "40%"],
        label: { show: false },
        data: props.labels.map((name, i) => ({ name, value: props.values[i] })),
      },
    ];
  } else {
    option.grid = { left: 45, right: 20, top: 30, bottom: 35 };
    option.xAxis = { type: "category", data: props.labels };
    option.yAxis = {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { formatter: "{value}%" },
    };
    option.series = [
      {
        type: "line",
        data: props.values,
        symbolSize: 8,
        label: { show: true, formatter: "{c}%" },
      },
    ];
  }
  chart?.setOption(option, true);
}
onMounted(() => {
  if (element.value) {
    render();
    observer = new ResizeObserver(() => {
      if (!complete.value) return;
      if (chart) chart.resize();
      else render();
    });
    observer.observe(element.value);
  }
});
watch(() => [props.labels, props.values, props.kind], render, { deep: true, flush: "post" });
onBeforeUnmount(() => {
  observer?.disconnect();
  chart?.dispose();
});
</script>
<template>
  <div
    v-show="complete"
    ref="element"
    class="data-chart"
    role="img"
    :aria-label="`${title}：${labels.map((label, i) => `${label} ${formatScore(values[i])}`).join('，')}`"
  ></div>
  <p v-if="!complete" class="chart-unavailable">部分评分资料待补，下方保留已有指标。补齐后显示完整图表。</p>
</template>
