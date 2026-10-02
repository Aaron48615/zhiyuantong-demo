<script setup lang="ts">
defineProps<{ label: string; hint: string; value: number; id: string }>();
defineEmits<{ change: [value: number] }>();
</script>
<template>
  <div class="weight-control">
    <label :for="id"
      >{{ label }} <strong>{{ value }}%</strong></label
    >
    <input
      :id="id"
      type="range"
      min="0"
      max="100"
      step="1"
      :value="value"
      :aria-describedby="`${id}-hint`"
      @input="
        $emit('change', Number(($event.target as HTMLInputElement).value))
      "
    />
    <small :id="`${id}-hint`">{{ hint }}</small>
  </div>
</template>
