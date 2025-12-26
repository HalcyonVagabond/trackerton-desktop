import { useState, useMemo, useRef, useEffect } from 'react';
import type { ProjectWithTasks } from '../../types/taskManager';
import type { ProjectStatus, TaskStatus, Task } from '../../types/electron';
import { formatDuration } from '../../utils/taskManager';
import { IDLE_THRESHOLD_OPTIONS, type AutoPauseSettings } from '../../hooks/useAutoPause';

// Simple dropdown menu component
function DropdownMenu({ 
  isOpen, 
  onClose, 
  children,
  align = 'right'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
  align?: 'left' | 'right';
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
    <div 
      ref={menuRef} 
      className={`dropdown-menu dropdown-menu--${align}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

interface NavPanelProps {
  // Organization
  organizations: { id: number; name: string; status?: string }[];
  selectedOrgId: number | null;
  selectedOrgStatus?: string;
  onSelectOrg: (id: number) => void;
  onAddOrg: () => void;
  onEditOrg: () => void;
  onArchiveOrg: () => void;
  onUnarchiveOrg: () => void;
  onDeleteOrg: () => void;
  
  // Filters
  projectStatusFilter: ProjectStatus | null;
  taskStatusFilter: TaskStatus | null;
  onProjectStatusFilterChange: (status: ProjectStatus | null) => void;
  onTaskStatusFilterChange: (status: TaskStatus | null) => void;
  
  // Projects
  projects: ProjectWithTasks[];
  expandedProjects: Set<number>;
  selectedProjectId: number | null;
  selectedTaskId: number | null;
  onToggleProject: (projectId: number) => void;
  onSelectProject: (projectId: number) => void;
  onSelectTask: (projectId: number, taskId: number) => void;
  onAddProject: () => void;
  onEditProject: (projectId: number) => void;
  onDeleteProject: (projectId: number) => void;
  onAddTask: (projectId: number) => void;
  onEditTask: (taskId: number) => void;
  onDeleteTask: (taskId: number) => void;
  
  // Reorder callbacks
  onReorderProjects?: (projectId: number, newIndex: number) => void;
  onReorderTasks?: (taskId: number, projectId: number, newIndex: number) => void;
  
  // Timer state
  timerTask: Task | null;
  timerStatus: 'idle' | 'running' | 'paused';
  
  // Theme
  effectiveTheme: 'light' | 'dark';
  themeMode: 'light' | 'dark' | 'system';
  onThemeChange: (mode: 'light' | 'dark' | 'system') => void;
  
  // Auto-pause settings
  autoPauseSettings: AutoPauseSettings;
  onAutoPauseToggle: () => void;
  onAutoPauseThresholdChange: (threshold: number) => void;
  
  // Loading
  loading: boolean;
}

const PROJECT_STATUSES: { value: ProjectStatus | ''; label: string }[] = [
  { value: '', label: 'All Projects' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const TASK_STATUSES: { value: TaskStatus | ''; label: string }[] = [
  { value: '', label: 'All Tasks' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

function getStatusBadgeClass(status?: string): string {
  return `status-badge status-badge--${status || 'todo'}`;
}

function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    on_hold: 'On Hold',
    completed: 'Completed',
    archived: 'Archived',
    active: 'Active',
    inactive: 'Inactive',
  };
  return labels[status || 'todo'] || status || 'To Do';
}

export function NavPanel({
  organizations,
  selectedOrgId,
  selectedOrgStatus,
  onSelectOrg,
  onAddOrg,
  onEditOrg,
  onArchiveOrg,
  onUnarchiveOrg,
  onDeleteOrg,
  projectStatusFilter,
  taskStatusFilter,
  onProjectStatusFilterChange,
  onTaskStatusFilterChange,
  projects,
  expandedProjects,
  selectedProjectId,
  selectedTaskId,
  onToggleProject,
  onSelectProject,
  onSelectTask,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onReorderProjects,
  onReorderTasks,
  timerTask,
  timerStatus,
  effectiveTheme,
  themeMode,
  onThemeChange,
  autoPauseSettings,
  onAutoPauseToggle,
  onAutoPauseThresholdChange,
  loading,
}: NavPanelProps) {
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  
  // Drag state for projects
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<number | null>(null);
  
  // Drag state for tasks
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [draggedTaskProjectId, setDraggedTaskProjectId] = useState<number | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);

  // Project drag handlers
  const handleProjectDragStart = (e: React.DragEvent, projectId: number) => {
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `project:${projectId}`);
  };

  const handleProjectDragEnd = () => {
    setDraggedProjectId(null);
    setDragOverProjectId(null);
  };

  const handleProjectDragOver = (e: React.DragEvent, projectId: number) => {
    e.preventDefault();
    if (draggedProjectId && draggedProjectId !== projectId) {
      setDragOverProjectId(projectId);
    }
  };

  const handleProjectDragLeave = () => {
    setDragOverProjectId(null);
  };

  const handleProjectDrop = (e: React.DragEvent, targetProjectId: number) => {
    e.preventDefault();
    if (draggedProjectId && draggedProjectId !== targetProjectId && onReorderProjects) {
      const targetIndex = projects.findIndex(p => p.id === targetProjectId);
      onReorderProjects(draggedProjectId, targetIndex);
    }
    setDraggedProjectId(null);
    setDragOverProjectId(null);
  };

  // Task drag handlers
  const handleTaskDragStart = (e: React.DragEvent, taskId: number, projectId: number) => {
    e.stopPropagation();
    setDraggedTaskId(taskId);
    setDraggedTaskProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `task:${taskId}:${projectId}`);
  };

  const handleTaskDragEnd = () => {
    setDraggedTaskId(null);
    setDraggedTaskProjectId(null);
    setDragOverTaskId(null);
  };

  const handleTaskDragOver = (e: React.DragEvent, taskId: number, projectId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTaskId && draggedTaskId !== taskId && draggedTaskProjectId === projectId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleTaskDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleTaskDrop = (e: React.DragEvent, targetTaskId: number, projectId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTaskId && draggedTaskId !== targetTaskId && draggedTaskProjectId === projectId && onReorderTasks) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        const targetIndex = project.tasks.findIndex(t => t.id === targetTaskId);
        onReorderTasks(draggedTaskId, projectId, targetIndex);
      }
    }
    setDraggedTaskId(null);
    setDraggedTaskProjectId(null);
    setDragOverTaskId(null);
  };
  
  // Calculate project total times
  const projectTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    projects.forEach(project => {
      // Sum up all task times for this project
      // Note: This is a simplified calculation - actual implementation may need to fetch from DB
      totals[project.id] = 0; // Will be calculated when we have task details
    });
    return totals;
  }, [projects]);

  return (
    <nav className="nav-panel">
      {/* App Logo */}
      <div className="nav-brand">
        <img src={effectiveTheme === 'dark' ? '/logo-icon-light.png' : '/logo-icon-dark.png'} alt="Trackerton" className="nav-brand__logo" />
        <span className="nav-brand__title">Trackerton</span>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <button
            className="btn btn--ghost btn--icon"
            onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
            title="Settings"
          >
            <span style={{ fontSize: '16px' }}>⚙</span>
          </button>
          <DropdownMenu isOpen={settingsMenuOpen} onClose={() => setSettingsMenuOpen(false)} align="right">
            <div className="dropdown-menu__label">Theme</div>
            <button
              className={`dropdown-menu__item ${themeMode === 'light' ? 'dropdown-menu__item--active' : ''}`}
              onClick={() => { onThemeChange('light'); setSettingsMenuOpen(false); }}
            >
              <span className="dropdown-menu__icon">☀️</span>
              Light
            </button>
            <button
              className={`dropdown-menu__item ${themeMode === 'dark' ? 'dropdown-menu__item--active' : ''}`}
              onClick={() => { onThemeChange('dark'); setSettingsMenuOpen(false); }}
            >
              <span className="dropdown-menu__icon">🌙</span>
              Dark
            </button>
            <button
              className={`dropdown-menu__item ${themeMode === 'system' ? 'dropdown-menu__item--active' : ''}`}
              onClick={() => { onThemeChange('system'); setSettingsMenuOpen(false); }}
            >
              <span className="dropdown-menu__icon">💻</span>
              System
            </button>
            
            <div className="dropdown-menu__divider" />
            <div className="dropdown-menu__label">Auto-Pause</div>
            <button
              className={`dropdown-menu__item ${autoPauseSettings.enabled ? 'dropdown-menu__item--active' : ''}`}
              onClick={onAutoPauseToggle}
            >
              <span className="dropdown-menu__icon">{autoPauseSettings.enabled ? '✓' : ''}</span>
              {autoPauseSettings.enabled ? 'Enabled' : 'Disabled'}
            </button>
            {autoPauseSettings.enabled && (
              <>
                <div className="dropdown-menu__sublabel">Pause after idle</div>
                {IDLE_THRESHOLD_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    className={`dropdown-menu__item dropdown-menu__item--indent ${autoPauseSettings.idleThreshold === option.value ? 'dropdown-menu__item--active' : ''}`}
                    onClick={() => onAutoPauseThresholdChange(option.value)}
                  >
                    <span className="dropdown-menu__icon">{autoPauseSettings.idleThreshold === option.value ? '•' : ''}</span>
                    {option.label}
                  </button>
                ))}
              </>
            )}
          </DropdownMenu>
        </div>
      </div>
      
      {/* Organization Selector */}
      <div className="nav-header">
        <div className="nav-header__title">Organization</div>
        <div className="org-selector-row">
          <select
            className="org-selector"
            value={selectedOrgId || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) onSelectOrg(id);
            }}
          >
            <option value="" disabled>Select organization...</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <button 
            className="btn btn--ghost btn--icon" 
            onClick={onAddOrg}
            title="Add Organization"
          >
            <span style={{ fontSize: '18px', fontWeight: 300, lineHeight: 1 }}>+</span>
          </button>
          {selectedOrgId && (
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn--ghost btn--icon" 
                onClick={() => setOrgMenuOpen(!orgMenuOpen)}
                title="More options"
              >
                <span className="dots-icon" />
              </button>
              <DropdownMenu isOpen={orgMenuOpen} onClose={() => setOrgMenuOpen(false)}>
                <button 
                  className="dropdown-menu__item"
                  onClick={() => {
                    setOrgMenuOpen(false);
                    onEditOrg();
                  }}
                >
                  <span className="dropdown-menu__icon">✎</span>
                  Edit Organization
                </button>
                {selectedOrgStatus === 'archived' ? (
                  <>
                    <button 
                      className="dropdown-menu__item"
                      onClick={() => {
                        setOrgMenuOpen(false);
                        onUnarchiveOrg();
                      }}
                    >
                      <span className="dropdown-menu__icon">📤</span>
                      Restore Organization
                    </button>
                    <button 
                      className="dropdown-menu__item dropdown-menu__item--danger"
                      onClick={() => {
                        setOrgMenuOpen(false);
                        onDeleteOrg();
                      }}
                    >
                      <span className="dropdown-menu__icon">🗑</span>
                      Delete Permanently
                    </button>
                  </>
                ) : (
                  <button 
                    className="dropdown-menu__item dropdown-menu__item--warning"
                    onClick={() => {
                      setOrgMenuOpen(false);
                      onArchiveOrg();
                    }}
                  >
                    <span className="dropdown-menu__icon">📦</span>
                    Archive Organization
                  </button>
                )}
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="nav-filters">
        <select
          className="filter-select"
          value={projectStatusFilter || ''}
          onChange={(e) => onProjectStatusFilterChange(e.target.value as ProjectStatus || null)}
        >
          {PROJECT_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={taskStatusFilter || ''}
          onChange={(e) => onTaskStatusFilterChange(e.target.value as TaskStatus || null)}
        >
          {TASK_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Projects List */}
      <div className="nav-content">
        {!selectedOrgId ? (
          <div className="empty-state">
            <div className="empty-state__icon">🏢</div>
            <div className="empty-state__title">Select an Organization</div>
            <div className="empty-state__text">Choose or create an organization to get started</div>
          </div>
        ) : loading ? (
          <div className="empty-state">
            <div className="empty-state__text">Loading projects...</div>
          </div>
        ) : (
          <div className="nav-section">
            <div className="nav-section__header">
              <span className="nav-section__title">Projects</span>
              <button className="nav-section__action" onClick={onAddProject}>
                + New
              </button>
            </div>

            {projects.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                No projects yet
              </div>
            ) : (
              projects.map(project => {
                const isExpanded = expandedProjects.has(project.id);
                const isSelected = selectedProjectId === project.id;
                const taskCount = project.tasks?.length || 0;
                const isDragging = draggedProjectId === project.id;
                const isDragOver = dragOverProjectId === project.id;
                
                return (
                  <div 
                    key={project.id} 
                    className={`project-item ${isExpanded ? 'project-item--expanded' : ''} ${isSelected && !selectedTaskId ? 'project-item--selected' : ''} ${isDragging ? 'project-item--dragging' : ''} ${isDragOver ? 'project-item--drag-over' : ''}`}
                    draggable={!!onReorderProjects}
                    onDragStart={(e) => handleProjectDragStart(e, project.id)}
                    onDragEnd={handleProjectDragEnd}
                    onDragOver={(e) => handleProjectDragOver(e, project.id)}
                    onDragLeave={handleProjectDragLeave}
                    onDrop={(e) => handleProjectDrop(e, project.id)}
                  >
                    <div 
                      className="project-item__header"
                      onClick={() => {
                        onToggleProject(project.id);
                        onSelectProject(project.id);
                      }}
                    >
                      {onReorderProjects && (
                        <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
                      )}
                      <span className="project-item__expand">
                        {taskCount > 0 ? '›' : ''}
                      </span>
                      <div className="project-item__info">
                        <div className="project-item__name">{project.name}</div>
                        <div className="project-item__meta">
                          <span className={getStatusBadgeClass(project.status)}>
                            {getStatusLabel(project.status)}
                          </span>
                          <span className="project-item__count">{taskCount} tasks</span>
                        </div>
                      </div>
                    </div>

                    {/* Tasks */}
                    {isExpanded && project.tasks && project.tasks.length > 0 && (
                      <div className="task-list">
                        {project.tasks.map(task => {
                          const isTaskSelected = selectedTaskId === task.id;
                          const isActive = timerTask?.id === task.id && timerStatus !== 'idle';
                          const isTaskDragging = draggedTaskId === task.id;
                          const isTaskDragOver = dragOverTaskId === task.id;
                          
                          return (
                            <div
                              key={task.id}
                              className={`task-item ${isTaskSelected ? 'task-item--selected' : ''} ${isActive ? 'task-item--active' : ''} ${isTaskDragging ? 'task-item--dragging' : ''} ${isTaskDragOver ? 'task-item--drag-over' : ''}`}
                              onClick={() => onSelectTask(project.id, task.id)}
                              draggable={!!onReorderTasks}
                              onDragStart={(e) => handleTaskDragStart(e, task.id, project.id)}
                              onDragEnd={handleTaskDragEnd}
                              onDragOver={(e) => handleTaskDragOver(e, task.id, project.id)}
                              onDragLeave={handleTaskDragLeave}
                              onDrop={(e) => handleTaskDrop(e, task.id, project.id)}
                            >
                              {onReorderTasks && (
                                <span className="drag-handle drag-handle--small" title="Drag to reorder">⋮⋮</span>
                              )}
                              <span className="task-item__indicator" />
                              <span className="task-item__name">{task.name}</span>
                              <span className={getStatusBadgeClass(task.status)} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                {getStatusLabel(task.status)}
                              </span>
                            </div>
                          );
                        })}
                        <button 
                          className="add-item-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddTask(project.id);
                          }}
                          style={{ marginLeft: '0' }}
                        >
                          + Add Task
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
