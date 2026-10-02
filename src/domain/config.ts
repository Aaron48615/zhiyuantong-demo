import type { Profile, Subject, WeightKey, Weights } from "./types";

export const SUBJECTS: Subject[] = [
  "物理",
  "化学",
  "生物",
  "政治",
  "历史",
  "地理",
];
export const WEIGHT_FIELDS: { key: WeightKey; label: string; hint: string }[] =
  [
    { key: "region", label: "地域偏好", hint: "是否位于你选择的省市" },
    { key: "city", label: "城市类别", hint: "是否符合你偏好的城市类型" },
    { key: "school", label: "学校综合排名", hint: "学校八项评分的平均值" },
    { key: "major", label: "专业排名", hint: "专业六项评分的平均值" },
    { key: "faculty", label: "专业师资力量", hint: "该专业的师资匹配评分" },
    {
      key: "employment",
      label: "就业质量",
      hint: "学校就业质量与专业薪资评分的平均值",
    },
    {
      key: "publicService",
      label: "考公考编友好度",
      hint: "专业岗位适配的示例评分",
    },
    { key: "innovation", label: "创新能力", hint: "实践与创新机会的示例评分" },
    { key: "cost", label: "学费与生活成本", hint: "年度费用是否在你的预算内" },
  ];
export const SCHOOL_DIMENSIONS = [
  "学术声誉",
  "教学质量",
  "就业质量",
  "硬件设施",
  "师资力量",
  "国际化程度",
  "校园文化",
  "发展潜力",
];
export const MAJOR_DIMENSIONS = [
  "专业实力",
  "课程设置",
  "师资匹配度",
  "深造支持",
  "薪资水平",
  "行业认可度",
];
export const DEFAULT_WEIGHTS: Weights = {
  region: 15,
  city: 10,
  school: 15,
  major: 15,
  faculty: 10,
  employment: 15,
  publicService: 5,
  innovation: 5,
  cost: 10,
};
export const PRESETS: { name: string; weights: Weights }[] = [
  { name: "均衡考虑", weights: DEFAULT_WEIGHTS },
  {
    name: "更重视就业",
    weights: {
      region: 10,
      city: 5,
      school: 10,
      major: 15,
      faculty: 10,
      employment: 30,
      publicService: 5,
      innovation: 5,
      cost: 10,
    },
  },
  {
    name: "更重视学校",
    weights: {
      region: 10,
      city: 5,
      school: 35,
      major: 15,
      faculty: 10,
      employment: 10,
      publicService: 5,
      innovation: 5,
      cost: 5,
    },
  },
  {
    name: "更重视费用",
    weights: {
      region: 10,
      city: 5,
      school: 10,
      major: 15,
      faculty: 5,
      employment: 15,
      publicService: 5,
      innovation: 5,
      cost: 30,
    },
  },
];
export function createDefaultProfile(): Profile {
  return {
    province: "上海",
    year: 2026,
    score: 535,
    rank: null,
    subjects: ["物理", "化学", "生物"],
    regions: ["上海", "江苏", "浙江"],
    cityTier: "不限",
    majorNames: [],
    budget: 30000,
    weights: { ...DEFAULT_WEIGHTS },
  };
}
export const OFFICIAL_SOURCES = [
  {
    title: "2026 上海志愿填报与投档录取实施办法",
    url: "https://www.shmeea.edu.cn/page/06300/20260402/20156.html",
  },
  {
    title: "2026 上海考生成绩分布表",
    url: "https://www.shmeea.edu.cn/download/20260623/2/0.pdf",
  },
  {
    title: "2023 本科普通批次院校专业组投档线",
    url: "https://www.shmeea.edu.cn/download/20230721/11115.pdf",
  },
  {
    title: "2024 本科普通批次院校专业组投档线",
    url: "https://www.shmeea.edu.cn/download/20240719/198.pdf",
  },
  {
    title: "2025 本科普通批次院校专业组投档线",
    url: "https://www.shmeea.edu.cn/download/20250719/186.pdf",
  },
];
