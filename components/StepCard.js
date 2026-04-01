'use client';
import ToolPill from './ToolPill';

export default function StepCard({ step, phaseColor, statusLabels, expanded, onToggle, isActive }) {
  const isMock = (src) => src.indexOf('\u{1F536}') !== -1;
  return (
    <div
      className={'step-card' + (step.optional ? ' optional' : '') + (step.automatic ? ' automatic' : '') + (expanded ? ' expanded' : '') + (isActive ? ' presentation-active' : '')}
      style={{ borderLeftColor: phaseColor, ...(isActive ? { borderColor: phaseColor } : {}) }}
      onClick={onToggle} data-step-id={String(step.id)}
    >
      <div className="step-card-top">
        <div style={{ flex: 1, minWidth: 0 }}><div className="step-title">{step.title}</div></div>
        <div className="step-badges">
          {step.liveStatus && statusLabels[step.liveStatus] && <span className="badge badge-status" style={{ background: statusLabels[step.liveStatus].color }}>{statusLabels[step.liveStatus].label}</span>}
          {step.optional && <span className="badge badge-optional">Optional</span>}
          {step.automatic && <span className="badge badge-auto">⚡ Auto</span>}
        </div>
      </div>
      <div className="step-summary">{step.summary}</div>
      {step.persona && (
        <div className="step-persona">
          {step.personaIcon && <span>{step.personaIcon}</span>}
          <span>{step.persona}</span>
          {step.personaNote && <span className="step-persona-note"> — {step.personaNote}</span>}
        </div>
      )}
      {step.tools && step.tools.length > 0 && (
        <div className="tool-pills" onClick={e => e.stopPropagation()}>
          {step.tools.map((t, i) => <ToolPill key={i} tool={t} />)}
        </div>
      )}
      {expanded && (
        <div className="step-expanded">
          {step.details && <div className="step-details">{step.details}</div>}
          {step.outputs && step.outputs.length > 0 && (<div><div className="step-section-label">Outputs</div><div className="output-pills">{step.outputs.map((o, i) => <span key={i} className="output-pill">{o}</span>)}</div></div>)}
          {step.dataSources && step.dataSources.length > 0 && (<div><div className="step-section-label">Data Sources</div><div className="data-sources">{step.dataSources.map((ds, i) => <span key={i} className={'data-source' + (isMock(ds) ? ' mock' : '')}>{ds}</span>)}</div></div>)}
          {step.url && (<div><a className="step-url" href={step.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>🔗 Docs</a><span className="url-print-text">{step.url}</span></div>)}
        </div>
      )}
    </div>
  );
}
