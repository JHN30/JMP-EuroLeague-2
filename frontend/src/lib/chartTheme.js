import { themeColor } from "./useActiveTheme";

// One set of chart colours and styles, read from the theme on the chart's canvas. A chart is rebuilt when the theme
// changes (useActiveTheme), so these are read again then. Colours that carry a chart's own meaning (a rolling average,
// a rating's above and below fills) stay in that chart; gridlines, generic fills, text and tooltips come from here.
const mix = (colour, percent) => `color-mix(in srgb, ${colour} ${percent}%, transparent)`;

export function chartTheme(canvas) {
  const text = themeColor(canvas, "--color-base-content");
  return {
    text,
    primary: themeColor(canvas, "--color-primary"),
    secondary: themeColor(canvas, "--color-secondary"),
    accent: themeColor(canvas, "--color-accent"),
    success: themeColor(canvas, "--color-success"),
    error: themeColor(canvas, "--color-error"),
    panel: themeColor(canvas, "--color-base-100"),
    border: themeColor(canvas, "--color-base-300"),
    // Gridlines, and a stronger line for a zero line or a phase divider.
    grid: mix(text, 15),
    strongGrid: mix(text, 55),
    // Bars that are present but not the point (a season that did not set the record).
    faint: mix(text, 25),
    // The area under a line, and a radar's area (lighter, as two radars overlap).
    fill: (colour) => mix(colour, 15),
    radarFill: (colour) => mix(colour, 20),
    mix,
  };
}

// An x or y scale's ticks and grid; `extra` holds the chart's own scale options (merged one level into ticks and grid).
export function axis(theme, extra = {}) {
  const { ticks, grid, ...rest } = extra;
  return { ...rest, ticks: { color: theme.text, ...ticks }, grid: { color: theme.grid, ...grid } };
}

// The percentile radars' scale: 0 to 100 in steps of 25.
export function radarScale(theme) {
  return {
    min: 0,
    max: 100,
    ticks: { stepSize: 25, color: theme.text, backdropColor: "transparent" },
    grid: { color: theme.grid },
    angleLines: { color: theme.grid },
    pointLabels: { color: theme.text },
  };
}

// The tooltip as a small panel: the panel fill, the page text and a hairline border. A chart spreads its callbacks over it.
export function tooltip(theme) {
  return {
    backgroundColor: theme.panel,
    titleColor: theme.text,
    bodyColor: theme.text,
    footerColor: theme.text,
    borderColor: theme.border,
    borderWidth: 1,
    cornerRadius: 6,
    padding: 8,
    boxPadding: 4,
  };
}
