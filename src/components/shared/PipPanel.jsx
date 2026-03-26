import React from "react";
export default function PipPanel({ title, meta, actions, children, className = "" }) {
  return (
    <section className={`pip-panel ${className}`.trim()}>
      <div className="pip-panel__header">
        <span className="pip-section-title">[ {title} ]</span>
        <div className="pip-panel__header-right">
          {meta ? <span className="pip-section-meta">{meta}</span> : null}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}
