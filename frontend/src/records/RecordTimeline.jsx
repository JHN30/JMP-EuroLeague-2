import { Chart } from "chart.js/auto";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { themeColor, useActiveTheme } from "../lib/useActiveTheme";
import { useMediaQuery } from "../lib/useMediaQuery";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { SeasonList } from "./RecordParts";
import { timelineSeasons } from "./recordData";

// What the tooltip says about one season: the holder, their club or the opponent, the value, the day of a game, and whether it set the record.
function seasonLines(slot, label) {
  const { record } = slot;
  const lines = [record.name, record.line, `${record.valueText} ${label}`, record.date].filter(Boolean);
  if (slot.setRecord) lines.push(slot.gain === null ? "First record" : `New record +${record.format(slot.gain)}`);
  return lines;
}

function summaryText(progression) {
  const record = progression.at(-1);
  const times = progression.length === 1 ? `Set in ${progression[0].season}.` : `Set ${progression.length} times since ${progression[0].season}.`;
  return `Record: ${record.valueText}, ${record.name}, ${record.season}. ${times}`;
}

// The best of each season as bars, the record as it stood after each season as a step line, and every season as a list under a disclosure.
export default function RecordTimeline({ bySeason, progression, overallKey, label }) {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const theme = useActiveTheme();
  const reducedMotion = usePrefersReducedMotion();
  // A tap on a touch screen opens the tooltip; going to the holder from a tap is the list's job, so only a pointer that hovers follows a bar.
  const canFollow = useMediaQuery("(hover: hover)");
  const slots = useMemo(() => timelineSeasons(bySeason, progression), [bySeason, progression]);
  const seasons = slots.filter((slot) => slot.record);
  const record = progression.at(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || slots.length === 0) return undefined;
    const primary = themeColor(canvas, "--color-primary");
    const text = themeColor(canvas, "--color-base-content");
    const muted = `color-mix(in srgb, ${text} 25%, transparent)`;
    const grid = `color-mix(in srgb, ${text} 15%, transparent)`;
    const slotAt = (event, chart) => {
      const [hit] = chart.getElementsAtEventForMode(event, "index", { intersect: false }, true);
      return hit ? slots[hit.index] : null;
    };

    const chart = new Chart(canvas, {
      data: {
        labels: slots.map((slot) => slot.season),
        datasets: [
          {
            type: "line",
            label: "Standing record",
            // Drawn over the bars.
            order: 0,
            data: slots.map((slot) => slot.standing),
            stepped: "middle",
            borderColor: text,
            borderWidth: 2,
            backgroundColor: text,
            pointRadius: slots.map((slot) => (slot.setRecord ? 4 : 0)),
            pointHoverRadius: slots.map((slot) => (slot.setRecord ? 5 : 0)),
          },
          {
            type: "bar",
            label: "Season best",
            order: 1,
            data: slots.map((slot) => slot.record?.value ?? null),
            backgroundColor: slots.map((slot) => (slot.setRecord ? primary : muted)),
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : undefined,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { ticks: { color: text, autoSkip: true, maxRotation: 0 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: text }, grid: { color: grid } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.dataset.type === "bar" && slots[item.dataIndex].record !== null,
            callbacks: {
              title: (items) => (items.length ? slots[items[0].dataIndex].season : ""),
              label: (item) => seasonLines(slots[item.dataIndex], label),
              footer: (items) => {
                const slot = items.length ? slots[items[0].dataIndex] : null;
                return slot?.standing != null ? `Record after the season: ${slot.record.format(slot.standing)}` : "";
              },
            },
          },
        },
        onHover: (event, _elements, chart) => {
          chart.canvas.style.cursor = canFollow && slotAt(event, chart)?.record?.to ? "pointer" : "default";
        },
        onClick: (event, _elements, chart) => {
          const to = canFollow ? slotAt(event, chart)?.record?.to : null;
          if (to) navigate(to);
        },
      },
    });
    return () => chart.destroy();
  }, [slots, label, theme, reducedMotion, canFollow, navigate]);

  return (
    <Panel as="section" className="p-5">
      <PanelHeader kicker="TIMELINE" title="Best of each season" />
      <p className="muted mt-1 text-sm">{summaryText(progression)}</p>
      <div className="relative mt-4 h-56 w-full sm:h-72">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${label}: the best of each season from ${slots[0]?.season} to ${slots.at(-1)?.season}. Record ${record.valueText} by ${record.name}, ${record.season}.`}
        />
      </div>
      <ul className="muted mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-base-content/25" />
          Season best
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-primary" />
          Record-setting season
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-4 bg-base-content" />
          Standing record
        </li>
      </ul>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold">Show every season ({seasons.length})</summary>
        <div className="mt-2">
          <SeasonList seasons={seasons} overallKey={overallKey} />
        </div>
      </details>
    </Panel>
  );
}
