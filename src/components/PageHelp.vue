<script setup lang="ts">
import { computed } from "vue";
import { PAGE_HELP, type HelpPage } from "../content/page-help";
import RiskGuide from "./RiskGuide.vue";

const props = defineProps<{ page: HelpPage }>();
const help = computed(() => PAGE_HELP[props.page]);
</script>

<template>
  <details class="page-help">
    <summary>{{ help.title }}</summary>
    <div class="page-help-content">
      <dl class="help-terms">
        <div v-for="entry in help.entries" :key="entry.term">
          <dt>{{ entry.term }}</dt>
          <dd>{{ entry.description }}</dd>
        </div>
      </dl>
      <section v-if="'risk' in help && help.risk" aria-label="冲稳保说明">
        <h2>“冲、稳、保”分别是什么意思？</h2>
        <RiskGuide />
      </section>
    </div>
  </details>
</template>
