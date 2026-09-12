import { ArrowUpRight, Search, Info, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function SectionHeading({
  index,
  title,
  description,
  to,
  label = "Explore",
  action,
}: {
  index?: string;
  title: string;
  description?: string;
  to?: string;
  label?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {index && <div className="eyebrow">{index}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
      {to && (
        <Link className="text-button" to={to}>
          {label}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"chip " + tone}>{children}</span>;
}
export function Empty({
  title = "No records to show",
  description = "Try adjusting your filters.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={25} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Info size={16} />
      <div>{children}</div>
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-box">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label = "View",
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          className={value === o.value ? "selected" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function Metrics({
  items,
}: {
  items: {
    label: string;
    value: string;
    unit?: string;
    positive?: boolean;
    onClick?: () => void;
  }[];
}) {
  return (
    <div className="metric-strip">
      {items.map((i) => (
        <div key={i.label}>
          <small>{i.label}</small>
          {i.onClick ? (
            <button
              className={"metric-button " + (i.positive ? "positive" : "")}
              onClick={i.onClick}
            >
              <strong>
                {i.value}
                <span>{i.unit}</span>
              </strong>
              <ArrowUpRight size={13} />
            </button>
          ) : (
            <strong className={i.positive ? "positive" : ""}>
              {i.value}
              <span>{i.unit}</span>
            </strong>
          )}
        </div>
      ))}
    </div>
  );
}
export function Skeleton() {
  return (
    <div
      className="loading-skeleton"
      role="status"
      aria-label="Loading assessment"
    >
      <div className="skeleton line" />
      <div className="skeleton hero" />
      <div className="skeleton chart" />
      <span className="sr-only">Loading assessment from the data source.</span>
    </div>
  );
}
export function DetailRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="detail-rows">
      {rows.map(([key, val]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{val}</dd>
        </div>
      ))}
    </dl>
  );
}
