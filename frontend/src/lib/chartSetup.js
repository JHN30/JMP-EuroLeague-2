import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

// Only the parts the app's charts use, instead of everything `chart.js/auto` registers: line, bar and radar charts, their
// category, linear and radial scales, and the legend, tooltip and area fill. A chart using anything else needs it added here.
Chart.register(
  LineController,
  BarController,
  RadarController,
  LineElement,
  PointElement,
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  Filler,
  Legend,
  Tooltip,
);

// Charts draw in the page's own font (Inter, set in index.css) instead of Chart.js's Helvetica. Fonts load with
// `font-display: swap`, so a chart drawn before Inter arrived is redrawn once it has; charts drawn later measure with it.
Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
document.fonts?.addEventListener("loadingdone", () => {
  for (const chart of Object.values(Chart.instances)) chart.update("none");
});

export { Chart };
