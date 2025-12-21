import { useEffect, useRef, useCallback } from 'react';
import { useOrganizations } from '../hooks/useOrganizations';
import { useProjects } from '../hooks/useProjects';
import { useTasks } from '../hooks/useTasks';
import { useTheme } from '../hooks/useTheme';
import { useTaskTimeStats } from '../hooks/useTaskTimeStats';
import type { Task } from '../types/electron';
import { useAppState } from '../context/AppStateContext';
import './MenuBarPopup.css';

export function MenuBarPopup() {
  const lastTaskContext = useRef<{ taskId: number | null; duration: number }>({ taskId: null, duration: 0 });

  const { theme } = useTheme();
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
  const { organizations, loading: orgsLoading } = useOrganizations();
  const { projects, loading: projectsLoading } = useProjects(selectedOrganizationId);
  const { tasks, loading: tasksLoading } = useTasks(selectedProjectId);

  // Add menubar class to body to remove padding
  useEffect(() => {
    document.body.classList.add('menubar-body');
    return () => {
      document.body.classList.remove('menubar-body');
    };
  }, []);

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isActive = isRunning || isPaused;


  const enrichTaskWithContext = useCallback(
    (rawTask: Task | null) => {
      if (!rawTask) return null;
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

  // Sync task context when selection changes
  useEffect(() => {
    if (!hydrated) return;

    if (!selectedOrganizationId) {
      if (selectedProjectId !== null) setProject(null);
      if (selectedTaskId !== null) setTask(null);
      return;
    }

    if (!projectsLoading && selectedProjectId !== null) {
      const projectExists = projects.some((proj) => proj.id === selectedProjectId);
      if (!projectExists) {
        setProject(null);
        if (selectedTaskId !== null) setTask(null);
        return;
      }
    }

    if (!tasksLoading && selectedTaskId !== null) {
      const taskExists = tasks.some((task) => task.id === selectedTaskId);
      if (!taskExists) setTask(null);
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

  // Update task context for timer
  useEffect(() => {
    if (!hydrated) return;

    if (!selectedTaskId) {
      if (lastTaskContext.current.taskId !== null) {
        setTaskContext(null, 0);
        lastTaskContext.current = { taskId: null, duration: 0 };
      }
      return;
    }

    if (isRunning) return;

    const selectedTask = enrichTaskWithContext(tasks.find((t) => t.id === selectedTaskId) ?? null);
    if (!selectedTask) return;

    const duration = totalDuration || 0;
    const last = lastTaskContext.current;
    if (last.taskId === selectedTaskId && last.duration === duration) return;

    setTaskContext(selectedTask, duration);
    lastTaskContext.current = { taskId: selectedTaskId, duration };
  }, [hydrated, selectedTaskId, tasks, totalDuration, isRunning, setTaskContext, enrichTaskWithContext]);

  const finalizeCurrentTask = async () => {
    if (!selectedTaskId) return;
    await stop();
  };

  const handleStopClick = async () => {
    await stop();
    // After stopping, clear the timer context to go back to idle state
    setTaskContext(null, 0);
    if (selectedTaskId) {
      await reloadTimeStats();
      // Re-set task context without elapsed time to show correct total
      const selectedTask = enrichTaskWithContext(tasks.find(t => t.id === selectedTaskId) ?? null);
      if (selectedTask) {
        setTaskContext(selectedTask, 0);
      }
    }
  };

  const handleStart = () => {
    if (!selectedTaskId) return;
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

  const handleOpenMainWindow = () => {
    window.electronAPI?.openMainWindow();
  };

  // Format duration helper
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const canStart = selectedTaskId !== null && !isRunning;

  return (
    <div className="menubar-popup">
      <div className="menubar-popup__header">
        <img src="/logo-icon-light.png" alt="Trackerton" className="menubar-popup__logo" />
        <span className="menubar-popup__title">Trackerton</span>
        {isActive && (
          <div className={`menubar-popup__status ${isRunning ? 'menubar-popup__status--running' : 'menubar-popup__status--paused'}`}>
            <span className="menubar-popup__status-dot" />
            {isRunning ? 'Running' : 'Paused'}
          </div>
        )}
      </div>

      <div className="menubar-popup__content">
        {/* Timer Display */}
        {isActive && (
          <div className="menubar-popup__timer">
            <div className="menubar-popup__timer-display">{display}</div>
            <div className="menubar-popup__timer-task">
              {timerTask?.name || 'No task selected'}
            </div>
          </div>
        )}

        {/* Selectors */}
        <div className="menubar-popup__selectors">
          <div className="menubar-popup__field">
            <label className="menubar-popup__label">Organization</label>
            <select
              className="menubar-popup__select"
              value={selectedOrganizationId ?? ''}
              onChange={handleOrganizationChange}
              disabled={orgsLoading}
            >
              <option value="">Select organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div className="menubar-popup__field">
            <label className="menubar-popup__label">Project</label>
            <select
              className="menubar-popup__select"
              value={selectedProjectId ?? ''}
              onChange={handleProjectChange}
              disabled={!selectedOrganizationId || projectsLoading}
            >
              <option value="">Select project...</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>

          <div className="menubar-popup__field">
            <label className="menubar-popup__label">Task</label>
            <select
              className="menubar-popup__select"
              value={selectedTaskId ?? ''}
              onChange={handleTaskChange}
              disabled={!selectedProjectId || tasksLoading}
            >
              <option value="">Select task...</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>{task.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Task Total Time (when not running) */}
        {selectedTaskId && !isActive && (
          <div className="menubar-popup__total">
            <span className="menubar-popup__total-label">Total time on task</span>
            <span className="menubar-popup__total-value">{formatDuration(totalDuration)}</span>
          </div>
        )}

        {/* Timer Controls */}
        <div className="menubar-popup__controls">
          {!isActive ? (
            <button
              className="menubar-popup__btn menubar-popup__btn--start"
              onClick={handleStart}
              disabled={!canStart}
            >
              <span className="menubar-popup__btn-icon">▶</span>
              Start Timer
            </button>
          ) : isRunning ? (
            <button
              className="menubar-popup__btn menubar-popup__btn--stop"
              onClick={handleStopClick}
            >
              <span className="menubar-popup__btn-icon">■</span>
              Stop
            </button>
          ) : (
            <button
              className="menubar-popup__btn menubar-popup__btn--resume"
              onClick={handleStart}
            >
              <span className="menubar-popup__btn-icon">▶</span>
              Resume
            </button>
          )}
        </div>
      </div>

      <div className="menubar-popup__footer">
        <button className="menubar-popup__link" onClick={handleOpenMainWindow}>
          Open Trackerton
          <span className="menubar-popup__link-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
