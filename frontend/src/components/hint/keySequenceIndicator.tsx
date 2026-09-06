import { useUiStore } from "../../stores/ui";

export default function KeySequenceIndicator() {
  const seq = useUiStore((s) => s.currentKeySeq);
  return <span>{seq}</span>;
}
