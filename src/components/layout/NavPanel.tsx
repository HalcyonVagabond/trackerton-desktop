import { useState, useMemo, useRef, useEffect } from 'react';
import type { ProjectWithTasks } from '../../types/taskManager';
import type { ProjectStatus, TaskStatus, Task } from '../../types/electron';
import { formatDuration } from '../../utils/taskManager';

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
  onSelectOrg: (id: number) => void;
  onAddOrg: () => void;
  onEditOrg: () => void;
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
  
  // Timer state
  timerTask: Task | null;
  timerStatus: 'idle' | 'running' | 'paused';
  
  // Theme
  themeMode: 'light' | 'dark' | 'system';
  onThemeChange: (mode: 'light' | 'dark' | 'system') => void;
  
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
  onSelectOrg,
  onAddOrg,
  onEditOrg,
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
  timerTask,
  timerStatus,
  themeMode,
  onThemeChange,
  loading,
}: NavPanelProps) {
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  
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
        <img src="/logo-icon-light.png" alt="Trackerton" className="nav-brand__logo" />
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
                <button 
                  className="dropdown-menu__item dropdown-menu__item--danger"
                  onClick={() => {
                    setOrgMenuOpen(false);
                    onDeleteOrg();
                  }}
                >
                  <span className="dropdown-menu__icon">🗑</span>
                  Delete Organization
                </button>
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
                
                return (
                  <div 
                    key={project.id} 
                    className={`project-item ${isExpanded ? 'project-item--expanded' : ''} ${isSelected && !selectedTaskId ? 'project-item--selected' : ''}`}
                  >
                    <div 
                      className="project-item__header"
                      onClick={() => {
                        onToggleProject(project.id);
                        onSelectProject(project.id);
                      }}
                    >
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
                          
                          return (
                            <div
                              key={task.id}
                              className={`task-item ${isTaskSelected ? 'task-item--selected' : ''} ${isActive ? 'task-item--active' : ''}`}
                              onClick={() => onSelectTask(project.id, task.id)}
                            >
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
