import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SelectionScroller from "./selectionScroller";
import { useUiStore } from "../../stores/ui";
import { createRootPane } from "../../lib/pane/factories";

const VIEWPORT = 100;
const UNIFORM = Array<number>(10).fill(20);

function rect(top: number, bottom: number) {
  return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top } as DOMRect;
}

function mockLayout(heights: number[]) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ) {
    if (this.id === "scroller") return rect(0, VIEWPORT);

    const container = this.parentElement!.parentElement!;
    const index = Array.prototype.indexOf.call(this.parentElement!.children, this);
    const offset = heights.slice(0, index).reduce((sum, h) => sum + h, 0);
    const top = offset - container.scrollTop;

    return rect(top, top + heights[index]);
  });
}

function Harness({ count }: { count: number }) {
  const listRef = useRef<HTMLUListElement>(null);

  return (
    <div id="scroller" data-testid="scroller">
      <ul ref={listRef}>
        {Array.from({ length: count }, (_, i) => (
          <li key={i} data-item-id={`i${i}`} />
        ))}
      </ul>
      <SelectionScroller paneId="root" listRef={listRef} />
    </div>
  );
}

function setup(heights: number[], scrollTop = 0) {
  mockLayout(heights);
  render(<Harness count={heights.length} />);
  const scroller = screen.getByTestId("scroller");
  scroller.scrollTop = scrollTop;
  return scroller;
}

const select = (id: string | null) => act(() => useUiStore.getState().select("root", id));

beforeEach(() => {
  const root = createRootPane();
  useUiStore.setState({ mode: "normal", panes: [root], activePaneId: root.id });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SelectionScroller", () => {
  it("does not scroll while the selection keeps its margin", () => {
    const scroller = setup(UNIFORM);

    select("i1");

    expect(scroller.scrollTop).toBe(0);
  });

  it("scrolls down once the selection is within 3 items of the bottom", () => {
    const scroller = setup(UNIFORM);

    select("i2");

    expect(scroller.scrollTop).toBe(20);
  });

  it("scrolls up once the selection is within 3 items of the top", () => {
    const scroller = setup(UNIFORM, 60);

    select("i4");

    expect(scroller.scrollTop).toBe(20);
  });

  it("keeps the margin when jumping far past the viewport", () => {
    const scroller = setup(UNIFORM);

    select("i6");

    expect(scroller.scrollTop).toBe(100);
  });

  it("uses the item itself as the edge near the end of the list", () => {
    const scroller = setup(UNIFORM);

    select("i9");

    expect(scroller.scrollTop).toBe(100);
  });

  it("uses the item itself as the edge near the start of the list", () => {
    const scroller = setup(UNIFORM, 100);

    select("i0");

    expect(scroller.scrollTop).toBe(0);
  });

  it("accounts for non-uniform item heights", () => {
    const scroller = setup([20, 20, 20, 100, 20, 20, 20, 20]);

    select("i0");

    expect(scroller.scrollTop).toBe(60);
  });

  it("does nothing without a selection", () => {
    const scroller = setup(UNIFORM, 40);

    select(null);

    expect(scroller.scrollTop).toBe(40);
  });

  it("does nothing when the selected item is not rendered", () => {
    const scroller = setup(UNIFORM, 40);

    select("missing");

    expect(scroller.scrollTop).toBe(40);
  });
});
