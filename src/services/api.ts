import axios from "axios";
import { dataset } from "../data/generate";
import { recommend } from "../domain/recommend";
import { answerFromData } from "../domain/assistant";
import type {
  ChatMessage,
  ChatReply,
  Profile,
  Recommendation,
} from "../domain/types";

const api = axios.create({ baseURL: "/api", timeout: 25000 });
export async function fetchRecommendations(
  profile: Profile,
): Promise<{ items: Recommendation[]; mode: "api" | "local" }> {
  try {
    const { data } = await api.post<{ items: Recommendation[] }>(
      "/recommendations",
      { profile },
      { timeout: 1800 },
    );
    if (!Array.isArray(data.items)) throw new Error("Invalid response");
    return { items: data.items, mode: "api" };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400)
      throw new Error(error.response.data.error);
    return { items: recommend(dataset, profile), mode: "local" };
  }
}
export async function sendChat(
  messages: ChatMessage[],
  profile: Profile,
): Promise<ChatReply> {
  try {
    const { data } = await api.post<ChatReply>("/chat", { messages, profile });
    if (typeof data.answer !== "string") throw new Error("Invalid response");
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429)
      throw new Error("请求较多，请稍后再试。");
    if (axios.isAxiosError(error) && error.response?.status === 400)
      throw new Error(error.response.data.error);
    return { ...answerFromData(messages, profile), mode: "fallback" };
  }
}
