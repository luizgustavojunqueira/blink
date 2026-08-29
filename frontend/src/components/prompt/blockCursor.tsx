interface BlockCursorProps {
  char: string;
  idle: boolean;
}

export function BlockCursor({ char, idle }: BlockCursorProps) {
  const glyph = char === "" || char === "\n" ? "\u00A0" : char;

  return (
    <span
      className={`bg-cursor text-bg-soft ${idle ? "animate-blink" : ""}`}
      data-testid="block-cursor"
    >
      {glyph}
    </span>
  );
}
