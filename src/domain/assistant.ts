import { OFFICIAL_SOURCES } from "./config";
import { dataset, MAJOR_NAMES } from "../data/generate";
import { recommend } from "./recommend";
import type { ChatMessage, ChatReply, Profile } from "./types";
import { formatScore } from "./scoring";

// 轻量关键词检索：检索当前问题和历史用户消息，使“它”“这所学校”等追问保留上下文。
export function answerFromData(
  messages: ChatMessage[],
  profile: Profile,
): ChatReply {
  const question = messages.at(-1)?.content ?? "";
  const recentQuestions = [...messages]
    .reverse()
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const school =
    dataset.schools.find((s) => question.includes(s.name)) ??
    recentQuestions
      .map((text) => dataset.schools.find((s) => text.includes(s.name)))
      .find(Boolean);
  const majorName =
    MAJOR_NAMES.find((name) => question.includes(name)) ??
    (question.includes("计算机") ? "计算机科学与技术" : undefined) ??
    recentQuestions
      .map(
        (text) =>
          MAJOR_NAMES.find((name) => text.includes(name)) ??
          (text.includes("计算机") ? "计算机科学与技术" : undefined),
      )
      .find(Boolean);
  const candidates = recommend(dataset, profile);
  const selected = candidates.find(
    (r) =>
      (!school || r.school.id === school.id) &&
      (!majorName || r.major.name === majorName),
  );
  const base = { mode: "rules" as const, sources: [] as ChatReply["sources"] };

  if (/政策|平行志愿|投档|调剂|选科|24个|4个/.test(question)) {
    return {
      ...base,
      category: "政策咨询",
      sources: [OFFICIAL_SOURCES[0]],
      answer:
        "上海 2026 年本科普通批次设置 24 个院校专业组平行志愿，每组设 4 个专业志愿，并选择是否服从专业调剂。调剂只能在被投档的专业组内进行。平行志愿按成绩排序并依次检索考生志愿；投档后仍须由高校按招生章程开展专业录取。\n\n选科要求先决定报考资格：专业组要求两门或三门科目时，需要全部满足。其他年份、批次和具体专业的特殊要求，请查对应官方文件。",
    };
  }
  if (
    /[\u4e00-\u9fa5]{2,}(大学|学院)/.test(question) &&
    !dataset.schools.some((s) => question.includes(s.name))
  ) {
    return {
      ...base,
      category: "数据范围",
      answer:
        "当前问题中的学校不在已收录的学校中，暂时无法提供对应的专业、薪资或录取资料。请查看该校官方招生资料。",
    };
  }
  if (/评分|得分|怎么算|评分依据/.test(question) && selected) {
    const dimensions = [...selected.school.scoreDetails, ...selected.major.scoreDetails, ...selected.major.preferenceScoreDetails];
    const dimension = dimensions.find((item) => question.includes(item.label));
    return {
      ...base, category: "评分依据",
      answer: dimension
        ? `${selected.school.name} · ${selected.major.name}\n${dimension.label}：${formatScore(dimension.score)}。\n${dimension.indicators.map((item) => `${item.label}：${item.rawLabel}${['档', '状态'].includes(item.unit) ? '' : item.unit}；${item.rule}；${item.calculation}`).join('\n')}\n统计年份：${dimension.year}。`
        : `当前偏好匹配：${formatScore(selected.score, '资料待补')}。\n${selected.factors.filter((item) => item.weight > 0).map((item) => `${item.label}：${formatScore(item.value)}，权重${item.weight.toFixed(1)}%，${item.contribution === null ? '资料待补' : `贡献${item.contribution.toFixed(2)}分`}。${item.explanation}`).join('\n')}\n可以继续询问“教学质量评分怎么算”，或在详情页展开各维度。`,
    };
  }
  if (/区别|学什么|课程|解读/.test(question)) {
    const introductions: Record<string, string> = {
      自动化:
        "自动化通常涉及控制理论、电子技术、计算机与系统控制，可关注工业控制、嵌入式和机器人等方向。",
      电子信息工程:
        "电子信息工程通常涉及电路、信号处理、通信与电子系统，可关注硬件设计和通信等方向。",
      工商管理:
        "工商管理通常涉及管理学、组织、市场营销和运营，培养方向及实践课程由各校具体设置。",
      国际经济与贸易:
        "国际经济与贸易通常涉及经济学、国际贸易规则、商务与跨境业务，语言能力和实践机会也值得比较。",
    };
    if (majorName && introductions[majorName])
      return {
        ...base,
        category: "专业解读",
        answer: `${introductions[majorName]}\n\n请进一步查看目标学校的培养方案。`,
      };
    return {
      ...base,
      category: "专业解读",
      answer:
        "计算机科学与技术通常涉及计算理论、计算机系统、算法与软件；软件工程通常更强调软件需求、设计、开发、测试与维护。两者课程有重叠，具体培养方向应查看学校当年培养方案。\n\n选择时可以比较课程内容、实践机会和你愿意长期从事的工作。",
    };
  }
  if (/就业|薪资|工资|岗位|企业/.test(question)) {
    if (!selected)
      return {
        ...base,
        category: "就业前景",
        answer:
          "目前选科和专业筛选条件下没有找到对应的专业。你可以在院校资料中查看信息，或先调整专业方向。",
      };
    return {
      ...base,
      category: "就业前景",
      answer: `${selected.school.name} · ${selected.major.name}的典型岗位：\n${selected.major.employment.jobs.map((job) => `${job.name}：月起薪约 ${job.salary} 元，行业为${job.industry}`).join("\n")}\n\n主要去向为${selected.major.employment.regions
        .slice(0, 3)
        .map((r) => `${r.name} ${r.value}%`)
        .join(
          "、",
        )}。`,
    };
  }
  if (/趋势|三年|位次变化|数据分析/.test(question)) {
    if (!selected)
      return {
        ...base,
        category: "数据分析",
        answer:
          "没有找到符合当前条件的学校或专业。请核对名称，或调整筛选条件。",
      };
    return {
      ...base,
      category: "数据分析",
      sources: OFFICIAL_SOURCES.slice(2),
      answer: `${selected.school.name} · ${selected.major.name}的专业参考位次为：\n${selected.major.history.map((h) => `${h.year} 年：${h.minRank}`).join("\n")}\n\n数字越小，通常意味着位次要求越靠前。官方公开参考资料是院校专业组投档线，不能直接当成组内该专业录取线，跨年专业组构成也需要核实。`,
    };
  }
  if (/够|能上|录取|风险|为什么|推荐这/.test(question)) {
    if (!selected)
      return {
        ...base,
        category: "择校建议",
        answer:
          "没有找到符合当前选科和意向专业条件的专业。请核对名称和选科要求。",
      };
    return {
      ...base,
      category: "择校建议",
      answer: `${selected.school.name} · ${selected.major.name}：偏好匹配 ${formatScore(selected.score, "资料待补")}，风险分档为“${selected.risk}”。\n\n${selected.riskReason}\n\n主要得分来源：${selected.reasons.join("；")}。偏好匹配高不等于录取机会高。`,
    };
  }
  if (/推荐|偏好|南方|城市|喜欢|费用|预算/.test(question)) {
    const regional = /南方/.test(question)
      ? ["上海", "江苏", "浙江", "安徽", "福建", "湖北", "湖南"]
      : profile.regions;
    const namedRegion = [
      "上海",
      "江苏",
      "浙江",
      "安徽",
      "福建",
      "湖北",
      "湖南",
    ].filter((r) => question.includes(r));
    const temporary = {
      ...profile,
      regions: namedRegion.length ? namedRegion : regional,
      majorNames: majorName ? [majorName] : profile.majorNames,
    };
    const items = recommend(dataset, temporary).slice(0, 3);
    return {
      ...base,
      category: "偏好推荐",
      answer: items.length
        ? `按本次问题和当前档案，先比较以下选择：\n${items.map((r, i) => `${i + 1}. ${r.school.name} · ${r.major.name}：匹配 ${formatScore(r.score, "资料待补")}，${r.risk}`).join("\n")}\n\n这次查询没有修改已保存的偏好。若希望长期应用这些条件，请到“档案与偏好”调整。`
        : "当前条件下没有可推荐的专业，请检查选科、专业方向和本科分数要求。",
    };
  }
  return {
    ...base,
    category: "使用帮助",
    answer:
      "我可以结合当前考生档案回答政策、专业、就业、择校、偏好推荐和数据分析问题。例如：“上海平行志愿怎么投档？”“软件工程和计算机有什么区别？”“推荐一些计算机专业”。\n\n当前使用基础规则问答，关键词识别能力有限。配置服务端 DeepSeek 密钥后可使用模型整理回答。",
  };
}
