import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox, Search, X } from 'lucide-react';
import { addDays, monthKey, monthLabel, shiftAnchor, today, weekLabel } from '../lib/format';

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-head">
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, action, children }) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function KpiCard({ label, value, hint, tone }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <Icon size={36} strokeWidth={1.5} aria-hidden="true" />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Field({ label, error, children, full }) {
  return (
    <label className={`field ${full ? 'full' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error" role="alert">{error}</span>}
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="search">
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={onChange}
    >
      <span className="switch-track" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

// Columns: { key, label, render?(row) }. On mobile each row becomes a stacked card.
export function DataTable({ columns, rows, rowKey, actions }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {actions && <th aria-label="إجراءات" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.label}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
              {actions && <td className="actions-cell">{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function usePeriod(defaultMode = 'week') {
  const [mode, setMode] = useState(defaultMode);
  const [anchor, setAnchor] = useState(today());
  return { mode, setMode, anchor, setAnchor };
}

export function PeriodSelector({ mode, setMode, anchor, setAnchor }) {
  const shift = (dir) => setAnchor(shiftAnchor(mode, anchor, dir));
  const label = mode === 'week' ? weekLabel(anchor) : monthLabel(monthKey(anchor));

  return (
    <div className="period">
      <div className="segmented" role="tablist" aria-label="نوع الفترة">
        {[
          ['week', 'أسبوع'],
          ['month', 'شهر'],
        ].map(([id, text]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            className={mode === id ? 'on' : ''}
            onClick={() => setMode(id)}
          >
            {text}
          </button>
        ))}
      </div>
      <div className="period-nav">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="الفترة السابقة">
          <ChevronRight size={18} />
        </button>
        <span className="period-label">{label}</span>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="الفترة التالية">
          <ChevronLeft size={18} />
        </button>
        <button className="btn ghost small" onClick={() => setAnchor(today())}>
          النهارده
        </button>
      </div>
    </div>
  );
}

export { addDays };
