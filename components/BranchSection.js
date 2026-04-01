'use client';
import StepCard from './StepCard';

export default function BranchSection({ step, phaseColor, statusLabels, expandedSteps, toggleStep, activeStepId }) {
  if (!step.branches || step.branches.length === 0) return null;
  const n = step.branches.length;
  const gid = 'fg-' + String(step.id).replace(/\s/g, '');
  return (
    <div className="branch-container">
      {step.condition && <div className="branch-condition" style={{ background: phaseColor + '12', color: phaseColor }}>{step.condition}</div>}
      <svg className="branch-fork-svg" viewBox="0 0 400 32" preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={phaseColor} stopOpacity="0.5"/><stop offset="100%" stopColor={phaseColor} stopOpacity="0.2"/></linearGradient></defs>
        {n >= 2 && <><path d="M200 0 C200 18,100 14,100 32" stroke={`url(#${gid})`} strokeWidth="2" fill="none"/><path d="M200 0 C200 18,300 14,300 32" stroke={`url(#${gid})`} strokeWidth="2" fill="none"/></>}
        {n === 1 && <line x1="200" y1="0" x2="200" y2="32" stroke={phaseColor} strokeWidth="2" opacity="0.3"/>}
      </svg>
      <div className="branch-paths">
        {step.branches.map((branch, bi) => (
          <div key={bi} className="branch-path">
            <div className="branch-label" style={{ background: phaseColor + '10', color: phaseColor, borderBottom: '2px solid ' + phaseColor + '30' }}>
              {branch.icon && <span>{branch.icon}</span>}<span>{branch.label}</span>
            </div>
            <div className="branch-steps">
              {(branch.steps || []).map(bs => (
                <div key={bs.id}>
                  <StepCard step={bs} phaseColor={phaseColor} statusLabels={statusLabels} expanded={expandedSteps.has(String(bs.id))} onToggle={() => toggleStep(String(bs.id))} isActive={activeStepId === String(bs.id)}/>
                  {bs.branches && <BranchSection step={bs} phaseColor={phaseColor} statusLabels={statusLabels} expandedSteps={expandedSteps} toggleStep={toggleStep} activeStepId={activeStepId}/>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <svg className="branch-merge-svg" viewBox="0 0 400 24" preserveAspectRatio="xMidYMid meet">
        {n >= 2 && <><path d="M100 0 C100 10,200 8,200 24" stroke={phaseColor} strokeWidth="2" fill="none" opacity="0.2"/><path d="M300 0 C300 10,200 8,200 24" stroke={phaseColor} strokeWidth="2" fill="none" opacity="0.2"/></>}
      </svg>
    </div>
  );
}
