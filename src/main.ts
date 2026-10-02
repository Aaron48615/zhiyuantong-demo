import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import "./styles.css";

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: "/",
      component: () => import("./views/HomeView.vue"),
      meta: { title: "首页" },
    },
    {
      path: "/profile",
      component: () => import("./views/ProfileView.vue"),
      meta: { title: "档案与偏好" },
    },
    {
      path: "/recommendations",
      component: () => import("./views/ResultsView.vue"),
      meta: { title: "推荐结果" },
    },
    {
      path: "/major/:id",
      component: () => import("./views/DetailView.vue"),
      meta: { title: "院校专业详情" },
    },
    {
      path: "/compare",
      component: () => import("./views/CompareView.vue"),
      meta: { title: "专业对比" },
    },
    {
      path: "/saved",
      component: () => import("./views/SavedView.vue"),
      meta: { title: "候选清单" },
    },
    {
      path: "/assistant",
      component: () => import("./views/AssistantView.vue"),
      meta: { title: "志愿助手" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.afterEach((to) => {
  document.title = `${String(to.meta.title)} · 智愿通`;
});
createApp(App).use(createPinia()).use(router).mount("#app");
