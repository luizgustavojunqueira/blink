import type { FC } from "react";
import { ItemList } from "../../components/itemList/itemList";
import type { PaneType } from "./types";

export const paneRegistry: Record<PaneType, { Component: FC<{ paneId: string }> }> = {
  list: { Component: ItemList },
  detail: { Component: ItemList },
};
