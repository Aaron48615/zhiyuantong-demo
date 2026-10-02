<script setup lang="ts">
import { nextTick, ref } from "vue";
import { useRoute } from "vue-router";
import { usePlanner } from "../stores/planner";
import { sendChat } from "../services/api";
import type { ChatMessage, ChatReply } from "../domain/types";
const planner = usePlanner();
const route = useRoute();
const input = ref(String(route.query.question ?? ""));
const messages = ref<(ChatMessage & { reply?: ChatReply })[]>([]);
const loading = ref(false);
const error = ref("");
const end = ref<HTMLElement>();
const suggestions = [
  "上海平行志愿怎么投档？",
  "计算机和软件工程有什么区别？",
  "自动化有哪些就业岗位？",
  "我的分数够上海大学的软件工程吗？",
  "我喜欢计算机，推荐一些浙江的学校",
  "上海大学软件工程近三年位次变化如何？",
];
async function send(question = input.value) {
  const text = question.trim();
  if (!text || loading.value) return;
  if (text.length > 1000) {
    error.value = "单次问题请控制在 1000 字以内。";
    return;
  }
  error.value = "";
  input.value = "";
  loading.value = true;
  messages.value.push({ role: "user", content: text });
  await nextTick();
  end.value?.scrollIntoView({ block: "nearest" });
  try {
    const conversation = messages.value
      .slice(-12)
      .map(({ role, content }) => ({ role, content: content.slice(0, 2000) }));
    const reply = await sendChat(conversation, planner.profile);
    messages.value.push({ role: "assistant", content: reply.answer, reply });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "请求失败，请重试";
    input.value = text;
  } finally {
    loading.value = false;
    await nextTick();
    end.value?.scrollIntoView({ block: "nearest" });
  }
}
</script>
<template>
  <div class="page-heading">
    <p class="eyebrow">结合你的档案，理解选择</p>
    <h1>志愿助手</h1>
    <p class="muted">
      {{ planner.hasProfile ? "当前档案" : "使用示例档案" }}：{{
        planner.summary
      }}
      · 政策 / 专业 / 就业 / 择校 / 推荐 / 数据
    </p>
  </div>
  <div class="notice">
    基础问答可以直接使用；配置服务端 DeepSeek
    后，模型会结合检索到的数据组织回答。提问时会发送当前档案与最近对话，回答会标注实际模式。本轮对话在离开此页面后清空。
  </div>
  <section class="panel chat-panel">
    <div v-if="!messages.length" class="chat-welcome">
      <h2>从一个具体问题开始</h2>
      <p class="muted">
        可以继续追问同一所学校或专业。涉及模拟数据时，回答会明确说明。
      </p>
      <div class="suggestions">
        <button
          v-for="question in suggestions"
          :key="question"
          class="secondary"
          @click="send(question)"
        >
          {{ question }} <span aria-hidden="true">↗</span>
        </button>
      </div>
    </div>
    <div class="messages" role="log" aria-live="polite" aria-label="问答记录">
      <article
        v-for="(message, i) in messages"
        :key="i"
        class="message"
        :class="message.role"
      >
        <div class="message-author">
          {{ message.role === "user" ? "你" : "志愿助手"
          }}<span v-if="message.reply" class="tag">{{
            message.reply.mode === "deepseek"
              ? "DeepSeek · 数据辅助回答"
              : message.reply.mode === "fallback"
                ? "基础问答 · 服务回退"
                : "基础规则问答"
          }}</span>
        </div>
        <p class="message-content">{{ message.content }}</p>
        <ul v-if="message.reply?.sources.length" class="source-list small">
          <li v-for="source in message.reply.sources" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer"
              >{{ source.title }} ↗</a
            >
          </li>
        </ul>
      </article>
      <p v-if="loading" class="muted" role="status">正在查询与整理回答…</p>
      <div ref="end"></div>
    </div>
    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <form class="chat-form" @submit.prevent="send()">
      <label for="question">你的问题</label
      ><textarea
        id="question"
        v-model="input"
        rows="3"
        maxlength="1000"
        placeholder="例如：这所学校的软件工程为什么适合我？"
        :disabled="loading"
      ></textarea>
      <div class="row between">
        <small class="muted"
          >{{ input.length }}/1000 · 不会自动修改已保存偏好</small
        ><button :disabled="loading || !input.trim()">
          {{ loading ? "回答中…" : "发送问题" }}
        </button>
      </div>
    </form>
  </section>
</template>
