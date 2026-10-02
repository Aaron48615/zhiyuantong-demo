import type { Dataset, Subject } from "../domain/types";

// 学校名称与城市用作界面样本；专业设置、专业组、评分、位次和就业均为模拟，不能作为招生事实。
const schoolRows = [
  ["上海大学", "上海", "上海"],
  ["上海理工大学", "上海", "上海"],
  ["上海海事大学", "上海", "上海"],
  ["上海电力大学", "上海", "上海"],
  ["上海工程技术大学", "上海", "上海"],
  ["上海应用技术大学", "上海", "上海"],
  ["上海第二工业大学", "上海", "上海"],
  ["上海电机学院", "上海", "上海"],
  ["上海商学院", "上海", "上海"],
  ["上海师范大学", "上海", "上海"],
  ["南京工业大学", "南京", "江苏"],
  ["南京邮电大学", "南京", "江苏"],
  ["南京信息工程大学", "南京", "江苏"],
  ["江苏大学", "镇江", "江苏"],
  ["扬州大学", "扬州", "江苏"],
  ["常州大学", "常州", "江苏"],
  ["苏州科技大学", "苏州", "江苏"],
  ["南通大学", "南通", "江苏"],
  ["江苏科技大学", "镇江", "江苏"],
  ["南京工程学院", "南京", "江苏"],
  ["浙江工业大学", "杭州", "浙江"],
  ["杭州电子科技大学", "杭州", "浙江"],
  ["浙江理工大学", "杭州", "浙江"],
  ["宁波大学", "宁波", "浙江"],
  ["浙江工商大学", "杭州", "浙江"],
  ["温州大学", "温州", "浙江"],
  ["浙江科技大学", "杭州", "浙江"],
  ["浙江师范大学", "金华", "浙江"],
  ["中国计量大学", "杭州", "浙江"],
  ["嘉兴大学", "嘉兴", "浙江"],
  ["安徽工业大学", "马鞍山", "安徽"],
  ["安徽理工大学", "淮南", "安徽"],
  ["安徽工程大学", "芜湖", "安徽"],
  ["合肥大学", "合肥", "安徽"],
  ["安徽师范大学", "芜湖", "安徽"],
  ["福州大学", "福州", "福建"],
  ["福建师范大学", "福州", "福建"],
  ["集美大学", "厦门", "福建"],
  ["华侨大学", "泉州", "福建"],
  ["厦门理工学院", "厦门", "福建"],
  ["湖北工业大学", "武汉", "湖北"],
  ["武汉工程大学", "武汉", "湖北"],
  ["武汉科技大学", "武汉", "湖北"],
  ["江汉大学", "武汉", "湖北"],
  ["三峡大学", "宜昌", "湖北"],
  ["长沙理工大学", "长沙", "湖南"],
  ["湖南科技大学", "湘潭", "湖南"],
  ["湖南工业大学", "株洲", "湖南"],
  ["中南林业科技大学", "长沙", "湖南"],
  ["南华大学", "衡阳", "湖南"],
];
const majors = [
  {
    name: "计算机科学与技术",
    subjects: ["物理", "化学"],
    jobs: ["软件开发工程师", "测试工程师", "数据分析师"],
    industry: "软件与信息服务",
    salary: 8500,
    publicService: 70,
  },
  {
    name: "软件工程",
    subjects: ["物理", "化学"],
    jobs: ["前端开发工程师", "后端开发工程师", "软件测试工程师"],
    industry: "软件与互联网",
    salary: 8800,
    publicService: 65,
  },
  {
    name: "自动化",
    subjects: ["物理", "化学"],
    jobs: ["控制工程师", "嵌入式工程师", "自动化工程师"],
    industry: "先进制造",
    salary: 7600,
    publicService: 58,
  },
  {
    name: "电子信息工程",
    subjects: ["物理", "化学"],
    jobs: ["硬件工程师", "通信工程师", "技术支持工程师"],
    industry: "电子与通信",
    salary: 7800,
    publicService: 60,
  },
  {
    name: "工商管理",
    subjects: [],
    jobs: ["运营专员", "管理培训生", "市场分析师"],
    industry: "商业服务",
    salary: 6200,
    publicService: 78,
  },
  {
    name: "国际经济与贸易",
    subjects: [],
    jobs: ["外贸业务员", "供应链专员", "跨境运营专员"],
    industry: "贸易与物流",
    salary: 6500,
    publicService: 72,
  },
];
export const MAJOR_NAMES = majors.map((item) => item.name);
export const REGIONS = [...new Set(schoolRows.map((row) => row[2]))];

