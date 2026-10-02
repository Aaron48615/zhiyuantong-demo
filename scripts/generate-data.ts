import { mkdir, writeFile } from "node:fs/promises";
import { generateDataset } from "../src/data/generate";

const data = generateDataset();
await mkdir("var", { recursive: true });
await writeFile(
  "var/demo-data.json",
  JSON.stringify({ source: "simulated", seed: 2026, ...data }, null, 2),
);
console.log(
  `已生成 ${data.schools.length} 所示例学校、${data.majors.length} 条专业记录：var/demo-data.json`,
);
