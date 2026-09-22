export default function PanelHeader({ kicker, title, level: Tag = "h2", trailing }) {
  return (
    <div className="panel-header">
      <div>
        {kicker ? <p className="eyebrow mb-1">{kicker}</p> : null}
        <Tag className="panel-title">{title}</Tag>
      </div>
      {trailing ?? null}
    </div>
  );
}
