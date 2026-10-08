<script setup lang="ts">
import { ref } from "vue";
import { usePlanner } from "./stores/planner";
const planner = usePlanner();
const mainContent = ref<HTMLElement>();
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="mainContent?.focus()"
    >跳到主要内容</a
  >
  <header class="site-header">
    <div class="header-inner">
      <RouterLink class="brand" to="/">
        <span class="brand-name">智愿通</span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink to="/profile">档案</RouterLink>
        <RouterLink to="/recommendations">选专业</RouterLink>
        <RouterLink to="/compare"
          >对比<span v-if="planner.compareIds.length" class="nav-count">
            {{ planner.compareIds.length }}</span
          ></RouterLink
        >
        <RouterLink to="/saved"
          >候选<span v-if="planner.savedIds.length" class="nav-count">{{
            planner.savedIds.length
          }}</span></RouterLink
        >
        <RouterLink to="/assistant">问助手</RouterLink>
      </nav>
    </div>
  </header>
  <main id="main" ref="mainContent" class="container" tabindex="-1">
    <div v-if="planner.storageWarning" class="notice warning" role="status">
      {{ planner.storageWarning }}
    </div>
    <RouterView />
  </main>
  <footer class="site-footer">
    © 2026 智愿通. All rights reserved.
  </footer>
  <div v-if="planner.toast" class="toast" role="status">
    {{ planner.toast }}
  </div>
</template>
