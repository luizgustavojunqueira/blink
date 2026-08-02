import {
  PRIORITY_DELIMITER,
  TAG_DELIMITER,
  STATUS_DELIMITER,
  DESCRIPTION_DELIMITER,
} from "../../lib/parser/types";
interface IHighlightedPrompt {
  prompt: string | null;
}
export default function HighlightedPrompt({ prompt }: IHighlightedPrompt) {
  if (prompt === null || prompt === "") return;

  const render = (text: string) => {
    const regex = new RegExp(
      `([\\${PRIORITY_DELIMITER}\\${TAG_DELIMITER}\\${STATUS_DELIMITER}]\\S+|\\${DESCRIPTION_DELIMITER})`,
      "g",
    );
    const parts = text.split(regex);

    let isDescription = false;

    return parts.map((part, i) => {
      if (!part) return null;

      if (part === DESCRIPTION_DELIMITER) {
        isDescription = true;
        return (
          <span key={i} className="text-accent font-medium">
            {part}
          </span>
        );
      }

      if (part.startsWith(PRIORITY_DELIMITER)) {
        const value = part.substring(1).toLowerCase();
        let colorClass = "text-accent";

        if (value === "urgent") colorClass = "text-urgent";
        if (value === "high") colorClass = "text-high";
        if (value === "normal") colorClass = "text-normal";
        if (value === "low") colorClass = "text-low";

        return (
          <span key={i} className={`${colorClass} font-medium`}>
            {part}
          </span>
        );
      }

      if (part.startsWith(TAG_DELIMITER)) {
        return (
          <span key={i} className="text-tag font-medium">
            {part}
          </span>
        );
      }

      if (part.startsWith(STATUS_DELIMITER)) {
        const value = part.substring(1).toLowerCase();
        let colorClass = "text-status";

        if (value === "done") colorClass = "text-done";
        if (value === "in_progress") colorClass = "text-accent";
        if (value === "todo") colorClass = "text-fg-dim";
        if (value === "canceled") colorClass = "text-fg-muted";
        if (value === "archived") colorClass = "text-fg-muted";

        return (
          <span key={i} className={`${colorClass} font-medium`}>
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
