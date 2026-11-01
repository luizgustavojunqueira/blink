import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freePort, sleep } from "./util";

const CHROME_NAMES = ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome", "chrome"];

export function findChrome(): string {
  const fromEnv = process.env.CHROME;
  if (fromEnv) return fromEnv;
  for (const name of CHROME_NAMES) {
    const path = Bun.which(name);
    if (path) return path;
  }
  throw new Error(`no Chromium found; set CHROME to its path (tried ${CHROME_NAMES.join(", ")})`);
}

type Pending = { resolve: (value: unknown) => void; reject: (err: Error) => void };

export class Browser {
  private ws!: WebSocket;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private listeners = new Map<string, Set<(params: unknown) => void>>();

  private constructor(
    private proc: ReturnType<typeof Bun.spawn>,
    private profileDir: string,
  ) {}

  static async launch(chrome: string, width = 1568, height = 900): Promise<Browser> {
    const port = await freePort();
    const profileDir = mkdtempSync(join(tmpdir(), "blink-perf-chrome-"));
    const proc = Bun.spawn(
      [
        chrome,
        "--headless=new",
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profileDir}`,
        `--window-size=${width},${height}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-background-networking",
        "--enable-precise-memory-info",
        "about:blank",
      ],
      { stdout: "ignore", stderr: "ignore" },
    );

    const browser = new Browser(proc, profileDir);
    const target = await browser.newTarget(port);
    await browser.connect(target);
    await browser.send("Page.enable");
    await browser.send("Runtime.enable");
    return browser;
  }

  private async newTarget(port: number): Promise<string> {
    for (let i = 0; i < 100; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
        const target = (await res.json()) as { webSocketDebuggerUrl: string };
        return target.webSocketDebuggerUrl;
      } catch {
        await sleep(100);
      }
    }
    throw new Error("Chromium did not start");
  }

  private connect(url: string): Promise<void> {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.listeners.get(msg.method)?.forEach((fn) => fn(msg.params));
      }
    };
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error("could not connect to Chromium"));
    });
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method: string, fn: (params: unknown) => void): () => void {
    let set = this.listeners.get(method);
    if (!set) this.listeners.set(method, (set = new Set()));
    set.add(fn);
    return () => set.delete(fn);
  }

  async evaluate<T = unknown>(expression: string, timeoutMs = 60_000): Promise<T> {
    const result = await Promise.race([
      this.send<{ result: { value: T }; exceptionDetails?: { exception?: { description?: string } } }>(
        "Runtime.evaluate",
        { expression, awaitPromise: true, returnByValue: true },
      ),
      sleep(timeoutMs).then(() => {
        throw new Error(`page did not answer within ${timeoutMs}ms`);
      }),
    ]);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? "page script failed");
    }
    return result.result.value;
  }

  async navigate(url: string) {
    const loaded = new Promise<void>((resolve) => {
      const off = this.on("Page.loadEventFired", () => {
        off();
        resolve();
      });
    });
    await this.send("Page.navigate", { url });
    await loaded;
  }

  async heapAfterGcMB(): Promise<number> {
    await this.send("HeapProfiler.enable");
    await this.send("HeapProfiler.collectGarbage");
    await this.send("HeapProfiler.collectGarbage");
    const { usedSize } = await this.send<{ usedSize: number }>("Runtime.getHeapUsage");
    return Math.round(usedSize / 1e6);
  }

  async close() {
    await Promise.race([this.send("Browser.close").catch(() => undefined), sleep(2000)]);
    this.ws?.close();
    await Promise.race([this.proc.exited, sleep(3000)]);
    this.proc.kill("SIGKILL");
    await this.proc.exited;
    await sleep(500);
    rmSync(this.profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
