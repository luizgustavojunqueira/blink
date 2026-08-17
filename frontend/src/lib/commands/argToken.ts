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

/**
 * Offset into `rawArgs` where the argument currently being typed/completed
 * starts, given a command with `argCount` positional argument slots.
 *
 * Skips `argCount - 1` already-confirmed tokens (a token only counts as
 * confirmed once it's followed by whitespace); everything from there to the
 * cursor belongs to the argument being completed, however many stray spaces
 * or typos it contains. For argCount <= 1 this is always 0 — the whole of
 * rawArgs is the single argument, so completing it replaces all of it.
 */
export function commandArgStart(rawArgs: string, argCount: number): number {
  let offset = 0;

  for (let i = 0; i < argCount - 1; i++) {
    const match = rawArgs.slice(offset).match(/^(\S+)(\s+)/);
    if (!match) break;
    offset += match[0].length;
  }

  return offset;
}
