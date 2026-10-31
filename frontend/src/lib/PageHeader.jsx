import Panel from "./Panel";

// A page that spaces its sections with a gap-6 stack passes `stacked`, so the header does not add its own margin to that gap.
// `compact` (the team page) trims the padding and the room under the header from lg.
// `centred` stacks the media, the text and the children in the middle of the panel below sm (a club's crest above its name).
// `compact` (the team page) trims the padding and the room under the header from lg.
export default function PageHeader({ kicker, title, description, media, stacked = false, centred = false, compact = false, children }) {
  const margin = stacked ? "" : compact ? "mb-6 lg:mb-4" : "mb-6";
  return (
    <Panel as="section" className={`relative overflow-hidden p-4 sm:p-5 ${compact ? "lg:px-5 lg:py-3" : ""} ${margin}`}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <div className={`flex flex-wrap items-center gap-4 ${centred ? "max-sm:flex-col max-sm:text-center" : ""}`}>
        {media ?? null}
        <div className={`min-w-0 flex-1 ${centred ? "max-sm:w-full max-sm:flex-none" : ""}`}>
          <p className="eyebrow mb-1">{kicker}</p>
          <h1 className="text-2xl font-semibold break-words">{title}</h1>
          {description ?? null}
        </div>
        {children ?? null}
      </div>
    </Panel>
  );
}
