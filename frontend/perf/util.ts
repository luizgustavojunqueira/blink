import { createServer } from "node:net";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

export type Stats = { p50: number; p95: number; max: number; n: number };

export function stats(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const round = (v: number) => Math.round(v * 10) / 10;
  return { p50: round(at(0.5)), p95: round(at(0.95)), max: round(sorted[sorted.length - 1]), n: sorted.length };
}
