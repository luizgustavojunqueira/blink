import type { FC } from "react";
import { ItemList } from "../../components/itemList/itemList";
import type { PaneType } from "./types";
import ItemDetail from "../../components/itemDetail/itemDetail";
import ConfigPane from "../../components/config/configPane";

export const paneRegistry: Record<PaneType, { Component: FC<{ paneId: string }> }> = {
  list: { Component: ItemList },
  detail: { Component: ItemDetail },
  config: { Component: ConfigPane },
};
