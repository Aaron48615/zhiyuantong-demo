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
        <span class="brand-symbol" aria-hidden="true">智</span>
        <span class="brand-name"
          >智愿通<small>上海本科 · 2026 演示</small></span
        >
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
    上海普通本科场景原型 · 专业配置、评分与就业为模拟数据 · 不用于正式志愿填报
  </footer>
  <div v-if="planner.toast" class="toast" role="status">
    {{ planner.toast }}
  </div>
</template>