export function generateDataset(seed = 2026): Dataset {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const score = (base: number) =>
    Math.max(40, Math.min(98, Math.round(base + random() * 16 - 8)));
  const schools = schoolRows.map(([name, city, province], index) => ({
    id: `school-${index + 1}`,
    name,
    city,
    province,
    tier:
      city === "上海"
        ? "一线城市"
        : ["南京", "杭州", "苏州", "武汉", "长沙", "合肥", "宁波"].includes(
              city,
            )
          ? "区域中心城市"
          : "其他城市",
    level: "本科",
    scores: Array.from({ length: 8 }, () => score(64 + (index % 7) * 4)),
  }));
  const offerings = schools.flatMap((school, schoolIndex) =>
    majors.map((major, majorIndex) => {
      const strength = 62 + ((schoolIndex * 7 + majorIndex * 3) % 28);
      const salary =
        Math.round(
          (major.salary +
            (strength - 70) * 60 +
            (school.city === "上海" ? 600 : 0)) /
            100,
        ) * 100;
      const baseRank = 6500 + ((schoolIndex * 977 + majorIndex * 619) % 29500);
      const employmentRate = 88 + ((strength - 62) % 8);
      const higherStudy = 18 + Math.round((strength - 60) / 3);
      const group = majorIndex < 4 ? "01" : "02";
      return {
        id: `${school.id}-major-${majorIndex + 1}`,
        schoolId: school.id,
        groupId: `${school.id}-demo-${group}`,
        groupName: `示例专业组 ${group}`,
        name: major.name,
        requiredSubjects: major.subjects as Subject[],
        tuition: majorIndex === 1 ? 7000 : 6000,
        livingCost:
          school.city === "上海"
            ? 24000
            : school.tier === "区域中心城市"
              ? 18000
              : 14000,
        scores: Array.from({ length: 6 }, () => score(strength)),
        publicService: score(major.publicService),
        innovation: score(strength),
        history: [2023, 2024, 2025].map((year, i) => ({
          year,
          minRank: Math.round(
            baseRank * (1 + (1 - i) * 0.045 + random() * 0.04),
          ),
        })),
        employment: {
          destinations: [
            { name: "国有企业", value: 15 },
            { name: "私营企业", value: employmentRate - 41 - higherStudy },
            { name: "外资企业", value: 8 },
            { name: "考公考编", value: 6 },
            { name: "自主创业", value: 3 },
            { name: "自由职业", value: 4 },
            { name: "国内升学", value: higherStudy },
            { name: "海外升学", value: 5 },
            { name: "待就业", value: 100 - employmentRate },
          ],
          jobs: major.jobs.map((name, i) => ({
            name,
            salary: salary - i * 400,
            industry: major.industry,
          })),
          regions: [
            { name: school.province, value: 45 },
            { name: school.province === "上海" ? "江苏" : "上海", value: 22 },
            { name: "广东", value: 15 },
            { name: "其他", value: 18 },
          ],
          trend: [2023, 2024, 2025].map((year, i) => ({
            year,
            rate: Math.round((employmentRate - 1 + i * 0.5) * 10) / 10,
          })),
        },
        source: "simulated" as const,
      };
    }),
  );
  return { schools, majors: offerings };
}
export const dataset = generateDataset();
