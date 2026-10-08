<script setup lang="ts">
defineProps<{
  label: string;
  hint: string;
  value: number;
  weight: number;
  id: string;
}>();
defineEmits<{ change: [value: number] }>();
</script>
<template>
  <div class="weight-control">
    <label :for="id"
      >{{ label }} <strong>{{ value }}<span class="weight-max"> / 10</span></strong></label
    >
    <small :id="`${id}-hint`">{{ hint }} · 计算占比 {{ weight.toFixed(1) }}%</small>
    <input
      :id="id"
      type="range"
      min="0"
      max="10"
      step="1"
      :value="value"
      :style="{ '--weight-progress': `${value * 10}%` }"
      :aria-valuetext="`${value} 档，计算占比 ${weight.toFixed(1)}%`"
      :aria-describedby="`${id}-hint`"
      @input="
        $emit('change', Number(($event.target as HTMLInputElement).value))
      "
    />
    <div class="range-scale" aria-hidden="true"><span>0 不参与</span><span>10 非常重视</span></div>
  </div>
</template>
