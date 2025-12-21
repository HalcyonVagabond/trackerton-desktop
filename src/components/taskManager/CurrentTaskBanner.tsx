interface CurrentTaskBannerProps {
  taskName: string;
  timerDisplay: string;
  timerStatus: 'running' | 'paused';
  projectName?: string;
  organizationName?: string;
  onStop: () => void;
  onResume: () => void;
  actionDisabled: boolean;
}

export function CurrentTaskBanner({
  taskName,
  timerDisplay,
  timerStatus,
  projectName,
  organizationName,
  onStop,
  onResume,
  actionDisabled,
}: CurrentTaskBannerProps) {
  const statusLabel = timerStatus === 'running' ? 'Timer running' : 'Timer paused';

  return (
    <div className={`current-task-alert ${timerStatus === 'paused' ? 'is-paused' : ''}`}>
      <div className="current-task-alert__status">
        <span className="current-task-alert__indicator" aria-hidden="true" />
        <span>{statusLabel}</span>
      </div>
      <div className="current-task-alert__details">
        <span className="current-task-alert__task">{taskName}</span>
        {projectName ? <span className="current-task-alert__separator" aria-hidden="true" /> : null}
        {projectName ? <span className="current-task-alert__project">{projectName}</span> : null}
        {organizationName ? <span className="current-task-alert__separator" aria-hidden="true" /> : null}
        {organizationName ? <span className="current-task-alert__org">{organizationName}</span> : null}
      </div>
      <div className="current-task-alert__spacer" />
      <div className="current-task-alert__timer">{timerDisplay}</div>
      <div className="current-task-alert__actions">
        <button
          type="button"
          className={`timer-control-btn ${
            timerStatus === 'running' ? 'timer-control-btn--stop' : 'timer-control-btn--start'
          }`}
          onClick={timerStatus === 'running' ? onStop : onResume}
          disabled={actionDisabled}
        >
          {timerStatus === 'running' ? 'Stop' : 'Resume'}
        </button>
      </div>
    </div>
  );
}
