import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FLIP_MS, useFilterFlip } from "./useFilterFlip";
import type { GetItemRequest, GetItemResponse } from "../types/backend";

const ROW = 36;
const VIEWPORT_ROWS = 10;
const CHUNK = 4;

const items = (...guids: string[]) => guids.map((guid) => ({ guid }) as GetItemResponse);

function List({ rows, filter }: { rows: GetItemResponse[]; filter: GetItemRequest }) {
  const ref = useRef<HTMLDivElement>(null);
  useFilterFlip(ref, rows, filter, CHUNK);
  const chunks = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    chunks.push(
      <ul key={i}>
        {rows.slice(i, i + CHUNK).map((r) => (
          <li key={r.guid} data-guid={r.guid} />
        ))}
      </ul>,
    );
  }
  return (
    <div data-testid="scroller">
      <div ref={ref}>{chunks}</div>
    </div>
  );
}

type Call = { guid: string; keyframes: Keyframe[] };
let calls: Call[];
let cancels: number;

beforeEach(() => {
  calls = [];
  cancels = 0;
  document.documentElement.dataset.motion = "on";
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(ROW);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(ROW * VIEWPORT_ROWS);
  Element.prototype.animate = vi.fn(function (this: Element, keyframes: Keyframe[]) {
    calls.push({ guid: this.getAttribute("data-guid") ?? "", keyframes });
    return { cancel: () => cancels++ } as unknown as Animation;
  }) as unknown as Element["animate"];
});

afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.motion;
});

const shiftOf = (guid: string) =>
  calls.find((c) => c.guid === guid)?.keyframes[0].transform as string | undefined;

describe("useFilterFlip", () => {
  it("does nothing on the first render", () => {
    render(<List rows={items("a", "b")} filter={{}} />);

    expect(calls).toEqual([]);
  });

  it("slides the rows that stay and fades in the ones that appear", () => {
    const view = render(<List rows={items("a", "b", "c", "d", "e")} filter={{}} />);

    view.rerender(<List rows={items("b", "d", "x")} filter={{ title: "x" }} />);

    expect(shiftOf("b")).toBe(`translateY(${ROW}px)`);
    expect(shiftOf("d")).toBe(`translateY(${2 * ROW}px)`);
    expect(calls.find((c) => c.guid === "x")?.keyframes[0].opacity).toBe(0);
    expect(calls).toHaveLength(3);
  });

  it("finds rows across chunks", () => {
    const view = render(<List rows={items("a", "b", "c", "d", "e", "f")} filter={{}} />);

    view.rerender(<List rows={items("a", "b", "c", "d", "f")} filter={{ title: "x" }} />);

    expect(shiftOf("f")).toBe(`translateY(${ROW}px)`);
    expect(calls).toHaveLength(1);
  });

  it("only animates the rows inside the viewport", () => {
    const many = Array.from({ length: 30 }, (_, i) => `r${i}`);
    const view = render(<List rows={items(...many)} filter={{}} />);

    view.rerender(<List rows={items(...many.slice(1))} filter={{ title: "x" }} />);

    expect(calls).toHaveLength(VIEWPORT_ROWS);
  });

  it("caps the slide of rows that come from far away", () => {
    const many = Array.from({ length: 30 }, (_, i) => `r${i}`);
    const view = render(<List rows={items(...many)} filter={{}} />);

    view.rerender(<List rows={items("r29")} filter={{ title: "x" }} />);

    expect(shiftOf("r29")).toBe(`translateY(${ROW * VIEWPORT_ROWS}px)`);
  });

  it("waits for the new items when the filter changes first", () => {
    const old = items("a", "b", "c");
    const view = render(<List rows={old} filter={{}} />);

    view.rerender(<List rows={old} filter={{ title: "c" }} />);
    expect(calls).toEqual([]);

    view.rerender(<List rows={items("c")} filter={{ title: "c" }} />);
    expect(shiftOf("c")).toBe(`translateY(${2 * ROW}px)`);
  });

  it("ignores item changes that are not caused by the filter", () => {
    const view = render(<List rows={items("a", "b")} filter={{}} />);

    view.rerender(<List rows={items("b")} filter={{}} />);

    expect(calls).toEqual([]);
  });

  it("ignores a filter that only changed identity", () => {
    const view = render(<List rows={items("a", "b")} filter={{ title: "a" }} />);

    view.rerender(<List rows={items("a", "b")} filter={{ title: "a" }} />);
    view.rerender(<List rows={items("b")} filter={{ title: "a" }} />);

    expect(calls).toEqual([]);
  });

  it("does not animate when moving to another group", () => {
    const view = render(<List rows={items("a", "b")} filter={{ parent_id: "g1" }} />);

    view.rerender(<List rows={items("b", "c")} filter={{ parent_id: "g2" }} />);

    expect(calls).toEqual([]);
  });

  it("respects animations being turned off", () => {
    document.documentElement.dataset.motion = "off";
    const view = render(<List rows={items("a", "b")} filter={{}} />);

    view.rerender(<List rows={items("b")} filter={{ title: "b" }} />);

    expect(calls).toEqual([]);
  });

  it("cancels the running animations when the filter changes again", () => {
    const view = render(<List rows={items("a", "b", "c")} filter={{}} />);
    view.rerender(<List rows={items("b", "c")} filter={{ title: "1" }} />);
    const started = calls.length;

    view.rerender(<List rows={items("c")} filter={{ title: "2" }} />);

    expect(cancels).toBe(started);
  });

  it("uses the helper's timing", () => {
    const view = render(<List rows={items("a", "b")} filter={{}} />);
    view.rerender(<List rows={items("b")} filter={{ title: "b" }} />);

    expect(vi.mocked(Element.prototype.animate).mock.calls[0][1]).toEqual({ duration: FLIP_MS, easing: "ease-out" });
  });
});
