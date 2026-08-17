import {
  PRIORITY_MODIFIER,
  TAG_MODIFIER,
  STATUS_MODIFIER,
  DESCRIPTION_MODIFIER,
} from "../../lib/modifiers/delimiters.ts";
import { PRIORITY_CLASS, STATUS_CLASS } from "../../lib/validator";

interface IHighlightedPrompt {
  prompt: string | null;
}

export default function HighlightedPrompt({ prompt }: IHighlightedPrompt) {
  if (prompt === null || prompt === "") return null;

  const render = (text: string) => {
    const regex = new RegExp(
      `([\\${PRIORITY_MODIFIER}\\${TAG_MODIFIER}\\${STATUS_MODIFIER}]\\S+|\\${DESCRIPTION_MODIFIER})`,
      "g",
    );
    const parts = text.split(regex);
    let isDescription = false;

    return parts.map((part, i) => {
      if (!part) return null;

      if (part === DESCRIPTION_MODIFIER) {
        isDescription = true;
        return (
          <span key={i} className="text-accent font-medium">
            {part}
          </span>
        );
      }

      if (part.startsWith(PRIORITY_MODIFIER)) {
        const value = part.slice(1).toLowerCase();

        if (!value) {
          return (
            <span key={i} className="text-accent font-medium">
              {part}
            </span>
          );
        }

        const colorClass = PRIORITY_CLASS[value];

        return (
          <span
            key={i}
            className={
              colorClass
                ? `${colorClass} font-medium`
                : "text-danger line-through font-bold"
            }
          >
            {part}
          </span>
        );
      }
      if (part.startsWith(TAG_MODIFIER)) {
        return (
          <span key={i} className="text-tag font-medium">
            {part}
          </span>
        );
      }

      if (part.startsWith(STATUS_MODIFIER)) {
        const value = part.slice(1).toLowerCase();

        if (!value) {
          return (
            <span key={i} className="text-accent font-medium">
              {part}
            </span>
          );
        }

        const colorClass = STATUS_CLASS[value];

        return (
          <span
            key={i}
            className={
              colorClass
                ? `${colorClass} font-medium`
                : "text-danger line-through font-bold"
            }
          >
            {part}
          </span>
        );
      }
      if (isDescription) {
        return (
          <span key={i} className="text-fg-dim">
            {part}
          </span>
        );
      }

      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="absolute inset-0 text-lg pointer-events-none whitespace-pre text-fg flex items-center"
      aria-hidden="true"
    >
      {render(prompt)}
    </div>
  );
}
