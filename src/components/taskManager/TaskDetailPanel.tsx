import type { Task } from '../../types/electron';
import type { TaskDetail } from '../../types/taskManager';
import { formatDateTime, formatDuration } from '../../utils/taskManager';
import type { TimeEntry } from '../../types/electron';

interface TaskDetailPanelProps {
  hasOrganization: boolean;
  hasProject: boolean;
  hasTask: boolean;
  loadingTask: boolean;
  taskDetail: TaskDetail | null;
  onProjectNameBlur: (projectId: number, value: string) => void;
  onProjectDescriptionBlur: (projectId: number, value: string) => void;
  onTaskNameBlur: (taskId: number, value: string) => void;
  onOpenTimeEntryModal: (entry: TimeEntry) => void;
  onDeleteTimeEntry: (entryId: number) => void;
  timerTask: Task | null;
  timerStatus: 'idle' | 'running' | 'paused';
  timerDisplay: string;
  timerElapsedTime: number;
  onStopTimer: () => void;
  onStartTimer: (task: Task) => void;
  actionDisabled: boolean;
  getRealTimeTotal: (taskId: number, savedDuration: number) => number;
}

export function TaskDetailPanel({
  hasOrganization,
  hasProject,
  hasTask,
  loadingTask,
  taskDetail,
  onProjectNameBlur,
  onProjectDescriptionBlur,
  onTaskNameBlur,
  onOpenTimeEntryModal,
  onDeleteTimeEntry,
  timerTask,
  timerStatus,
  timerDisplay,
  timerElapsedTime,
  onStopTimer,
  onStartTimer,
  actionDisabled,
  getRealTimeTotal,
}: TaskDetailPanelProps) {
  if (!hasOrganization) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">👈</div>
        <div className="empty-state__title">Select an Organization</div>
        <div className="empty-state__text">Choose an organization to start managing work</div>
      </div>
    );
  }

  if (!hasProject) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">👈</div>
        <div className="empty-state__title">Select a Project</div>
        <div className="empty-state__text">Choose a project from the sidebar to view its tasks</div>
      </div>
    );
  }

  if (!hasTask) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📝</div>
        <div className="empty-state__title">Select a Task</div>
        <div className="empty-state__text">Pick a task to see detailed time entries</div>
      </div>
    );
  }

  if (loadingTask) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">⏳</div>
        <div className="empty-state__text">Loading task…</div>
      </div>
    );
  }

  if (!taskDetail) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">❌</div>
        <div className="empty-state__title">Task Unavailable</div>
        <div className="empty-state__text">Unable to load the selected task</div>
      </div>
    );
  }

  const isTimerTask = timerTask?.id === taskDetail.id;
  const timerRunning = isTimerTask && timerStatus === 'running';
  // Only count running timer as an entry (paused timer doesn't show as a separate row)
  const entryCount = taskDetail.timeEntries.length + (timerRunning ? 1 : 0);
  const startSelectedTask = () => onStartTimer(taskDetail);

  // Calculate real-time total: saved duration + current unsaved elapsed time
  const realTimeTotal = getRealTimeTotal(taskDetail.id, taskDetail.totalDuration);

  let primaryActionLabel: string | null = null;
  let primaryActionVariant: 'start' | 'stop' = 'start';
  let primaryActionHandler: (() => void) | null = null;

  if (isTimerTask) {
    if (timerStatus === 'running') {
      primaryActionLabel = 'Stop';
      primaryActionVariant = 'stop';
      primaryActionHandler = onStopTimer;
    } else if (timerStatus === 'paused') {
      primaryActionLabel = 'Resume';
      primaryActionVariant = 'start';
      primaryActionHandler = startSelectedTask;
    } else {
      primaryActionLabel = 'Start';
      primaryActionVariant = 'start';
      primaryActionHandler = startSelectedTask;
    }
  } else {
    primaryActionLabel = 'Start';
    primaryActionVariant = 'start';
    primaryActionHandler = startSelectedTask;
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div style={{ flex: 1 }}>
          <input
            type="text"
            className="project-name-input"
            defaultValue={taskDetail.projectName}
            onBlur={(event) => onProjectNameBlur(taskDetail.projectId, event.target.value)}
            placeholder="Project name"
          />
          <div className="panel-subtitle">
            {entryCount} time entr{entryCount === 1 ? 'y' : 'ies'}
          </div>
        </div>
        <div className="project-description">
          <div className="description-label">Project Description</div>
          <textarea
            className="description-textarea"
            defaultValue={taskDetail.projectDescription ?? ''}
            onBlur={(event) => onProjectDescriptionBlur(taskDetail.projectId, event.target.value)}
            placeholder="Add a project description…"
          />
        </div>
      </div>
      <div className="panel-content">
        <div className="task-detail-view">
          <div className="task-detail-header">
            <input
              type="text"
              className="task-detail-name"
              defaultValue={taskDetail.name}
              onBlur={(event) => onTaskNameBlur(taskDetail.id, event.target.value)}
              placeholder="Task name"
            />
            {primaryActionHandler ? (
              <div className="task-detail-actions">
                <button
                  type="button"
                  className={`timer-control-btn timer-control-btn--${primaryActionVariant} timer-control-btn--compact`}
                  onClick={primaryActionHandler}
                  disabled={actionDisabled}
                >
                  {primaryActionLabel}
                </button>
              </div>
            ) : null}
          </div>
          <div className="task-stats">
            <div className="stat-item">
              <div className="stat-label">Total Time</div>
              <div className="stat-value stat-value--time">{formatDuration(realTimeTotal)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">First Started</div>
              <div className="stat-value">{formatDateTime(taskDetail.firstTimestamp)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Last Worked</div>
              <div className="stat-value">{formatDateTime(taskDetail.latestTimestamp)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Time Entries</div>
              <div className="stat-value">{entryCount}</div>
            </div>
          </div>
          <div className="time-entries-section">
            <div className="time-entries-header">
              Time Entries
              {entryCount ? <span className="time-entries-count">{entryCount}</span> : null}
            </div>
            {timerRunning && (
              <div className="time-entry time-entry--current">
                <div className="time-entry__info">
                  <span className="time-entry__duration">{timerDisplay}</span>
                  <span className="time-entry__timestamp">Tracking now...</span>
                </div>
                <div className="time-entry__actions time-entry__actions--visible">
                  <span className="time-entry__status-label">Running</span>
                  <button
                    type="button"
                    className="timer-control-btn timer-control-btn--stop timer-control-btn--compact"
                    onClick={onStopTimer}
                    disabled={actionDisabled}
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}
            {taskDetail.timeEntries.length ? (
              taskDetail.timeEntries.map((entry) => (
                <div className="time-entry" key={entry.id}>
                  <div className="time-entry__info">
                    <span className="time-entry__duration">{formatDuration(entry.duration)}</span>
                    <span className="time-entry__timestamp">{formatDateTime(entry.timestamp)}</span>
                  </div>
                  <div className="time-entry__actions">
                    <button className="btn-text btn-text--edit" onClick={() => onOpenTimeEntryModal(entry)}>
                      Edit
                    </button>
                    <button className="btn-text btn-text--delete" onClick={() => onDeleteTimeEntry(entry.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : !timerRunning ? (
              <div className="empty-state__text" style={{ padding: '20px' }}>
                No time entries yet
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
