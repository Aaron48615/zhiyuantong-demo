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
export type ScoreValue = number | null;
export interface IndicatorObservation {
  value: ScoreValue;
  unit: string;
  year: number;
  source: "simulated";
  sampleSize?: number;
  missingReason?: string;
}
export interface IndicatorResult {
  id: string;
  label: string;
  rawValue: ScoreValue;
  rawLabel: string;
  unit: string;
  year: number | null;
  sampleSize?: number;
  sourceLabel: string;
  normalized: ScoreValue;
  weight: number;
  contribution: ScoreValue;
  rule: string;
  calculation: string;
  missingReason: string | null;
}
export interface DimensionScore {
  id: string;
  label: string;
  score: ScoreValue;
  version: string;
  year: number;
  indicators: IndicatorResult[];
  missingReasons: string[];
}
export type IndicatorData = Record<string, IndicatorObservation>;
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
  indicators: IndicatorData;
  scores: ScoreValue[];
  scoreDetails: DimensionScore[];
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
  indicators: IndicatorData;
  scores: ScoreValue[];
  scoreDetails: DimensionScore[];
  preferenceScoreDetails: DimensionScore[];
  publicService: ScoreValue;
  innovation: ScoreValue;
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
  score: ScoreValue;
  missingFactors: string[];
  risk: Risk;
  riskReason: string;
  factors: {
    key: WeightKey;
    label: string;
    value: ScoreValue;
    weight: number;
    contribution: ScoreValue;
    explanation: string;
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
