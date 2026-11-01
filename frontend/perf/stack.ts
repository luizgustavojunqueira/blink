import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { preview, type PreviewServer } from "vite";
import { freePort, sleep } from "./util";

const FRONTEND = resolve(import.meta.dir, "..");
const BACKEND = resolve(FRONTEND, "../backend");

const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"];
const PRIORITIES = ["LOW", "NORMAL", "NORMAL", "HIGH", "URGENT"];
const TAGS = [null, "work", "work,urgent", null, "home", "misc"];

export const PASSWORD = "perf-password-123";

async function run(cmd: string[], cwd: string) {
  const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`${cmd.join(" ")} failed (${code}):\n${err}`);
  }
}

export class Stack {
  readonly dir = mkdtempSync(join(tmpdir(), "blink-perf-"));
  readonly dbPath = join(this.dir, "perf.db");
  private backend?: ReturnType<typeof Bun.spawn>;
  private server?: PreviewServer;
  baseUrl = "";

  async build() {
    await run(["bunx", "vite", "build", "--outDir", join(this.dir, "dist"), "--emptyOutDir", "--logLevel", "error"], FRONTEND);
    await run(["go", "build", "-o", join(this.dir, "blink"), "./cmd"], BACKEND);
  }

  async start() {
    const apiPort = await freePort();
    this.backend = Bun.spawn([join(this.dir, "blink")], {
      cwd: this.dir,
      env: { ...process.env, PORT: String(apiPort), DB_PATH: this.dbPath, MCP_TOKEN: "" },
      stdout: "ignore",
      stderr: "ignore",
    });
    const apiUrl = `http://127.0.0.1:${apiPort}`;
    for (let i = 0; ; i++) {
      if (await fetch(`${apiUrl}/api/health`).then((r) => r.ok).catch(() => false)) break;
      if (i > 100) throw new Error("backend did not start");
      await sleep(100);
    }

    const uiPort = await freePort();
    this.server = await preview({
      root: FRONTEND,
      configFile: false,
      logLevel: "silent",
      build: { outDir: join(this.dir, "dist") },
      preview: {
        host: "127.0.0.1",
        port: uiPort,
        strictPort: true,
        proxy: { "/api": { target: apiUrl, changeOrigin: true } },
      },
    });
    this.baseUrl = `http://127.0.0.1:${uiPort}/`;
  }

  seedItems(username: string, count: number) {
    const db = new Database(this.dbPath);
    db.exec("PRAGMA busy_timeout = 5000");
    const user = db.query<{ id: number }, [string]>("SELECT id FROM users WHERE username = ?").get(username);
    if (!user) throw new Error(`user ${username} not found`);

    const insert = db.prepare(
      "INSERT INTO items (guid, title, description, type, status, priority, tags, user_id) VALUES (?, ?, ?, 'TASK', ?, ?, ?, ?)",
    );
    db.transaction(() => {
      for (let i = 0; i < count; i++) {
        insert.run(
          `${username}-${i}`,
          `task ${i} for the performance run`,
          i % 3 === 0 ? `notes about task ${i}` : null,
          STATUSES[i % STATUSES.length],
          PRIORITIES[i % PRIORITIES.length],
          TAGS[i % TAGS.length],
          user.id,
        );
      }
    })();
    db.close();
  }

  async stop(keep = false) {
    await this.server?.close();
    this.backend?.kill();
    await this.backend?.exited;
    if (!keep) rmSync(this.dir, { recursive: true, force: true });
  }
}
