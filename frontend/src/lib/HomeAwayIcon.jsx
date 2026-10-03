// A house for a home game and a plane for an away game, as on the EuroLeague site, so the venue reads at a glance. It
// names itself ("Home game" or "Away game") for screen readers and on hover. Colour comes from the surrounding text.
export default function HomeAwayIcon({ home, className = "h-4 w-4" }) {
  const label = home ? "Home game" : "Away game";

  return (
    <svg role="img" aria-label={label} viewBox="0 0 24 24" className={`${className} flex-none`}>
      <title>{label}</title>
      {home ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v9.5h13V10" />
          <path d="M10 19.5v-5h4v5" />
        </g>
      ) : (
        // The plane is drawn nose up and turned a quarter so it points right.
        <path
          fill="currentColor"
          transform="rotate(90 12 12)"
          d="M21 15.5v-1.7l-8-5V4a1.5 1.5 0 0 0-3 0v4.8l-8 5v1.7l8-2.2V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-4.7l8 2.2Z"
        />
      )}
    </svg>
  );
}
