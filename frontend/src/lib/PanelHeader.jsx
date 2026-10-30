// `compact` puts the kicker and the title on one line from lg, with less room under them (index.css).
export default function PanelHeader({ kicker, title, level: Tag = "h2", trailing, compact = false }) {
  return (
    <div className={`panel-header${compact ? " panel-header-compact" : ""}`}>
      <div>
        {kicker ? <p className="eyebrow mb-1">{kicker}</p> : null}
        <Tag className="panel-title">{title}</Tag>
      </div>
      {trailing ?? null}
    </div>
  );
}
