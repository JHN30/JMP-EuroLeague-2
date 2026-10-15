import { useLayoutEffect, useState } from "react";

// Below sm the race chart scrolls sideways with smaller rows; from lg the snapshot table sits beside it, lane for row.
export const NARROW_QUERY = "(max-width: 39.999rem)";
export const SIDE_BY_SIDE_QUERY = "(min-width: 64rem)";

const FLOOR_ROW = 24;
const WIDE = { maxRow: 50, minPlot: 390, crestRadius: 19, boxInset: 13 };
const NARROW = { maxRow: 30, minPlot: 300, crestRadius: 12, boxInset: 9 };
const TOP_MARGIN = 4;
const BOTTOM_MARGIN = 28;
// Room for a sideways scrollbar and rounding, so a chart that just fits never shows a sliver of page scroll.
const SLACK = 8;
// From lg the table's first row starts this far below the column top: panel border and padding, title, header row.
const TABLE_HEAD = 57;

// Where the playback bar ends once stuck under the app nav, or the nav's bottom where the bar doesn't stick: the line the
// page scrolls the chart to. The bar's `top` is the nav height either way.
export function stickyBottomOf(bar) {
  const style = getComputedStyle(bar);
  return (parseFloat(style.top) || 0) + (style.position === "sticky" ? bar.offsetHeight : 0);
}

// The viewport height left under that line: the room the chart sizes itself to.
export function useRoomBelowBar(bar) {
  const [room, setRoom] = useState({ height: 0, stickyBottom: 0 });

  useLayoutEffect(() => {
    if (!bar) return undefined;
    const measure = () => {
      const stickyBottom = stickyBottomOf(bar);
      setRoom({ height: window.innerHeight - stickyBottom, stickyBottom });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [bar]);

  return room;
}

// One row per position plus half a row above the first and below the last, as tall as the room allows within
// 24px and the row size the layout was built with. Side by side, the chart's top margin grows so each lane sits level
// with its table row.
export function raceLayout({ room, teamCount, narrow, sideBySide }) {
  const size = narrow ? NARROW : WIDE;
  const lanes = teamCount + 1;
  const ceiling = Math.max(size.maxRow, size.minPlot / lanes);
  const alignTop = sideBySide && !narrow ? TABLE_HEAD - size.boxInset : null;
  // With the aligned top margin (alignTop - row / 2) the frame shrinks by half a row as the rows grow.
  const fixedFrame = 2 * size.boxInset + BOTTOM_MARGIN + SLACK + (alignTop ?? TOP_MARGIN);
  const fit = alignTop == null ? (room - fixedFrame) / lanes : (room - fixedFrame) / (lanes - 0.5);
  const rowHeight = room > 0 ? Math.min(ceiling, Math.max(FLOOR_ROW, fit)) : ceiling;
  const top = alignTop == null ? TOP_MARGIN : alignTop - rowHeight / 2;
  const chartHeight = 2 * size.boxInset + top + lanes * rowHeight + BOTTOM_MARGIN;
  return {
    rowHeight,
    margin: { top, bottom: BOTTOM_MARGIN },
    crestRadius: Math.min(size.crestRadius, Math.round(rowHeight * 0.4)),
    fits: room <= 0 || chartHeight + SLACK <= room,
  };
}
