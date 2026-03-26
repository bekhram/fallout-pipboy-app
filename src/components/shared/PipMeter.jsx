import React from "react";
export default function PipMeter({ value = 0, max = 100, danger = 0, label, rightText }) {
  const safeMax = Math.max(1, Number(max || 1));
  const fillWidth = Math.max(0, Math.min(100, (Number(value || 0) / safeMax) * 100));
  const dangerWidth = Math.max(0, Math.min(100, (Number(danger || 0) / safeMax) * 100));

  return (
    <div className="pip-meter-block">
      <div className="pip-meter-block__top">
        <span>{label}</span>
        <span>{rightText}</span>
      </div>
      <div className="pip-meter">
        <div className="pip-meter__fill" style={{ width: `${fillWidth}%` }} />
        {dangerWidth > 0 ? <div className="pip-meter__danger" style={{ width: `${dangerWidth}%` }} /> : null}
      </div>
    </div>
  );
}
