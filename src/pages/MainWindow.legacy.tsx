import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganizations } from '../hooks/useOrganizations';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useTheme } from '../hooks/useTheme';
import { useTaskTimeStats } from '../hooks/useTaskTimeStats';
import { useGenericModal } from '../hooks/useGenericModal';
import { useDeleteModal } from '../hooks/useDeleteModal';
import { useCrudActions } from '../hooks/useCrudActions';
import { GenericModal } from '../components/GenericModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { ActionsMenu } from '../components/ActionsMenu';
import type { Task } from '../types/electron';
import { useAppState } from '../context/AppStateContext';

export function MainWindow() {
  const navigate = useNavigate();
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const lastTaskContext = useRef<{ taskId: number | null; duration: number }>({ taskId: null, duration: 0 });

  const { theme, setTheme } = useTheme();
  const {
    selectedOrganizationId,
    selectedProjectId,
    selectedTaskId,
    setSelectedOrganizationId: setOrganization,
    setSelectedProjectId: setProject,
    setSelectedTaskId: setTask,
    timer,
    hydrated,
  } = useAppState();
  const { display, status, start, stop, setTaskContext, task: timerTask } = timer;
  const { totalDuration, reload: reloadTimeStats } = useTaskTimeStats(selectedTaskId);
  const { organizations, loading: orgsLoading, reload: reloadOrgs, addOrganization, updateOrganization, deleteOrganization } = useOrganizations();
  const { projects, loading: projectsLoading, reload: reloadProjects, addProject, updateProject, deleteProject } = useProjects(selectedOrganizationId);
  const { tasks, loading: tasksLoading, reload: reloadTasks, addTask, updateTask, deleteTask } = useTasks(selectedProjectId);

  const genericModal = useGenericModal();
  const deleteModal = useDeleteModal();

  const crudActions = useCrudActions({
    organizations,
    projects,
    tasks,
    selectedOrganizationId,
    selectedProjectId,
    selectedTaskId,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    reloadOrgs,
    reloadProjects,
    reloadTasks,
    setSelectedOrganizationId: setOrganization,
    setSelectedProjectId: setProject,
    setSelectedTaskId: setTask,
  });

  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  const enrichTaskWithContext = useCallback(
    (rawTask: Task | null) => {
      if (!rawTask) {
        return null;
      }
      return {
        ...rawTask,
        organization_id: (rawTask.organization_id ?? selectedOrganizationId) ?? undefined,
      };
    },
    [selectedOrganizationId],
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    // Don't clear selection while data is still loading
    if (projectsLoading || tasksLoading) {
      return;
    }

    if (!selectedOrganizationId) {
      if (selectedProjectId !== null) {
        setProject(null);
      }
      if (selectedTaskId !== null) {
        setTask(null);
      }
      return;
    }

    if (selectedProjectId !== null) {
      const projectExists = projects.some((proj) => proj.id === selectedProjectId);
      if (!projectExists) {
        setProject(null);
        if (selectedTaskId !== null) {
          setTask(null);
        }
        return;
      }
    }

    if (selectedTaskId !== null) {
      const taskExists = tasks.some((task) => task.id === selectedTaskId);
      if (!taskExists) {
        setTask(null);
      }
    }
  }, [
    hydrated,
    selectedOrganizationId,
    selectedProjectId,
    selectedTaskId,
    projects,
    tasks,
    projectsLoading,
    tasksLoading,
    setProject,
    setTask,
  ]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!selectedTaskId) {
      if (lastTaskContext.current.taskId !== null) {
        setTaskContext(null, 0);
        lastTaskContext.current = { taskId: null, duration: 0 };
      }
      return;
    }

    if (isRunning) {
      return;
    }

    const selectedTask = enrichTaskWithContext(tasks.find((t) => t.id === selectedTaskId) ?? null);
    if (!selectedTask) {
      return;
    }

    const duration = totalDuration || 0;
    const last = lastTaskContext.current;
    if (last.taskId === selectedTaskId && last.duration === duration) {
      return;
    }

    setTaskContext(selectedTask, duration);
    lastTaskContext.current = { taskId: selectedTaskId, duration };
  }, [hydrated, selectedTaskId, tasks, totalDuration, isRunning, setTaskContext, enrichTaskWithContext]);

  const finalizeCurrentTask = async () => {
    if (!selectedTaskId) return;
    await stop();
  };

  const handleStopClick = async () => {
    await stop();
    if (selectedTaskId) {
      await reloadTimeStats();
    }
  };

  const handleStart = () => {
    if (!selectedTaskId) {
      alert('Please select a task before starting the timer');
      return;
    }
    const selectedTask = enrichTaskWithContext(tasks.find(t => t.id === selectedTaskId) ?? null);
    if (selectedTask) {
      start(selectedTask);
    }
  };

  const handleOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value ? Number(e.target.value) : null;
    if (orgId === selectedOrganizationId) return;
    void finalizeCurrentTask().then(() => {
      setOrganization(orgId);
    });
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projId = e.target.value ? Number(e.target.value) : null;
    if (projId === selectedProjectId) return;
    void finalizeCurrentTask().then(() => {
      setProject(projId);
    });
  };

  const handleTaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const taskId = e.target.value ? Number(e.target.value) : null;
    if (taskId === selectedTaskId) return;
    void finalizeCurrentTask().then(() => {
      setTask(taskId);
    });
  };

  const handleViewTaskManagement = () => {
    const params = new URLSearchParams();
    if (selectedOrganizationId) {
      params.set('organizationId', String(selectedOrganizationId));
    }
    if (selectedProjectId) {
      params.set('projectId', String(selectedProjectId));
    }
    if (selectedTaskId) {
      params.set('taskId', String(selectedTaskId));
    }

    const search = params.toString();
    navigate({ pathname: '/task-manager', search: search ? `?${search}` : '' });
  };

  // Organization menu actions
  const orgMenuItems = [
    {
      label: 'Add New',
      icon: '+',
      className: 'actions-menu__item--add',
      onClick: () => {
        setShowOrgMenu(false);
        const org = crudActions.getOrganizationById(selectedOrganizationId);
        genericModal.openModal('organization', 'add');
      },
    },
    ...(selectedOrganizationId ? [
      {
        label: 'Edit',
        icon: '✎',
        className: 'actions-menu__item--edit',
        onClick: () => {
          setShowOrgMenu(false);
          const org = crudActions.getOrganizationById(selectedOrganizationId);
          if (org) genericModal.openModal('organization', 'edit', org.name, org.id);
        },
      },
      {
        label: 'Delete',
        icon: '✕',
        className: 'actions-menu__item--delete',
        onClick: () => {
          setShowOrgMenu(false);
          const org = crudActions.getOrganizationById(selectedOrganizationId);
          if (org) deleteModal.openModal('organization', org.name, org.id);
        },
      },
    ] : []),
  ];

  // Project menu actions
  const projectMenuItems = [
    {
      label: 'Add New',
      icon: '+',
      className: 'actions-menu__item--add',
      onClick: () => {
        if (!selectedOrganizationId) {
          alert('Please select an organization first.');
          return;
        }
        setShowProjectMenu(false);
        genericModal.openModal('project', 'add');
      },
    },
    ...(selectedProjectId ? [
      {
        label: 'Edit',
        icon: '✎',
        className: 'actions-menu__item--edit',
        onClick: () => {
          setShowProjectMenu(false);
          const proj = crudActions.getProjectById(selectedProjectId);
          if (proj) genericModal.openModal('project', 'edit', proj.name, proj.id);
        },
      },
      {
        label: 'Delete',
        icon: '✕',
        className: 'actions-menu__item--delete',
        onClick: () => {
          setShowProjectMenu(false);
          const proj = crudActions.getProjectById(selectedProjectId);
          if (proj) deleteModal.openModal('project', proj.name, proj.id);
        },
      },
    ] : []),
  ];

  // Task menu actions
  const taskMenuItems = [
    {
      label: 'Add New',
      icon: '+',
      className: 'actions-menu__item--add',
      onClick: () => {
        if (!selectedProjectId) {
          alert('Please select a project first.');
          return;
        }
        setShowTaskMenu(false);
        genericModal.openModal('task', 'add');
      },
    },
    ...(selectedTaskId ? [
      {
        label: 'Edit',
        icon: '✎',
        className: 'actions-menu__item--edit',
        onClick: () => {
          setShowTaskMenu(false);
          const task = crudActions.getTaskById(selectedTaskId);
          if (task) genericModal.openModal('task', 'edit', task.name, task.id);
        },
      },
      {
        label: 'Delete',
        icon: '✕',
        className: 'actions-menu__item--delete',
        onClick: () => {
          setShowTaskMenu(false);
          const task = crudActions.getTaskById(selectedTaskId);
          if (task) deleteModal.openModal('task', task.name, task.id);
        },
      },
    ] : []),
  ];

  // Generic modal save handler
  const handleGenericModalSave = async (name: string) => {
    if (genericModal.type === 'organization') {
      if (genericModal.mode === 'add') {
        await crudActions.handleAddOrganization(name);
      } else if (genericModal.editingItemId) {
        await crudActions.handleUpdateOrganization(genericModal.editingItemId, name);
      }
    } else if (genericModal.type === 'project') {
      if (genericModal.mode === 'add') {
        await crudActions.handleAddProject(name);
      } else if (genericModal.editingItemId) {
        await crudActions.handleUpdateProject(genericModal.editingItemId, name);
      }
    } else if (genericModal.type === 'task') {
      if (genericModal.mode === 'add') {
        await crudActions.handleAddTask(name);
      } else if (genericModal.editingItemId) {
        await crudActions.handleUpdateTask(genericModal.editingItemId, name);
      }
    }
  };

  // Delete modal confirm handler
  const handleDeleteConfirm = async () => {
    if (!deleteModal.itemId) return;

    if (deleteModal.type === 'organization') {
      await crudActions.handleDeleteOrganization(deleteModal.itemId);
    } else if (deleteModal.type === 'project') {
      await crudActions.handleDeleteProject(deleteModal.itemId);
    } else if (deleteModal.type === 'task') {
      await crudActions.handleDeleteTask(deleteModal.itemId);
    }
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <button 
          className="settings-button" 
          title="Settings"
          onClick={() => setShowSettingsModal(true)}
        >
          ⚙
        </button>
        <h1 className="app-header__title">
          <img src="./logo-icon-light.png" alt="Trackerton Logo" className="app-header__logo" />
          <span>Trackerton</span>
        </h1>
      </div>

      <div className="app-content">
        {/* Organization Section */}
        <div className="section">
          <div className="section__label">Organization</div>
          <div className="input-group">
            <div className="select-wrapper">
              <select 
                id="organization"
                value={selectedOrganizationId || ''}
                onChange={handleOrganizationChange}
                disabled={orgsLoading}
              >
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <button 
              className="btn btn--more"
              title="More Options"
              onClick={() => setShowOrgMenu(!showOrgMenu)}
            >
              ⋯
            </button>
            <div style={{ position: 'relative' }}>
              <ActionsMenu
                isOpen={showOrgMenu}
                onClose={() => setShowOrgMenu(false)}
                items={orgMenuItems}
              />
            </div>
          </div>
        </div>

        {/* Project Section */}
        <div className="section">
          <div className="section__label">Project</div>
          <div className="input-group">
            <div className="select-wrapper">
              <select 
                id="project"
                value={selectedProjectId || ''}
                onChange={handleProjectChange}
                disabled={!selectedOrganizationId || projectsLoading}
              >
                <option value="">Select Project</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
            <button 
              className={`btn btn--more ${!selectedOrganizationId ? 'hidden' : ''}`}
              title="More Options"
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              disabled={!selectedOrganizationId}
            >
              ⋯
            </button>
            <div style={{ position: 'relative' }}>
              <ActionsMenu
                isOpen={showProjectMenu}
                onClose={() => setShowProjectMenu(false)}
                items={projectMenuItems}
              />
            </div>
          </div>
        </div>

        {/* Task Section */}
        <div className="section">
          <div className="section__label">Task</div>
          <div className="input-group">
            <div className="select-wrapper">
              <select 
                id="task"
                value={selectedTaskId || ''}
                onChange={handleTaskChange}
                disabled={!selectedProjectId || tasksLoading}
              >
                <option value="">Select Task</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>
            <button 
              className={`btn btn--more ${!selectedProjectId ? 'hidden' : ''}`}
              title="More Options"
              onClick={() => setShowTaskMenu(!showTaskMenu)}
              disabled={!selectedProjectId}
            >
              ⋯
            </button>
            <div style={{ position: 'relative' }}>
              <ActionsMenu
                isOpen={showTaskMenu}
                onClose={() => setShowTaskMenu(false)}
                items={taskMenuItems}
              />
            </div>
          </div>
        </div>

        {/* Timer Display */}
        <div className="timer-display">
          <div className="timer-display__time">{display}</div>
          <div className="timer-display__label">
            {status === 'running' ? 'Elapsed Time' : 'Total Time on This Task'}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="control-buttons">
          {!isRunning && !isPaused && (
            <button className="btn btn--start" onClick={handleStart}>
              Start
            </button>
          )}
          {isRunning && (
            <button className="btn btn--stop" onClick={handleStopClick}>
              Stop
            </button>
          )}
          {isPaused && (
            <button className="btn btn--resume" onClick={() => start()}>
              Resume
            </button>
          )}
        </div>

        <button className="btn btn--view-work" onClick={handleViewTaskManagement}>
          Task Management
        </button>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Settings</h3>
            <div className="settings-section">
              <label className="settings-label">Theme</label>
              <div className="theme-toggle">
                <button 
                  className={`theme-btn theme-btn--light ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => {
                    if (theme !== 'light') setTheme('light');
                  }}
                >
                  ☀️ Light
                </button>
                <button 
                  className={`theme-btn theme-btn--dark ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => {
                    if (theme !== 'dark') setTheme('dark');
                  }}
                >
                  🌙 Dark
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn--save" onClick={() => setShowSettingsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generic Modal */}
      <GenericModal
        isOpen={genericModal.isOpen}
        onClose={genericModal.closeModal}
        onSave={handleGenericModalSave}
        type={genericModal.type}
        mode={genericModal.mode}
        initialValue={genericModal.initialValue}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.closeModal}
        onConfirm={handleDeleteConfirm}
        type={deleteModal.type}
        itemName={deleteModal.itemName}
      />
    </div>
  );
}
