export type Subject = "物理" | "化学" | "生物" | "政治" | "历史" | "地理";
export type WeightKey =
  | "region"
  | "city"
  | "school"
  | "major"
  | "faculty"
  | "employment"
  | "publicService"
  | "innovation"
  | "cost";
export type Weights = Record<WeightKey, number>;
export type Risk = "冲" | "稳" | "保" | "数据不足";
export interface Profile {
  province: "上海";
  year: 2026;
  score: number;
  rank: number | null;
  subjects: Subject[];
  regions: string[];
  cityTier: string;
  majorNames: string[];
  budget: number;
  preferences: Weights;
  advancedEnabled: boolean;
}
export interface School {
  id: string;
  name: string;
  city: string;
  province: string;
  tier: string;
  level: string;
  scores: number[];
}
export interface Major {
  id: string;
  schoolId: string;
  groupId: string;
  groupName: string;
  name: string;
  requiredSubjects: Subject[];
  tuition: number;
  livingCost: number;
  scores: number[];
  publicService: number;
  innovation: number;
  history: { year: number; minRank: number }[];
  employment: {
    destinations: { name: string; value: number }[];
    jobs: { name: string; salary: number; industry: string }[];
    regions: { name: string; value: number }[];
    trend: { year: number; rate: number }[];
  };
  source: "simulated";
}
export interface Dataset {
  schools: School[];
  majors: Major[];
}
export interface Recommendation {
  id: string;
  school: School;
  major: Major;
  score: number;
  risk: Risk;
  riskReason: string;
  factors: {
    key: WeightKey;
    label: string;
    value: number;
    weight: number;
    contribution: number;
  }[];
  reasons: string[];
}
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface ChatReply {
  answer: string;
  mode: "rules" | "deepseek" | "fallback";
  sources: { title: string; url: string }[];
  category: string;
}
