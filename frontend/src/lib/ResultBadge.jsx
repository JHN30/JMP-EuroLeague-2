const SIZES = { xs: "badge-xs", sm: "badge-sm" };

// A game's result as a small tinted badge (index.css `.result-badge`): W, L, or – when there is none. With `count` it is a
// streak (W3); `children` follow the letter (" streak"). It keeps daisyUI's badge sizing, so the compact form rows still trim it.
export default function ResultBadge({ won, count = null, size = "sm", className = "", children = null, ...rest }) {
  const tone = won === true ? "result-badge-win" : won === false ? "result-badge-loss" : "result-badge-none";
  const letter = won === true ? "W" : won === false ? "L" : "–";
  return (
    <span className={`badge ${SIZES[size]} result-badge ${tone} ${className}`} {...rest}>
      {letter}
      {count}
      {children}
    </span>
  );
}
