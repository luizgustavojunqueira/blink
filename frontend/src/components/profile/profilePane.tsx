import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { paneIsActive, usePaneValue, type PaneSelector } from "../../hooks/usePane";
import { useAuthStore } from "../../lib/auth/store";
import { profileRowId, type ProfileRowKind } from "../../lib/profile/rows";
import { useUiStore } from "../../stores/ui";
import Breadcrumb from "../breadcrumb/breadcrumb";
import TextField from "../textField/textField";
import { t } from "../../lib/i18n";

interface IProfilePane {
  paneId: string;
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <li className="flex flex-col px-4 pt-4 pb-1">
      <span className="font-medium text-fg-dim border-b border-accent/10">{title}</span>
      {note && <span className="text-xs text-fg-muted">{note}</span>}
    </li>
  );
}

interface IRowShell {
  paneId: string;
  kind: ProfileRowKind;
  children: ReactNode;
  footer?: ReactNode;
}

function RowShell({ paneId, kind, children, footer }: IRowShell) {
  const rowId = profileRowId(kind);
  const ref = useRef<HTMLLIElement>(null);
  const selectRow = useUiStore((s) => s.selectRow);
  const select = useCallback<PaneSelector<boolean>>(
    (pane) => pane?.type === "profile" && pane.selectedRow === rowId,
    [rowId],
  );
  const isSelected = usePaneValue(paneId, select);

  useEffect(() => {
    if (isSelected) ref.current?.scrollIntoView?.({ block: "nearest" });
  }, [isSelected]);

  return (
    <li
      ref={ref}
      data-row-id={rowId}
      aria-selected={isSelected}
      onClick={() => selectRow(paneId, rowId)}
      className={`flex flex-col px-4 py-0.5 ${isSelected ? "bg-bg-lighter" : "hover:bg-bg-soft"}`}
    >
      {children}
      {footer}
    </li>
  );
}

function useRowEditing(paneId: string, kind: ProfileRowKind) {
  const rowId = profileRowId(kind);
  const select = useCallback<PaneSelector<boolean>>(
    (pane, ui) =>
      pane?.id === ui.activePaneId &&
      ui.mode === "insert" &&
      pane.type === "profile" &&
      pane.selectedRow === rowId,
    [rowId],
  );
  return usePaneValue(paneId, select);
}

interface IField {
  label: string;
  value: string;
  onChange: (value: string) => void;
  focused: boolean;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  mask?: boolean;
  testId: string;
}

function Field({ label, value, onChange, focused, onKeyDown, mask = true, testId }: IField) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-fg-muted">{label}</span>
      <TextField
        singleLine
        mask={mask}
        value={value}
        onChange={onChange}
        editing={focused}
        onKeyDown={onKeyDown}
        wrapperClassName="flex-1 min-w-0"
        testId={testId}
      />
    </div>
  );
}

function useFieldNav(count: number, submit: () => void) {
  const [focus, setFocus] = useState(0);

  const onKeyDown = (index: number) => (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      const dir = e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey) ? -1 : 1;
      setFocus((f) => (f + dir + count) % count);
      return;
    }
    if (e.key !== "Enter") return;

    e.preventDefault();
    e.stopPropagation();
    if (index < count - 1) setFocus(index + 1);
    else submit();
  };

  return { focus, onKeyDown };
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const changePassword = useAuthStore((s) => s.changePassword);
  const setMode = useUiStore((s) => s.setMode);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (next !== confirm) {
      setError(t("the new passwords do not match"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      onDone();
      setMode("normal");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("could not change the password"));
      setBusy(false);
    }
  };

  const { focus, onKeyDown } = useFieldNav(3, () => void submit());

  return (
    <div className="flex flex-col gap-1 pb-1">
      <Field label={t("current")} value={current} onChange={setCurrent} focused={focus === 0} onKeyDown={onKeyDown(0)} testId="profile-current" />
      <Field label={t("new")} value={next} onChange={setNext} focused={focus === 1} onKeyDown={onKeyDown(1)} testId="profile-new" />
      <Field label={t("confirm")} value={confirm} onChange={setConfirm} focused={focus === 2} onKeyDown={onKeyDown(2)} testId="profile-confirm" />
      {error ? (
        <span className="text-xs text-danger">● {error}</span>
      ) : (
        <span className="text-xs text-fg-muted">{t("enter moves on and saves on the last field · esc cancels")}</span>
      )}
    </div>
  );
}

function DeleteForm() {
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("could not delete the account"));
      setBusy(false);
    }
  };

  const { focus, onKeyDown } = useFieldNav(1, () => void submit());

  return (
    <div className="flex flex-col gap-1 pb-1">
      <span className="text-xs text-danger">
        {t("this permanently deletes your account, items and agents")}
      </span>
      <Field label={t("password")} value={password} onChange={setPassword} focused={focus === 0} onKeyDown={onKeyDown(0)} testId="profile-delete-password" />
      {error ? (
        <span className="text-xs text-danger">● {error}</span>
      ) : (
        <span className="text-xs text-fg-muted">{t("enter deletes the account · esc cancels")}</span>
      )}
    </div>
  );
}

function AccountRow({ paneId }: { paneId: string }) {
  const username = useAuthStore((s) => s.user?.username ?? "");

  return (
    <RowShell paneId={paneId} kind="account">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-24 shrink-0 text-xs text-fg-muted">{t("username")}</span>
        <span className="flex-1 truncate text-lg leading-normal text-fg">{username}</span>
      </div>
    </RowShell>
  );
}

function PasswordRow({ paneId }: { paneId: string }) {
  const editing = useRowEditing(paneId, "password");
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (editing) setChanged(false);
  }, [editing]);

  return (
    <RowShell paneId={paneId} kind="password" footer={editing && <PasswordForm onDone={() => setChanged(true)} />}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex-1 truncate text-lg leading-normal text-fg">{t("change password")}</span>
        {changed && !editing && <span className="shrink-0 text-xs text-accent">{t("changed")}</span>}
      </div>
    </RowShell>
  );
}

function LogoutRow({ paneId }: { paneId: string }) {
  return (
    <RowShell paneId={paneId} kind="logout">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex-1 truncate text-lg leading-normal text-fg">{t("log out")}</span>
      </div>
    </RowShell>
  );
}

function DeleteRow({ paneId }: { paneId: string }) {
  const editing = useRowEditing(paneId, "delete");

  return (
    <RowShell paneId={paneId} kind="delete" footer={editing && <DeleteForm />}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex-1 truncate text-lg leading-normal text-danger">{t("delete account")}</span>
      </div>
    </RowShell>
  );
}

export default function ProfilePane({ paneId }: IProfilePane) {
  const isActive = usePaneValue(paneId, paneIsActive);

  return (
    <div
      className={`w-full h-full flex flex-col border p-4 text-sm transition-colors duration-75 ${
        isActive ? "border-b-accent" : "border-bg"
      }`}
    >
      <Breadcrumb paneId={paneId} />
      <ul className="flex-1 overflow-y-auto">
        <SectionHeader title={t("account")} note={t("enter opens · esc cancels")} />
        <AccountRow paneId={paneId} />
        <PasswordRow paneId={paneId} />
        <LogoutRow paneId={paneId} />
        <DeleteRow paneId={paneId} />
      </ul>
    </div>
  );
}
