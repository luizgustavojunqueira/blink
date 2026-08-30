import { type ReactNode, type Ref } from "react";
import { BlockCursor } from "./blockCursor";

export interface Token {
  text: string;
  className: string;
}

const defaultTokenize = (text: string): Token[] => [{ text, className: "" }];

const OVERLAY_BASE =
  "absolute inset-0 z-10 overflow-hidden pointer-events-none text-lg leading-normal text-fg";

interface TextOverlayProps {
  text: string;
  tokenize?: (text: string) => Token[];
  ref?: Ref<HTMLDivElement>;
  cursor?: number | null;
  cursorIdle?: boolean;
  wrap?: boolean;
}

export function TextOverlay({
  text,
  tokenize = defaultTokenize,
  ref,
  cursor = null,
  cursorIdle = false,
  wrap = true,
}: TextOverlayProps) {
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

  const wrapClass = wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre";

  return (
    <div ref={ref} className={`${OVERLAY_BASE} ${wrapClass}`} aria-hidden="true">
      {nodes}
    </div>
  );
}
