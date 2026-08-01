import type { GetItemResponse } from "../../types/backend";

interface IItem {
  item: GetItemResponse;
}
export default function Item({ item }: IItem) {
  return (
    <li className="w-full m-0 p-1 px-4 flex flex-row justify-between">
      <span>{item.title}</span>
      <span>{item.description}</span>
      <span>{item.status}</span>
      <span>{item.priority}</span>
      <span>{item.type}</span>
      <span>{item.tags.join(",")}</span>
    </li>
  );
}
