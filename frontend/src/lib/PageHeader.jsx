import Panel from "./Panel";

export default function PageHeader({ kicker, title, description, media, children }) {
  return (
    <Panel as="section" className="relative overflow-hidden p-4 sm:p-5 mb-6">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <div className="flex flex-wrap items-center gap-4">
        {media ?? null}
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">{kicker}</p>
          <h1 className="text-2xl font-semibold break-words">{title}</h1>
          {description ?? null}
        </div>
        {children ?? null}
      </div>
    </Panel>
  );
}
