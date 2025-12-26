import { useState, useMemo, useRef, useEffect } from 'react';
import type { Task, TaskStatus, TimeEntry } from '../../types/electron';
import type { TaskDetail } from '../../types/taskManager';
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
    <div ref={menuRef} className="dropdown-menu dropdown-menu--up" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Task data
  taskDetail: TaskDetail | null;
  loadingTask: boolean;
  
  // Timer state
  timerTask: Task | null;
  timerStatus: 'idle' | 'running' | 'paused';
  getUnsavedTime: () => number; // Unsaved time since last auto-save (for Recording entry & total)
  
  // Handlers
  onTaskNameChange: (name: string) => void;
  onTaskDescriptionChange: (desc: string) => void;
  onTaskStatusChange: (status: TaskStatus) => void;
  onStartTimer: (task: Task) => void;
  onStopTimer: () => void;
  onEditTimeEntry: (entry: TimeEntry) => void;
  onDeleteTimeEntry: (entryId: number) => void;
  
  actionDisabled: boolean;
}

const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export function DetailPanel({
  isOpen,
  onClose,
  taskDetail,
  loadingTask,
  timerTask,
  timerStatus,
  getUnsavedTime,
  onTaskNameChange,
  onTaskDescriptionChange,
  onTaskStatusChange,
  onStartTimer,
  onStopTimer,
  onEditTimeEntry,
  onDeleteTimeEntry,
  actionDisabled,
}: DetailPanelProps) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [openEntryMenuId, setOpenEntryMenuId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  
  // Group entries by date - always call this hook
  const groupedEntries = useMemo(() => {
    if (!taskDetail?.timeEntries) return [];
    
    const groups: { date: string; entries: TimeEntry[]; totalDuration: number }[] = [];
    const dateMap = new Map<string, TimeEntry[]>();
    
    taskDetail.timeEntries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date)!.push(entry);
    });
    
    dateMap.forEach((entries, date) => {
      const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
      groups.push({ date, entries, totalDuration });
    });
    
    return groups;
  }, [taskDetail?.timeEntries]);
  
  // Now we can have early returns
  if (!isOpen) return null;
  
  // Timer state for this task
  const isTimerTask = taskDetail && timerTask?.id === taskDetail.id;
  const isTimerRunning = isTimerTask && timerStatus === 'running';
  const isTimerPaused = isTimerTask && timerStatus === 'paused';
  
  // Real-time total: DB saved duration + unsaved time (if this is the timer task)
  const taskTotalTime = isTimerTask 
    ? (taskDetail?.totalDuration || 0) + getUnsavedTime()
    : (taskDetail?.totalDuration || 0);
    
  // Entry count includes running timer as virtual entry
  const entryCount = (taskDetail?.timeEntries.length || 0) + (isTimerRunning ? 1 : 0);
  
  // Determine primary action
  let primaryAction: { label: string; variant: 'success' | 'danger' | 'primary'; handler: () => void } | null = null;
  
  if (taskDetail) {
    if (isTimerRunning) {
      primaryAction = { label: 'Stop', variant: 'danger', handler: onStopTimer };
    } else if (isTimerPaused) {
      primaryAction = { label: 'Resume', variant: 'success', handler: () => onStartTimer(taskDetail) };
    } else if (timerTask && timerStatus !== 'idle') {
      primaryAction = { label: 'Switch', variant: 'primary', handler: () => onStartTimer(taskDetail) };
    } else {
      primaryAction = { label: 'Start', variant: 'success', handler: () => onStartTimer(taskDetail) };
    }
  }
  
  const handleNameBlur = () => {
    if (tempName.trim() && tempName !== taskDetail?.name) {
      onTaskNameChange(tempName.trim());
    }
    setEditingName(false);
  };

  return (
    <>
      {/* Backdrop for clicking outside */}
      <div className="detail-panel-backdrop" onClick={onClose} />
      
      <aside ref={panelRef} className="detail-panel detail-panel--open">
        <div className="detail-panel__header">
          <h2 className="detail-panel__title">Task Details</h2>
          <button className="detail-panel__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className="detail-panel__content">
          {loadingTask ? (
            <div className="detail-panel__loading">Loading...</div>
          ) : !taskDetail ? (
            <div className="detail-panel__empty">
              <div className="empty-state__icon">📋</div>
              <div className="empty-state__text">Select a task to view details</div>
            </div>
          ) : (
            <>
              {/* Task Header */}
              <div className="detail-section">
                <div className="detail-task-header">
                  {editingName ? (
                    <input
                      type="text"
                      className="detail-task-header__input"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={handleNameBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameBlur();
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                      autoFocus
                    />
                  ) : (
                    <h3 
                      className="detail-task-header__name"
                      onClick={() => {
                        setTempName(taskDetail.name);
                        setEditingName(true);
                      }}
                      title="Click to edit"
                    >
                      {taskDetail.name}
                    </h3>
                  )}
                  <select
                    className="filter-select filter-select--sm"
                    value={taskDetail.status || 'todo'}
                    onChange={(e) => onTaskStatusChange(e.target.value as TaskStatus)}
                  >
                    {TASK_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                
                <textarea
                  className="detail-description"
                  placeholder="Add task description..."
                  defaultValue={taskDetail.description || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (taskDetail.description || '')) {
                      onTaskDescriptionChange(e.target.value);
                    }
                  }}
                  rows={2}
                />
              </div>
              
              {/* Timer Controls */}
              <div className="detail-timer-section">
                <div className="detail-timer">
                  <div className="detail-timer__display">
                    {formatDuration(taskTotalTime)}
                  </div>
                  <div className="detail-timer__label">
                    {isTimerRunning ? 'RUNNING' : isTimerPaused ? 'PAUSED' : 'Total Time'}
                  </div>
                </div>
                {primaryAction && (
                  <button 
                    className={`btn btn--${primaryAction.variant}`}
                    onClick={primaryAction.handler}
                    disabled={actionDisabled}
                  >
                    {primaryAction.label}
                  </button>
                )}
              </div>
              
              {/* Quick Stats */}
              <div className="detail-section">
                <div className="detail-stats">
                  <div className="detail-stat">
                    <div className="detail-stat__value">{entryCount}</div>
                    <div className="detail-stat__label">Entries</div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat__value">
                      {taskDetail.firstTimestamp 
                        ? new Date(taskDetail.firstTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'
                      }
                    </div>
                    <div className="detail-stat__label">Started</div>
                  </div>
                  <div className="detail-stat">
                    <div className="detail-stat__value">
                      {taskDetail.latestTimestamp 
                        ? new Date(taskDetail.latestTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'
                      }
                    </div>
                    <div className="detail-stat__label">Last Entry</div>
                  </div>
                </div>
              </div>
              
              {/* Time Entries Breakdown */}
              <div className="detail-section detail-entries-section">
                <div className="detail-section__header">
                  <h4 className="detail-section__title">Time Entries</h4>
                </div>
                
                <div className="detail-entries">
                  {/* Current running entry */}
                  {isTimerRunning && (
                    <div className="detail-entry detail-entry--active">
                      <div className="detail-entry__row">
                        <span className="detail-entry__time">{formatDuration(getUnsavedTime())}</span>
                        <span className="detail-entry__badge">Recording</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Grouped entries by date */}
                  {groupedEntries.length > 0 ? (
                    groupedEntries.map(group => (
                      <div key={group.date} className="detail-entry-group">
                        <div className="detail-entry-group__header">
                          <span>{group.date}</span>
                          <span className="detail-entry-group__total">{formatDuration(group.totalDuration)}</span>
                        </div>
                        {group.entries.map(entry => (
                          <div key={entry.id} className="detail-entry">
                            <div className="detail-entry__row">
                              <span className="detail-entry__time">{formatDuration(entry.duration)}</span>
                              <div className="detail-entry__right">
                                <span className="detail-entry__timestamp">
                                  {new Date(entry.timestamp).toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </span>
                                <div style={{ position: 'relative' }}>
                                  <button 
                                    className="btn btn--icon btn--icon-sm"
                                    onClick={() => setOpenEntryMenuId(openEntryMenuId === entry.id ? null : entry.id)}
                                    title="More options"
                                  >
                                    <span className="dots-icon" />
                                  </button>
                                  <DropdownMenu 
                                    isOpen={openEntryMenuId === entry.id} 
                                    onClose={() => setOpenEntryMenuId(null)}
                                  >
                                    <button 
                                      className="dropdown-menu__item"
                                      onClick={() => {
                                        setOpenEntryMenuId(null);
                                        onEditTimeEntry(entry);
                                      }}
                                    >
                                      <span className="dropdown-menu__icon">✏️</span>
                                      Edit Entry
                                    </button>
                                    <button 
                                      className="dropdown-menu__item dropdown-menu__item--danger"
                                      onClick={() => {
                                        setOpenEntryMenuId(null);
                                        onDeleteTimeEntry(entry.id);
                                      }}
                                    >
                                      <span className="dropdown-menu__icon">🗑️</span>
                                      Delete Entry
                                    </button>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                            {entry.notes && (
                              <div className="detail-entry__notes">{entry.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : !isTimerRunning && (
                    <div className="detail-entries__empty">
                      No time entries yet
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
