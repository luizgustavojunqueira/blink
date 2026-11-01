import type { Browser } from "./cdp";
import { PASSWORD } from "./stack";
import { sleep } from "./util";

export type Samples = Record<string, number[]>;

const HELPERS = `
window.__perf = {
  yieldTask: () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }),
  async settle() { await this.yieldTask(); await this.yieldTask(); document.body.offsetHeight; },
  async press(key, target = window) {
    const t = performance.now();
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    await this.settle();
    return performance.now() - t;
  },
  async type(text) {
    const el = document.activeElement;
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    const times = [];
    for (const ch of text) {
      const t = performance.now();
      set.call(el, el.value + ch);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await this.settle();
      times.push(performance.now() - t);
    }
    return times;
  },
  async home() { await this.press("Escape"); await this.press("Escape"); await this.press("g"); await this.press("g"); },
  prompt: () => document.querySelector("[data-testid=prompt]"),
};
true`;

const watchList = (count: number) => `
(() => {
  const want = ${count};
  const observer = new MutationObserver(() => {
    if (document.querySelectorAll("[data-item-guid]").length < want) return;
    observer.disconnect();
    window.__listCommitAt = performance.now();
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__listVisibleAt = performance.now(); }));
  });
  observer.observe(document, { childList: true, subtree: true });
})();`;

export async function signup(browser: Browser, baseUrl: string, username: string) {
  await browser.navigate(baseUrl);
  for (let attempt = 0; attempt < 20; attempt++) {
    const status = await browser.evaluate<number>(
      `fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: ${JSON.stringify(username)}, password: ${JSON.stringify(PASSWORD)} }) }).then((r) => r.status)`,
    );
    if (status < 300) return;
    if (status !== 429) throw new Error(`signup ${username} failed with ${status}`);
    await sleep(3000);
  }
  throw new Error(`signup ${username} stayed rate limited`);
}

export async function measureLoad(browser: Browser, baseUrl: string, count: number, runs: number): Promise<Samples> {
  const { identifier } = await browser.send<{ identifier: string }>("Page.addScriptToEvaluateOnNewDocument", {
    source: watchList(count),
  });
  const out: Samples = { apiItems: [], firstRender: [], listVisible: [] };
  try {
    for (let i = 0; i < runs; i++) {
      await browser.navigate("about:blank");
      await browser.navigate(baseUrl);
      const result = await browser.evaluate<{ api: number; apiEnd: number; visible: number } | null>(`(async () => {
        for (let i = 0; i < 1200 && window.__listVisibleAt === undefined; i++) await new Promise((r) => setTimeout(r, 50));
        const res = performance.getEntriesByType("resource").find((e) => new URL(e.name).pathname === "/api/items" && new URL(e.name).search === "");
        if (window.__listVisibleAt === undefined || !res) return null;
        return { api: res.responseEnd - res.requestStart, apiEnd: res.responseEnd, visible: window.__listVisibleAt };
      })()`, 90_000);
      if (!result) throw new Error(`the list never showed ${count} rows`);
      out.apiItems.push(result.api);
      out.listVisible.push(result.visible);
      out.firstRender.push(result.visible - result.apiEnd);
    }
  } finally {
    await browser.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  }
  await sleep(500);
  await browser.evaluate(HELPERS);
  return out;
}

export async function measureInteractions(browser: Browser, count: number): Promise<Samples> {
  const big = count >= 20_000;
  const moves = big ? 40 : 100;
  const bulkRuns = big ? 1 : 3;

  return browser.evaluate<Samples>(`(async () => {
    const p = window.__perf;
    const R = {};
    const repeat = async (n, fn) => { const a = []; for (let i = 0; i < n; i++) a.push(await fn(i)); return a; };

    await p.home();
    R.cursorDown = await repeat(${moves}, () => p.press("j"));
    R.cursorUp = await repeat(${moves}, () => p.press("k"));

    R.jumpBottom = [];
    R.jumpTop = [];
    for (let i = 0; i < 10; i++) {
      R.jumpBottom.push(await p.press("G"));
      await p.press("g");
      R.jumpTop.push(await p.press("g"));
    }

    await p.home();
    await p.press("v");
    R.visualCursor = await repeat(10, () => p.press("j"));
    await p.press("Escape");
    await p.press("Escape");

    R.visualStart = [];
    R.visualSelectAll = [];
    R.visualCommit = [];
    for (let i = 0; i < ${bulkRuns}; i++) {
      await p.home();
      R.visualStart.push(await p.press("v"));
      R.visualSelectAll.push(await p.press("G"));
      R.visualCommit.push(await p.press("Escape"));
      await p.press("Escape");
    }

    await p.home();
    R.mark = await repeat(20, async () => { const t = await p.press(" "); await p.press("j"); return t; });
    await p.press("Escape");

    R.detailOpen = [];
    R.detailClose = [];
    for (let i = 0; i < 10; i++) {
      R.detailOpen.push(await p.press("l"));
      R.detailClose.push(await p.press("h"));
    }

    R.statusChange = await repeat(20, (i) => p.press(i % 2 ? "1" : "2"));

    await p.press("i");
    R.promptTyping = await p.type("number 12 abc");
    await p.press("Escape", p.prompt());
    await p.press("Escape");

    return R;
  })()`, 300_000);
}

export async function measureBulkEdit(browser: Browser): Promise<Samples> {
  return browser.evaluate<Samples>(`(async () => {
    const p = window.__perf;
    await p.home();
    await p.press("v");
    await p.press("G");
    await p.press("Escape");
    const marked = document.querySelectorAll("li [aria-pressed=true]").length;

    await p.press(":");
    await p.type("edit @DONE ");
    await new Promise((r) => setTimeout(r, 300));

    let request = null;
    const observer = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (e.name.includes("/api/items/bulk")) request = e;
    });
    observer.observe({ type: "resource" });

    const t0 = performance.now();
    p.prompt().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    const blocked = performance.now() - t0;

    for (let i = 0; i < 1200 && (!request || p.prompt().value !== ""); i++) await new Promise((r) => setTimeout(r, 25));
    await p.settle();
    const total = performance.now() - t0;
    observer.disconnect();
    if (!request) throw new Error("the bulk edit request was never sent (" + marked + " rows marked)");

    return {
      bulkEditBlocked: [blocked],
      bulkEditRequestStart: [request.startTime - t0],
      bulkEditServer: [request.responseEnd - request.startTime],
      bulkEditTotal: [total],
    };
  })()`, 120_000);
}
