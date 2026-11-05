import { useCallback, useEffect, useRef } from "react";
import { applyLiveFilter } from "../lib/liveFilter";

export const LIVE_FILTER_DELAY_MS = 150;

export function useLiveFilter(paneId: string) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancel = useCallback(() => clearTimeout(timer.current), []);

  const schedule = useCallback(
    (prompt: string, cursor?: number) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => applyLiveFilter(paneId, prompt, cursor), LIVE_FILTER_DELAY_MS);
    },
    [paneId],
  );

  useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
