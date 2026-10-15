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
