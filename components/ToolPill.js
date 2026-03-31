'use client';

import { useState } from 'react';

export default function ToolPill({ tool }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="tool-pill"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {tool.name}
      {show && (tool.type || tool.note) && (
        <span className="tool-tooltip">
          {tool.type && <div className="tooltip-type">{tool.type}</div>}
          {tool.note && <div className="tooltip-note">{tool.note}</div>}
        </span>
      )}
    </span>
  );
}
