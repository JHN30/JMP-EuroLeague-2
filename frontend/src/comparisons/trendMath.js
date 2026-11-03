// A running total.
export function cumulative(values) {
  let total = 0;
  return values.map((value) => {
    total += value;
    return total;
  });
}

// `points` stretched with empty ends to `length`, so two series of different lengths share one axis.
export function padTo(points, length) {
  return points.length >= length ? points : [...points, ...Array(length - points.length).fill(null)];
}

export function average(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// The average of each value and the ones before it, up to `window` of them; null where the value itself is missing (a padded end).
export function rollingAverage(values, window) {
  return values.map((value, index) => {
    if (value === null || value === undefined) return null;
    const recent = values.slice(Math.max(0, index - window + 1), index + 1).filter((entry) => entry !== null && entry !== undefined);
    return average(recent);
  });
}
