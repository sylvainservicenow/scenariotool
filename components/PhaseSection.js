'use client';

import StepCard from './StepCard';
import BranchSection from './BranchSection';

function countPhaseSteps(steps) {
  let n = 0;
  function walk(s) {
    if (!s) return;
    s.forEach(st => {
      n++;
      if (st.branches) st.branches.forEach(b => walk(b.steps));
    });
  }
  walk(steps);
  return n;
}

export default function PhaseSection({
  phase, statusLabels, expandedSteps, toggleStep,
  activeStepId, collapsed, onToggleCollapse
}) {
  const stepCount = countPhaseSteps(phase.steps);

  return (
    <div className="phase-group">
      {phase.separate && (
        <div>
          <hr className="phase-separator" />
          <div className="phase-separator-label">Independent workflow</div>
        </div>
      )}

      <div className="phase-header" onClick={onToggleCollapse}>
        <span className="phase-icon">{phase.icon}</span>
        <span className="phase-name" style={{ color: phase.color }}>{phase.phase}</span>
        <div className="phase-meta">
          <span className="phase-step-count">
            {stepCount} step{stepCount !== 1 ? 's' : ''}
          </span>
          <span className={'phase-chevron' + (collapsed ? ' collapsed' : '')}>▾</span>
        </div>
      </div>

      {!collapsed && (
        <div className="step-flow">
          {phase.steps.map((step) => (
            <div key={step.id}>
              <div className="step-wrapper" style={{ position: 'relative' }}>
                <div
                  className={'step-node' + (step.optional ? ' optional' : '')}
                  style={
                    step.optional
                      ? { borderColor: phase.color, color: phase.color, background: 'var(--surface-1)' }
                      : { background: phase.color }
                  }
                >
                  {String(step.id).length <= 3 ? step.id : ''}
                  {step.automatic && <span className="auto-badge">⚡</span>}
                </div>
                <StepCard
                  step={step}
                  phaseColor={phase.color}
                  statusLabels={statusLabels}
                  expanded={expandedSteps.has(String(step.id))}
                  onToggle={() => toggleStep(String(step.id))}
                  isActive={activeStepId === String(step.id)}
                />
              </div>

              <BranchSection
                step={step}
                phaseColor={phase.color}
                statusLabels={statusLabels}
                expandedSteps={expandedSteps}
                toggleStep={toggleStep}
                activeStepId={activeStepId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
