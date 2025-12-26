import { useState, useRef, useEffect } from 'react';
import type { Task, TaskStatus, ProjectStatus } from '../../types/electron';
import type { ProjectWithTasks } from '../../types/taskManager';
import { formatDuration } from '../../utils/taskManager';

// Dropdown menu component
function DropdownMenu({ 
  isOpen, 
  onClose, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div ref={menuRef} className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

interface ContentPanelProps {
  // Selection state
  hasOrganization: boolean;
  hasProject: boolean;
  selectedTaskId: number | null;
  
  // Project data
  project: ProjectWithTasks | null;
  projectTotalTime: number;
  taskDurations: Record<number, number>; // Map of taskId -> total duration in seconds (from DB)
  
  // Timer state
  timerTask: Task | null;
  timerStatus: 'idle' | 'running' | 'paused';
  getUnsavedTime: () => number; // Get unsaved timer time (since last auto-save)
  
  // Handlers
  onProjectNameChange: (name: string) => void;
  onProjectDescriptionChange: (desc: string) => void;
  onProjectStatusChange: (status: ProjectStatus) => void;
  onSelectTask: (taskId: number) => void;
  onAddTask: () => void;
  onEditTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  onStartTimer: (task: Task) => void;
  onStopTimer: () => void;
  
  actionDisabled: boolean;
}

const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const TASK_STATUSES: Record<string, { label: string }> = {
  todo: { label: 'To Do' },
  in_progress: { label: 'In Progress' },
  on_hold: { label: 'On Hold' },
  completed: { label: 'Completed' },
  archived: { label: 'Archived' },
};

function getStatusBadgeClass(status?: string): string {
  return `status-badge status-badge--${status || 'todo'}`;
}

function getStatusLabel(status?: string): string {
  return TASK_STATUSES[status || 'todo']?.label || 'To Do';
}

export function ContentPanel({
  hasOrganization,
  hasProject,
  selectedTaskId,
  project,
  projectTotalTime,
  taskDurations,
  timerTask,
  timerStatus,
  getUnsavedTime,
  onProjectNameChange,
  onProjectDescriptionChange,
  onProjectStatusChange,
  onSelectTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onStartTimer,
  onStopTimer,
  actionDisabled,
}: ContentPanelProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  
  // Calculate timer task's total time: DB saved duration + unsaved time
  const timerTaskTotalTime = timerTask 
    ? (taskDurations[timerTask.id] || 0) + getUnsavedTime()
    : 0;
  
  // Empty states
  if (!hasOrganization) {
    return (
      <main className="main-panel">
        <div className="content-area">
          <div className="empty-state" style={{ height: '100%' }}>
            <div className="empty-state__icon">🏢</div>
            <div className="empty-state__title">Welcome to Trackerton</div>
            <div className="empty-state__text">Select an organization from the sidebar to start tracking your time</div>
          </div>
        </div>
      </main>
    );
  }

  if (!hasProject || !project) {
    return (
      <main className="main-panel">
        <div className="content-area">
          <div className="empty-state" style={{ height: '100%' }}>
            <div className="empty-state__icon">📁</div>
            <div className="empty-state__title">Select a Project</div>
            <div className="empty-state__text">Choose a project from the sidebar or create a new one</div>
          </div>
        </div>
      </main>
    );
  }

  const tasks = project.tasks || [];
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'archived');

  return (
    <main className="main-panel">
      {/* Timer Banner - only show when timer is active */}
      {timerTask && timerStatus !== 'idle' && (
        <div className="timer-banner">
          <div className="timer-banner__info">
            <div className="timer-banner__status">
              <span className={`timer-banner__status-dot timer-banner__status-dot--${timerStatus}`} />
              {timerStatus === 'running' ? 'Timer Running' : 'Timer Paused'}
            </div>
            <div className="timer-banner__breadcrumb">
              <span>{timerTask.name}</span>
            </div>
          </div>
          <div className="timer-banner__controls">
            <span className="timer-banner__time">{formatDuration(timerTaskTotalTime)}</span>
            <button 
              className={`btn btn--${timerStatus === 'running' ? 'danger' : 'success'}`}
              onClick={timerStatus === 'running' ? onStopTimer : () => onStartTimer(timerTask)}
              disabled={actionDisabled}
            >
              {timerStatus === 'running' ? 'Stop' : 'Resume'}
            </button>
          </div>
        </div>
      )}

      <div className="content-area">
        <div className="project-view">
          {/* Project Header */}
          <div className="project-header">
            <div className="project-header__top">
              <input
                key={`project-name-${project.id}`}
                type="text"
                className="project-header__title"
                defaultValue={project.name}
                onBlur={(e) => {
                  if (e.target.value.trim() !== project.name) {
                    onProjectNameChange(e.target.value.trim());
                  }
                }}
                placeholder="Project name"
              />
              <select
                className="filter-select"
                value={project.status || 'in_progress'}
                onChange={(e) => onProjectStatusChange(e.target.value as ProjectStatus)}
                style={{ width: 'auto', minWidth: '140px' }}
              >
                {PROJECT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            
            <textarea
              key={`project-desc-${project.id}`}
              className="project-header__description"
              placeholder="Add project description..."
              defaultValue={project.description || ''}
              onBlur={(e) => {
                if (e.target.value !== (project.description || '')) {
                  onProjectDescriptionChange(e.target.value);
                }
              }}
              rows={2}
            />
          </div>

          {/* Project Stats */}
          <div className="project-stats">
            <div className="project-stat">
              <div className="project-stat__value project-stat__value--time">
                {formatDuration(projectTotalTime)}
              </div>
              <div className="project-stat__label">Total Time</div>
            </div>
            <div className="project-stat">
              <div className="project-stat__value">{tasks.length}</div>
              <div className="project-stat__label">Total Tasks</div>
            </div>
            <div className="project-stat">
              <div className="project-stat__value">{inProgressTasks.length}</div>
              <div className="project-stat__label">In Progress</div>
            </div>
            <div className="project-stat">
              <div className="project-stat__value">{completedTasks.length}</div>
              <div className="project-stat__label">Completed</div>
            </div>
          </div>

          {/* Task List */}
          <div className="task-section">
            <div className="task-section__header">
              <h3 className="task-section__title">Tasks</h3>
              <button className="btn btn--primary btn--sm" onClick={onAddTask}>
                + Add Task
              </button>
            </div>
            
            {tasks.length === 0 ? (
              <div className="task-section__empty">
                <div className="empty-state__icon">📋</div>
                <div className="empty-state__title">No tasks yet</div>
                <div className="empty-state__text">Create your first task to start tracking time</div>
                <button className="btn btn--primary" onClick={onAddTask} style={{ marginTop: '16px' }}>
                  + Create Task
                </button>
              </div>
            ) : (
              <div className="task-table">
                <div className="task-table__header">
                  <div className="task-table__col task-table__col--name">Task Name</div>
                  <div className="task-table__col task-table__col--time">Time</div>
                  <div className="task-table__col task-table__col--status">Status</div>
                  <div className="task-table__col task-table__col--timer">Timer</div>
                  <div className="task-table__col task-table__col--menu"></div>
                </div>
                
                {tasks.map(task => {
                  const isActive = timerTask?.id === task.id && timerStatus !== 'idle';
                  const isSelected = selectedTaskId === task.id;
                  const isRunning = timerTask?.id === task.id && timerStatus === 'running';
                  
                  // Calculate real-time task duration
                  const savedDuration = taskDurations[task.id] || 0;
                  const taskTime = isActive 
                    ? savedDuration + getUnsavedTime()
                    : savedDuration;
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`task-table__row ${isSelected ? 'task-table__row--selected' : ''} ${isActive ? 'task-table__row--active' : ''}`}
                      onClick={() => onSelectTask(task.id)}
                    >
                      <div className="task-table__col task-table__col--name">
                        <div className="task-table__name-wrapper">
                          {isActive && (
                            <span className={`task-table__indicator task-table__indicator--${timerStatus}`} />
                          )}
                          <span className="task-table__name">{task.name}</span>
                        </div>
                        {task.description && (
                          <span className="task-table__description">{task.description}</span>
                        )}
                      </div>
                      <div className="task-table__col task-table__col--time">
                        <span className={`task-table__time ${isActive ? 'task-table__time--active' : ''}`}>
                          {taskTime > 0 ? formatDuration(taskTime) : '—'}
                        </span>
                      </div>
                      <div className="task-table__col task-table__col--status">
                        <span className={getStatusBadgeClass(task.status)}>
                          {getStatusLabel(task.status)}
                        </span>
                      </div>
                      <div className="task-table__col task-table__col--timer">
                        {isRunning ? (
                          <button 
                            className="btn btn--danger btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStopTimer();
                            }}
                            disabled={actionDisabled}
                          >
                            Stop
                          </button>
                        ) : (
                          <button 
                            className="btn btn--success btn--sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartTimer(task);
                            }}
                            disabled={actionDisabled}
                          >
                            {isActive ? 'Resume' : 'Start'}
                          </button>
                        )}
                      </div>
                      <div className="task-table__col task-table__col--menu">
                        <div style={{ position: 'relative' }}>
                          <button 
                            className="btn btn--icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === task.id ? null : task.id);
                            }}
                            title="More options"
                          >
                            <span className="dots-icon" />
                          </button>
                          <DropdownMenu 
                            isOpen={openMenuId === task.id} 
                            onClose={() => setOpenMenuId(null)}
                          >
                            <button 
                              className="dropdown-menu__item"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onEditTask(task.id);
                              }}
                            >
                              <span className="dropdown-menu__icon">✏️</span>
                              Edit Task
                            </button>
                            <button 
                              className="dropdown-menu__item dropdown-menu__item--danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                onDeleteTask(task.id);
                              }}
                            >
                              <span className="dropdown-menu__icon">🗑️</span>
                              Delete Task
                            </button>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
