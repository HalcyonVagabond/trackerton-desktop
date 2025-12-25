import { useState } from 'react';
import type { ProjectWithTasks } from '../../types/taskManager';
import type { Task } from '../../types/electron';
import { StatusBadge } from './StatusBadge';
import { MoreMenu } from './MoreMenu';

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
  // Reorder callbacks
  onReorderProjects?: (projectId: number, newIndex: number) => void;
  onReorderTasks?: (taskId: number, projectId: number, newIndex: number) => void;
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
  onReorderProjects,
  onReorderTasks,
}: ProjectsSidebarProps) {
  // Drag state
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<number | null>(null);
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
    // Only allow drag over tasks in the same project
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
          const isDragging = draggedProjectId === project.id;
          const isDragOver = dragOverProjectId === project.id;
          return (
            <div 
              className={`project-item ${isSelected ? 'project-item--selected' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`} 
              key={project.id}
              draggable
              onDragStart={(e) => handleProjectDragStart(e, project.id)}
              onDragEnd={handleProjectDragEnd}
              onDragOver={(e) => handleProjectDragOver(e, project.id)}
              onDragLeave={handleProjectDragLeave}
              onDrop={(e) => handleProjectDrop(e, project.id)}
            >
              <div
                className={`project-header ${isExpanded ? 'expanded' : ''}`}
                data-project-id={project.id}
              >
                <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
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
                  <MoreMenu
                    items={[
                      {
                        label: 'Edit',
                        icon: '✎',
                        onClick: () => onEditProject(project),
                      },
                      {
                        label: 'Delete',
                        icon: '✕',
                        onClick: () => onDeleteProject(project),
                        variant: 'danger',
                      },
                    ]}
                  />
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
                    const isTaskDragging = draggedTaskId === task.id;
                    const isTaskDragOver = dragOverTaskId === task.id;
                    const classNames = [
                      'task-item-sidebar',
                      isTaskSelected ? 'active' : '',
                      isTimerTask ? 'timer-linked' : '',
                      isTimerTask && timerStatus === 'running' ? 'timer-linked--running' : '',
                      isTimerTask && timerStatus === 'paused' ? 'timer-linked--paused' : '',
                      isTaskDragging ? 'dragging' : '',
                      isTaskDragOver ? 'drag-over' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <div
                        key={task.id}
                        className={classNames}
                        data-task-id={task.id}
                        draggable
                        onDragStart={(e) => handleTaskDragStart(e, task.id, project.id)}
                        onDragEnd={handleTaskDragEnd}
                        onDragOver={(e) => handleTaskDragOver(e, task.id, project.id)}
                        onDragLeave={handleTaskDragLeave}
                        onDrop={(e) => handleTaskDrop(e, task.id, project.id)}
                      >
                        <span className="drag-handle" title="Drag to reorder">⋮⋮</span>
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
                          <MoreMenu
                            items={[
                              {
                                label: 'Edit',
                                icon: '✎',
                                onClick: () => onEditTask(task),
                              },
                              {
                                label: 'Delete',
                                icon: '✕',
                                onClick: () => onDeleteTask(task),
                                variant: 'danger',
                              },
                            ]}
                          />
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
