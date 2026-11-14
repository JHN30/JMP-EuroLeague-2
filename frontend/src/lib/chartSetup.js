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

export { Chart };
