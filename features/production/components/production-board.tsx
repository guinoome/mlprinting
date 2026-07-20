import type { BoardItem } from "@/services/orders";
import { BOARD_COLUMNS, groupIntoColumns } from "../board";
import { BoardColumnView } from "./board-column";
import { ItemCard } from "./item-card";

export function ProductionBoard({ items }: { items: BoardItem[] }) {
  const grouped = groupIntoColumns(items);

  return (
    // The board scrolls horizontally inside its own container so the page body
    // never does — eight columns will not fit a laptop, let alone a phone.
    <div className="-mx-6 overflow-x-auto px-6 pb-4">
      <div className="flex gap-3">
        {BOARD_COLUMNS.map((column) => (
          <BoardColumnView
            key={column}
            column={column}
            count={grouped[column].length}
          >
            {grouped[column].map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </BoardColumnView>
        ))}
      </div>
    </div>
  );
}
