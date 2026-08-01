import { useRef, useState, type KeyboardEvent } from "react";

export default function Prompt() {
  const [currentPrompt, setCurrentPrompt] = useState<string>();

  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      console.log("Buscar:", currentPrompt);
    }
  };

  return (
    <div className="w-full p-4 text-xl bg-bg text-fg font-mono flex items-center">
      <span className="text-accent mr-2">❯</span>
      <input
        ref={inputRef}
        value={currentPrompt}
        onChange={(e) => setCurrentPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent outline-none border-none text-fg caret-cursor"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        data-testid="prompt"
      />
    </div>
  );
}
