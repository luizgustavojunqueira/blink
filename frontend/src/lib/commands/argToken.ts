export function currentArgToken(rawArgs: string): {
  done: string;
  current: string;
} {
  const idx = rawArgs.lastIndexOf(" ");

  return {
    done: idx === -1 ? "" : rawArgs.slice(0, idx + 1),
    current: idx === -1 ? rawArgs : rawArgs.slice(idx + 1),
  };
}
