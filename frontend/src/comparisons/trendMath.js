// A running average over the last `window` values, from the `minCount`th value on (earlier points are too noisy to draw).
export function rolling(values, window = 5, minCount = 3) {
  return values.map((_, index) => {
    if (index + 1 < minCount) return null;
    const slice = values.slice(Math.max(0, index + 1 - window), index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

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
