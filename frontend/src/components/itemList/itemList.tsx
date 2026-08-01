import { useItems } from "../../hooks/useItems";
import Loading from "../loading";
import Item from "./item";

export function ItemList() {
  console.log("A");
  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useItems({ title: "teste" });

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <div className="text-urgent p-4">erro: {error.message}</div>;
  }

  return (
    <div className="w-full">
      <ul className="gap-1">
        {items.map((item) => (
          <Item key={item.guid} item={item} />
        ))}
      </ul>
    </div>
  );
}
