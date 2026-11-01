import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Browser, findChrome } from "./cdp";
import { METRICS, budgets, type Metric } from "./budgets";
import { measureBulkEdit, measureInteractions, measureLoad, signup, type Samples } from "./scenarios";
import { Stack } from "./stack";
import { stats, type Stats } from "./util";

const SQLITE_MAX_VARIABLES = 32_766;
const REGRESSION_FACTOR = 2;
const REGRESSION_MIN_MS = 10;
const RESULTS = resolve(import.meta.dir, "results");

const { values: args } = parseArgs({
  options: {
    sizes: { type: "string", default: "1000,10000,20000" },
    "load-runs": { type: "string", default: "3" },
    out: { type: "string" },
    compare: { type: "string" },
    keep: { type: "boolean", default: false },
    "save-baseline": { type: "boolean", default: false },
    "no-fail": { type: "boolean", default: false },
  },
});

type Results = Record<string, Partial<Record<Metric, Stats>>>;
type Report = { date: string; commit: string; chrome: string; results: Results };

const sizes = args.sizes.split(",").map((s) => Number(s.trim())).filter((n) => n > 0);
const latest = join(RESULTS, "latest.json");
const baselinePath = join(RESULTS, "baseline.json");
const comparePath = args.compare ?? (existsSync(baselinePath) ? baselinePath : undefined);
const baseline: Report | undefined = comparePath ? JSON.parse(readFileSync(comparePath, "utf8")) : undefined;

const log = (msg: string) => console.error(`[perf] ${msg}`);

function summarize(samples: Samples): Partial<Record<Metric, Stats>> {
  return Object.fromEntries(
    Object.entries(samples)
      .filter(([, values]) => values.length > 0)
      .map(([metric, values]) => [metric, stats(values)]),
  );
}

async function gitCommit() {
  const proc = Bun.spawn(["git", "rev-parse", "--short", "HEAD"], { stdout: "pipe", stderr: "ignore" });
  return (await new Response(proc.stdout).text()).trim();
}

async function chromeVersion(chrome: string) {
  const proc = Bun.spawn([chrome, "--version"], { stdout: "pipe", stderr: "ignore" });
  return (await new Response(proc.stdout).text()).trim();
}

const chrome = findChrome();
const stack = new Stack();
const results: Results = {};

log(`building into ${stack.dir}`);
await stack.build();
await stack.start();
log(`serving on ${stack.baseUrl}`);
const browser = await Browser.launch(chrome);

try {
  for (const size of sizes) {
    const user = `perf${size}`;
    log(`${size} items: seeding`);
    await signup(browser, stack.baseUrl, user);
    stack.seedItems(user, size);

    log(`${size} items: load`);
    const load = await measureLoad(browser, stack.baseUrl, size, Number(args["load-runs"]));
    log(`${size} items: navigation, visual mode, marks, detail, status, prompt`);
    const interactions = await measureInteractions(browser, size);
    const heap = await browser.heapAfterGcMB();

    let bulk: Samples = {};
    if (size <= SQLITE_MAX_VARIABLES) {
      log(`${size} items: :edit on every row`);
      bulk = await measureBulkEdit(browser);
    } else {
      log(`${size} items: skipping :edit, the backend can't bulk edit more than ${SQLITE_MAX_VARIABLES} items`);
    }

    results[size] = { ...summarize({ ...load, ...interactions, ...bulk }), heapAfterGcMB: stats([heap]) };
  }
} finally {
  await browser.close();
  await stack.stop(args.keep);
}

const report: Report = {
  date: new Date().toISOString(),
  commit: await gitCommit(),
  chrome: await chromeVersion(chrome),
  results,
};

const failures: string[] = [];
const pad = (s: string, n: number) => s.padEnd(n);
const cell = (v: string, n: number) => v.padStart(n);

console.log(`\nBlink perf · ${report.commit} · ${report.chrome} · headless, no extensions`);
console.log(
  `p50 ms (p95); ✓/✗ budget on p50; [change vs baseline${baseline ? ` ${baseline.commit}` : ""}], ▲ = over ${REGRESSION_FACTOR}× the baseline\n`,
);
console.log(pad("metric", 36) + sizes.map((s) => cell(`${s} items`, 34)).join(""));

for (const metric of Object.keys(METRICS) as Metric[]) {
  if (!sizes.some((s) => results[s]?.[metric])) continue;
  let line = pad(METRICS[metric], 36);
  for (const size of sizes) {
    const value = results[size]?.[metric];
    if (!value) {
      line += cell("—", 34);
      continue;
    }
    const budget = budgets[size]?.[metric];
    const over = budget !== undefined && value.p50 > budget;
    if (over) failures.push(`${METRICS[metric]} at ${size} items: ${value.p50} > ${budget}`);
    const before = baseline?.results[size]?.[metric]?.p50;
    const regressed =
      before !== undefined && value.p50 > before * REGRESSION_FACTOR && value.p50 - before >= REGRESSION_MIN_MS;
    if (regressed) failures.push(`${METRICS[metric]} at ${size} items: ${value.p50}, baseline ${before}`);
    const delta = before ? ` [${value.p50 >= before ? "+" : ""}${Math.round(((value.p50 - before) / before) * 100)}%${regressed ? "▲" : ""}]` : "";
    const mark = budget === undefined ? "" : over ? ` ✗${budget}` : " ✓";
    line += cell(`${value.p50} (${value.p95})${delta}${mark}`, 34);
  }
  console.log(line);
}

mkdirSync(RESULTS, { recursive: true });
const outPath = args.out ?? join(RESULTS, `${report.date.replace(/[:.]/g, "-")}.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2));
writeFileSync(latest, JSON.stringify(report, null, 2));
console.log(`\nsaved ${outPath}${baseline ? `, compared with ${comparePath}` : ""}`);
if (args["save-baseline"] || !comparePath) {
  writeFileSync(baselinePath, JSON.stringify(report, null, 2));
  console.log(`baseline saved to ${baselinePath}`);
}

if (failures.length > 0) {
  console.log(`\n${failures.length} failed:\n  ${failures.join("\n  ")}`);
} else {
  console.log("\nall budgets met");
}

process.exit(failures.length > 0 && !args["no-fail"] ? 1 : 0);
