import { type ReactNode, type Ref } from "react";
import {
  PRIORITY_MODIFIER,
  TAG_MODIFIER,
  STATUS_MODIFIER,
  DESCRIPTION_MODIFIER,
} from "../../lib/modifiers/delimiters.ts";
import { PRIORITY_CLASS, STATUS_CLASS } from "../../lib/validator";
import { BlockCursor } from "./blockCursor";

interface IHighlightedPrompt {
  prompt: string | null;
  ref?: Ref<HTMLDivElement>;
  cursor?: number | null;
  cursorIdle?: boolean;
}

interface Token {
  text: string;
  className: string;
}

const OVERLAY_CLASS =
  "absolute inset-0 z-10 overflow-hidden pointer-events-none whitespace-pre-wrap break-words text-lg leading-normal text-fg";

function tokenize(text: string): Token[] {
  const regex = new RegExp(
    `([\\${PRIORITY_MODIFIER}\\${TAG_MODIFIER}\\${STATUS_MODIFIER}]\\S+|\\${DESCRIPTION_MODIFIER})`,
    "g",
  );
  const parts = text.split(regex);
  const tokens: Token[] = [];
  let isDescription = false;

  for (const part of parts) {
    if (!part) continue;

    if (part === DESCRIPTION_MODIFIER) {
      isDescription = true;
      tokens.push({ text: part, className: "text-accent font-medium" });
      continue;
    }

    if (part.startsWith(PRIORITY_MODIFIER) || part.startsWith(STATUS_MODIFIER)) {
      const value = part.slice(1).toLowerCase();

      if (!value) {
        tokens.push({ text: part, className: "text-accent font-medium" });
        continue;
      }

      const colorClass = part.startsWith(PRIORITY_MODIFIER)
        ? PRIORITY_CLASS[value]
        : STATUS_CLASS[value];

      tokens.push({
        text: part,
        className: colorClass ? `${colorClass} font-medium` : "text-danger line-through font-bold",
      });
      continue;
    }

    if (part.startsWith(TAG_MODIFIER)) {
      tokens.push({ text: part, className: "text-tag font-medium" });
      continue;
    }

    tokens.push({ text: part, className: isDescription ? "text-fg-dim" : "" });
  }

  return tokens;
}

export default function HighlightedPrompt({
  prompt,
  ref,
  cursor = null,
  cursorIdle = false,
}: IHighlightedPrompt) {
  const text = prompt ?? "";

  if (text === "" && cursor === null) return null;

  const nodes: ReactNode[] = [];
  let offset = 0;
  let placed = false;

  tokenize(text).forEach((token, i) => {
    const end = offset + token.text.length;

    if (!placed && cursor !== null && cursor >= offset && cursor < end) {
      const at = cursor - offset;
      const char = token.text[at];
      const before = token.text.slice(0, at);
      const after = token.text.slice(char === "\n" ? at : at + 1);

      if (before) {
        nodes.push(
          <span key={`${i}-before`} className={token.className}>
            {before}
          </span>,
        );
      }

      nodes.push(
        <span key={`${i}-cursor`} className={token.className}>
          <BlockCursor char={char} idle={cursorIdle} />
        </span>,
      );

      if (after) {
        nodes.push(
          <span key={`${i}-after`} className={token.className}>
            {after}
          </span>,
        );
      }

      placed = true;
    } else {
      nodes.push(
        <span key={i} className={token.className}>
          {token.text}
        </span>,
      );
    }

    offset = end;
  });

  if (cursor !== null && !placed) {
    nodes.push(<BlockCursor key="cursor" char="" idle={cursorIdle} />);
  }

  return (
    <div ref={ref} className={OVERLAY_CLASS} aria-hidden="true">
      {nodes}
    </div>
  );
}
