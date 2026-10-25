import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAuthStore } from "../../lib/auth/store";
import TextField from "../textField/textField";

type Mode = "login" | "signup";

const FIELDS = 3;

const LABELS: Record<Mode, { title: string; submit: string; switchTo: string }> = {
  login: { title: "log in", submit: "enter to log in", switchTo: "no account? create one" },
  signup: { title: "create account", submit: "enter to create the account", switchTo: "have an account? log in" },
};

export default function AuthScreen() {
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [focus, setFocus] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focus === FIELDS - 1) switchRef.current?.focus();
  }, [focus]);

  const move = (dir: 1 | -1) => setFocus((f) => (f + dir + FIELDS) % FIELDS);

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError(null);
  };

  const submit = async () => {
    if (busy) return;
    if (username.trim() === "" || password === "") {
      setError("username and password are required");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await (mode === "login" ? login : signup)(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
      setBusy(false);
    }
  };

  const onKeyDown = (index: number) => (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      move(e.shiftKey ? -1 : 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (index === 0) setFocus(1);
      else if (index === 1) void submit();
      else toggleMode();
    }
  };

  const labels = LABELS[mode];

  return (
    <div className="flex h-screen items-center justify-center bg-bg font-mono text-fg animate-pane-in">
      <div className="flex w-full max-w-sm flex-col gap-3 px-4">
        <span className="border-b border-accent/10 font-medium text-fg-dim">{labels.title}</span>

        <label className="flex items-center gap-3" onClick={() => setFocus(0)}>
          <span className="w-20 shrink-0 text-sm text-fg-muted">username</span>
          <TextField
            singleLine
            value={username}
            onChange={setUsername}
            editing={focus === 0}
            onKeyDown={onKeyDown(0)}
            wrapperClassName="flex-1 min-w-0"
            testId="auth-username"
          />
        </label>

        <label className="flex items-center gap-3" onClick={() => setFocus(1)}>
          <span className="w-20 shrink-0 text-sm text-fg-muted">password</span>
          <TextField
            singleLine
            mask
            value={password}
            onChange={setPassword}
            editing={focus === 1}
            onKeyDown={onKeyDown(1)}
            wrapperClassName="flex-1 min-w-0"
            testId="auth-password"
          />
        </label>

        {error && <span className="text-xs text-danger">● {error}</span>}

        <div
          ref={switchRef}
          tabIndex={-1}
          role="button"
          onKeyDown={onKeyDown(2)}
          onClick={() => {
            setFocus(2);
            toggleMode();
          }}
          className={`cursor-pointer text-sm outline-none ${focus === 2 ? "bg-bg-lighter text-fg" : "text-fg-muted"}`}
        >
          {labels.switchTo}
        </div>

        <span className="text-xs text-fg-muted">
          {busy ? "..." : `${labels.submit} · tab moves`}
        </span>
      </div>
    </div>
  );
}
