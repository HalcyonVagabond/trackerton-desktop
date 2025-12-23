import type { ProjectWithTasks } from '../../types/taskManager';
import type { Task } from '../../types/electron';
import { StatusBadge } from './StatusBadge';

interface ProjectsSidebarProps {
  organizationSelected: boolean;
  loadingProjects: boolean;
  projects: ProjectWithTasks[];
  expandedProjects: Set<number>;
  selectedProjectId: number | null;
  selectedTaskId: number | null;
  onToggleProject: (projectId: number) => void;
  onSelectTask: (projectId: number, taskId: number) => void;
  timerTask: Task | null;
  timerStatus: 'idle' | 'running' | 'paused';
  timerDisplay: string;
  // CRUD callbacks
  onAddProject: () => void;
  onEditProject: (project: ProjectWithTasks) => void;
  onDeleteProject: (project: ProjectWithTasks) => void;
  onAddTask: (projectId: number) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function ProjectsSidebar({
  organizationSelected,
  loadingProjects,
  projects,
  expandedProjects,
  selectedProjectId,
  selectedTaskId,
  onToggleProject,
  onSelectTask,
  timerTask,
  timerStatus,
  timerDisplay,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: ProjectsSidebarProps) {
  if (!organizationSelected) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📁</div>
        <div className="empty-state__title">No Organization Selected</div>
        <div className="empty-state__text">Select an organization to view projects</div>
      </div>
    );
  }

  if (loadingProjects) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">⏳</div>
        <div className="empty-state__text">Loading…</div>
      </div>
    );
  }

  return (
    <>
      {/* Add Project Button */}
      <button
        className="sidebar-add-btn"
        onClick={onAddProject}
        title="Add new project"
      >
        <span className="sidebar-add-btn__icon">+</span>
        <span>Add Project</span>
      </button>

      {!projects.length ? (
        <div className="empty-state" style={{ padding: '20px' }}>
          <div className="empty-state__icon">📁</div>
          <div className="empty-state__title">No Projects</div>
          <div className="empty-state__text">Add a project to get started</div>
        </div>
      ) : (
        projects.map((project) => {
          const isExpanded = expandedProjects.has(project.id);
          const isSelected = selectedProjectId === project.id;
          return (
            <div className={`project-item ${isSelected ? 'project-item--selected' : ''}`} key={project.id}>
              <div
                className={`project-header ${isExpanded ? 'expanded' : ''}`}
                data-project-id={project.id}
              >
                <div 
                  className="project-header__content"
                  onClick={() => onToggleProject(project.id)}
                >
                  <div className="project-header__name">{project.name}</div>
                  <div className="project-header__meta">
                    <StatusBadge type="project" status={project.status} size="small" />
                    <span>{project.tasks.length} task{project.tasks.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <div className="project-header__actions">
                  <button
                    className="sidebar-action-btn sidebar-action-btn--edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProject(project);
                    }}
                    title="Edit project"
                  >
                    ✎
                  </button>
                  <button
                    className="sidebar-action-btn sidebar-action-btn--delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project);
                    }}
                    title="Delete project"
                  >
                    ✕
                  </button>
                  <div 
                    className="project-header__icon"
                    onClick={() => onToggleProject(project.id)}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </div>
              <div className={`project-tasks-list ${isExpanded ? 'expanded' : ''}`}>
                {/* Add Task Button */}
                <button
                  className="sidebar-add-task-btn"
                  onClick={() => onAddTask(project.id)}
                  title="Add new task"
                >
                  <span>+ Add Task</span>
                </button>
                
                {project.tasks.length ? (
                  project.tasks.map((task) => {
                    const isTaskSelected = selectedTaskId === task.id;
                    const isTimerTask = timerTask?.id === task.id;
                    const classNames = [
                      'task-item-sidebar',
                      isTaskSelected ? 'active' : '',
                      isTimerTask ? 'timer-linked' : '',
                      isTimerTask && timerStatus === 'running' ? 'timer-linked--running' : '',
                      isTimerTask && timerStatus === 'paused' ? 'timer-linked--paused' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div
                        key={task.id}
                        className={classNames}
                        data-task-id={task.id}
                      >
                        <div 
                          className="task-item-sidebar__content"
                          onClick={() => onSelectTask(project.id, task.id)}
                        >
                          <div className="task-item-sidebar__title">
                            {task.name}
                            <StatusBadge type="task" status={task.status} size="small" />
                          </div>
                          {isTimerTask && (
                            <div
                              className={`task-item-sidebar__timer ${
                                timerStatus === 'running'
                                  ? 'task-item-sidebar__timer--active'
                                  : 'task-item-sidebar__timer--paused'
                              }`}
                            >
                              {timerStatus === 'running' ? `Tracking ${timerDisplay}` : `Timer paused · ${timerDisplay}`}
                            </div>
                          )}
                        </div>
                        <div className="task-item-sidebar__actions">
                          <button
                            className="sidebar-action-btn sidebar-action-btn--edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                            title="Edit task"
                          >
                            ✎
                          </button>
                          <button
                            className="sidebar-action-btn sidebar-action-btn--delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task);
                            }}
                            title="Delete task"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-state__text" style={{ padding: '8px 16px', fontSize: '12px' }}>
                    No tasks yet
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
