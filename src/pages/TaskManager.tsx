import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import type { Organization, Task, TimeEntry, ProjectStatus, TaskStatus } from '../types/electron';
import type { ProjectWithTasks, TaskDetail, TimeEntryModalState } from '../types/taskManager';
import { parseNumber } from '../utils/taskManager';
import { TimeEntryModal } from '../components/taskManager/TimeEntryModal';
import { ProjectsSidebar } from '../components/taskManager/ProjectsSidebar';
import { TaskDetailPanel } from '../components/taskManager/TaskDetailPanel';
import { CurrentTaskBanner } from '../components/taskManager/CurrentTaskBanner';
import { LoadingOverlay } from '../components/taskManager/LoadingOverlay';
import { useAppState } from '../context/AppStateContext';
import { GenericModal } from '../components/GenericModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import '../organizationView-styles.css';

// Modal state types for CRUD operations
interface CrudModalState {
  isOpen: boolean;
  mode: 'add' | 'edit';
  type: 'organization' | 'project' | 'task';
  id: number | null;
  parentId: number | null; // For tasks, this is the project ID; for projects, this is the org ID
  initialName: string;
}

interface DeleteModalState {
  isOpen: boolean;
  type: 'organization' | 'project' | 'task';
  id: number;
  name: string;
}

export function TaskManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const {
    timer,
    browsingOrganizationId,
    browsingProjectId,
    browsingTaskId,
    setBrowsingSelection,
    startTaskFromBrowser,
    hydrated,
  } = useAppState();
  const { status: timerStatus, display: timerDisplay, task: timerTask, start, stop, elapsedTime: timerElapsedTime, getRealTimeTotal } = timer;

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(() => new Set());
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);
  const [modalState, setModalState] = useState<TimeEntryModalState>({ isOpen: false, entry: null });
  const [timerActionPending, setTimerActionPending] = useState(false);
  
  // CRUD modal states
  const [crudModal, setCrudModal] = useState<CrudModalState>({
    isOpen: false,
    mode: 'add',
    type: 'project',
    id: null,
    parentId: null,
    initialName: '',
  });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
  
  const isMounted = useRef(true);
  const projectsRef = useRef<ProjectWithTasks[]>([]);
  const previousTimerStatus = useRef<'idle' | 'running' | 'paused'>('idle');
  const lastLoadedOrganizationId = useRef<number | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const loadingLogo = useMemo(
    () => (theme === 'dark' ? '/logo-icon.png' : '/logo-icon-light.png'),
    [theme],
  );

  const timerContext = useMemo(() => {
    if (!timerTask) {
      return { projectName: undefined, organizationName: undefined };
    }

    const project = projects.find((proj) => proj.id === timerTask.project_id);
    const organizationId = timerTask.organization_id ?? project?.organization_id ?? null;
    const organization = organizationId ? organizations.find((org) => org.id === organizationId) : undefined;

    return {
      projectName: project?.name,
      organizationName: organization?.name,
    };
  }, [timerTask, projects, organizations]);

  const loadTaskDetails = useCallback(
    async (projectId: number, taskId: number, projectOverride?: ProjectWithTasks | null) => {
      setLoadingTask(true);
      try {
        const [tasks, timeEntries, totalDuration] = await Promise.all([
          window.electronAPI.getTasks(projectId, undefined),
          window.electronAPI.getTimeEntries({ taskId }),
          window.electronAPI.getTotalDurationByTask(taskId),
        ]);

        const activeTask = tasks.find((task) => task.id === taskId);
        if (!activeTask) {
          setTaskDetail(null);
          return;
        }

        const project = projectOverride ?? projectsRef.current.find((proj) => proj.id === projectId);

        const orderedEntries = [...(timeEntries || [])].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        const detail: TaskDetail = {
          ...activeTask,
          projectId,
          projectName: project?.name ?? '',
          projectDescription: project?.description ?? '',
          totalDuration: totalDuration || 0,
          timeEntries: orderedEntries.reverse(), // latest first
          latestTimestamp: orderedEntries.length ? orderedEntries[0].timestamp : null,
          firstTimestamp: orderedEntries.length ? orderedEntries[orderedEntries.length - 1].timestamp : null,
        };
        setTaskDetail(detail);
      } catch (error) {
        console.error('Failed to load task details', error);
        setTaskDetail(null);
      } finally {
        if (isMounted.current) {
          setLoadingTask(false);
        }
      }
    },
    [projectsRef],
  );

  const loadProjectsForOrganization = useCallback(
    async (organizationId: number, options?: { projectId?: number | null; taskId?: number | null }) => {
      setLoadingProjects(true);
      try {
        const rawProjects = await window.electronAPI.getProjects(organizationId, undefined);
        const projectsWithTasks = await Promise.all(
          rawProjects.map(async (project) => ({
            ...project,
            tasks: await window.electronAPI.getTasks(project.id, undefined),
          })),
        );

        if (!isMounted.current) {
          return;
        }

        setProjects(projectsWithTasks);

  const requestedProjectId = options?.projectId ?? null;
  const requestedTaskId = options?.taskId ?? null;

        if (requestedProjectId && projectsWithTasks.some((proj) => proj.id === requestedProjectId)) {
          const projectForSelection = projectsWithTasks.find((proj) => proj.id === requestedProjectId) ?? null;
          setExpandedProjects((prev) => {
            const next = new Set(prev);
            next.add(requestedProjectId);
            return next;
          });

          const taskExists = requestedTaskId && projectForSelection?.tasks.some((task) => task.id === requestedTaskId);
          const resolvedTaskId = taskExists ? requestedTaskId : null;

          setBrowsingSelection(organizationId, requestedProjectId, resolvedTaskId);

          if (resolvedTaskId) {
            await loadTaskDetails(requestedProjectId, resolvedTaskId, projectForSelection);
          } else {
            setTaskDetail(null);
          }
        } else {
          setExpandedProjects(new Set());
          setBrowsingSelection(organizationId, null, null);
          setTaskDetail(null);
        }
      } catch (error) {
        console.error('Failed to load projects', error);
        if (isMounted.current) {
          setProjects([]);
          setExpandedProjects(new Set());
          setBrowsingSelection(organizationId, null, null);
          setTaskDetail(null);
        }
      } finally {
        if (isMounted.current) {
          setLoadingProjects(false);
        }
      }
    },
    [loadTaskDetails, setBrowsingSelection],
  );

  useEffect(() => {
    (async () => {
      try {
        const orgs = await window.electronAPI.getOrganizations();
        if (!isMounted.current) return;
        setOrganizations(orgs);
      } catch (error) {
        console.error('Failed to load organizations', error);
        setOrganizations([]);
      } finally {
        if (isMounted.current) {
          setTimeout(() => setIsOverlayVisible(false), 400);
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated || !organizations.length) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const orgIdFromParams = parseNumber(params.get('organizationId'));
    const projectIdFromParams = parseNumber(params.get('projectId'));
    const taskIdFromParams = parseNumber(params.get('taskId'));

    const organizationExists = (id: number | null) => Boolean(id && organizations.some((org) => org.id === id));

    const shouldUseParams = organizationExists(orgIdFromParams);

    if (shouldUseParams && orgIdFromParams) {
      const projectId = projectIdFromParams ?? null;
      const taskId = taskIdFromParams ?? null;
      setBrowsingSelection(orgIdFromParams, projectId, taskId);
      lastLoadedOrganizationId.current = orgIdFromParams;
      void loadProjectsForOrganization(orgIdFromParams, { projectId, taskId });
      return;
    }

    if (organizationExists(browsingOrganizationId)) {
      const orgId = browsingOrganizationId;
      if (!orgId) {
        return;
      }

      if (lastLoadedOrganizationId.current !== orgId) {
        lastLoadedOrganizationId.current = orgId;
        void loadProjectsForOrganization(orgId, {
          projectId: browsingProjectId ?? null,
          taskId: browsingTaskId ?? null,
        });
      }
      return;
    }

    if (!shouldUseParams && browsingOrganizationId) {
      lastLoadedOrganizationId.current = null;
      setBrowsingSelection(null, null, null);
      setProjects([]);
      setTaskDetail(null);
      setExpandedProjects(new Set());
      return;
    }

    if (lastLoadedOrganizationId.current !== null) {
      lastLoadedOrganizationId.current = null;
      setBrowsingSelection(null, null, null);
      setProjects([]);
      setTaskDetail(null);
      setExpandedProjects(new Set());
    }
  }, [
    hydrated,
    organizations,
    location.search,
    browsingOrganizationId,
    browsingProjectId,
    browsingTaskId,
    loadProjectsForOrganization,
    setBrowsingSelection,
  ]);

  // Removed: We no longer sync browsing state with timer task automatically
  // The user must explicitly start a task from the browser

  useEffect(() => {
    if (!timerTask) {
      previousTimerStatus.current = timerStatus;
      return;
    }

    if (
      previousTimerStatus.current === 'running' &&
      timerStatus !== 'running' &&
      timerTask.project_id &&
      timerTask.id === browsingTaskId
    ) {
      void loadTaskDetails(timerTask.project_id, timerTask.id);
    }

    previousTimerStatus.current = timerStatus;
  }, [timerStatus, timerTask, loadTaskDetails, browsingTaskId]);

  const handleOrganizationChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const orgId = event.target.value ? Number(event.target.value) : null;
    setBrowsingSelection(orgId, null, null);
    setTaskDetail(null);
    setProjects([]);
    setExpandedProjects(new Set());
    lastLoadedOrganizationId.current = orgId;
    if (orgId) {
      await loadProjectsForOrganization(orgId);
    }
  };

  const toggleProject = (projectId: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleProjectNameBlur = async (projectId: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    try {
      const project = projects.find((p) => p.id === projectId);
      if (!project || project.name === trimmed) return;
      await window.electronAPI.updateProject(projectId, { name: trimmed });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, name: trimmed } : p)),
      );
      setTaskDetail((prev) => (prev && prev.projectId === projectId ? { ...prev, projectName: trimmed } : prev));
    } catch (error) {
      console.error('Failed to update project name', error);
      alert('Failed to update project name');
    }
  };

  const handleProjectDescriptionBlur = async (projectId: number, value: string) => {
    try {
      const project = projects.find((p) => p.id === projectId);
      if (!project || (project.description || '') === value) return;
      await window.electronAPI.updateProject(projectId, { description: value });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, description: value } : p)),
      );
      setTaskDetail((prev) => (prev && prev.projectId === projectId ? { ...prev, projectDescription: value } : prev));
    } catch (error) {
      console.error('Failed to update project description', error);
      alert('Failed to update project description');
    }
  };

  const handleTaskNameBlur = async (taskId: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
      const projectId = browsingProjectId;
      if (!projectId) return;
      const project = projects.find((p) => p.id === projectId);
      const task = project?.tasks.find((t) => t.id === taskId);
      if (!task || task.name === trimmed) return;
      await window.electronAPI.updateTask(taskId, { name: trimmed });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, name: trimmed } : t)) }
            : p,
        ),
      );
      setTaskDetail((prev) => (prev && prev.id === taskId ? { ...prev, name: trimmed } : prev));
    } catch (error) {
      console.error('Failed to update task name', error);
      alert('Failed to update task name');
    }
  };

  const handleProjectStatusChange = async (projectId: number, status: ProjectStatus) => {
    try {
      await window.electronAPI.updateProject(projectId, { status });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status } : p)),
      );
    } catch (error) {
      console.error('Failed to update project status', error);
      alert('Failed to update project status');
    }
  };

  const handleTaskStatusChange = async (taskId: number, status: TaskStatus) => {
    try {
      await window.electronAPI.updateTask(taskId, { status });
      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
        })),
      );
      setTaskDetail((prev) => (prev && prev.id === taskId ? { ...prev, status } : prev));
    } catch (error) {
      console.error('Failed to update task status', error);
      alert('Failed to update task status');
    }
  };

  const handleTaskSelection = async (projectId: number, taskId: number) => {
    if (!browsingOrganizationId) {
      return;
    }

    setBrowsingSelection(browsingOrganizationId, projectId, taskId);
    await loadTaskDetails(projectId, taskId);
  };

  const openTimeEntryModal = (entry: TimeEntry) => {
    setModalState({ isOpen: true, entry });
  };

  const closeTimeEntryModal = () => {
    setModalState({ isOpen: false, entry: null });
  };

  const handleTimeEntrySave = async ({ duration, timestamp }: { duration: number; timestamp: string }) => {
    if (!modalState.entry) return;
    await window.electronAPI.updateTimeEntry(modalState.entry.id, duration, timestamp);
    if (browsingProjectId && browsingTaskId) {
      await loadTaskDetails(browsingProjectId, browsingTaskId);
    }
  };

  const handleDeleteTimeEntry = async (entryId: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this time entry?');
    if (!confirmed) return;
    try {
      await window.electronAPI.deleteTimeEntry(entryId);
      if (browsingProjectId && browsingTaskId) {
        await loadTaskDetails(browsingProjectId, browsingTaskId);
      }
    } catch (error) {
      console.error('Failed to delete time entry', error);
      alert('Failed to delete time entry');
    }
  };

  const handleStopTimer = useCallback(async () => {
    if (timerActionPending || timerStatus === 'idle') {
      return;
    }

    setTimerActionPending(true);
    const activeTask = timerTask;

    try {
      const saved = await stop();

      if (saved && activeTask?.project_id && activeTask.id) {
        // Refresh details so the new entry appears instantly for the active task
        if (activeTask.project_id === browsingProjectId && activeTask.id === browsingTaskId) {
          await loadTaskDetails(activeTask.project_id, activeTask.id);
        }
      }
    } catch (error) {
      console.error('Failed to stop timer', error);
    } finally {
      setTimerActionPending(false);
    }
  }, [timerActionPending, timerStatus, timerTask, stop, browsingProjectId, browsingTaskId, loadTaskDetails]);

  const handleStartTimer = useCallback(
    async (taskOverride?: Task | null) => {
      if (timerActionPending) {
        return;
      }

      const targetTask = taskOverride ?? timerTask ?? null;
      if (!targetTask) {
        console.warn('Cannot start timer without a task context');
        return;
      }

      setTimerActionPending(true);
      try {
        // If starting a different task than the one currently running/paused, use startTaskFromBrowser
        // which will stop the current task and start the new one
        const isDifferentTask = timerTask && timerTask.id !== targetTask.id;
        if (isDifferentTask || (timerStatus !== 'idle' && timerTask?.id !== targetTask.id)) {
          // Get the organization and project IDs for the task
          const orgId = targetTask.organization_id ?? browsingOrganizationId;
          const projId = targetTask.project_id ?? browsingProjectId;
          if (orgId && projId) {
            await startTaskFromBrowser(orgId, projId, targetTask.id, targetTask);
          } else {
            console.warn('Cannot start task: missing organization or project ID');
          }
        } else {
          // Resume the current task
          start(targetTask);
        }
      } catch (error) {
        console.error('Failed to start timer', error);
      } finally {
        setTimerActionPending(false);
      }
    },
    [timerActionPending, start, timerTask, timerStatus, startTaskFromBrowser, browsingOrganizationId, browsingProjectId],
  );

  // CRUD handlers for organizations
  const handleAddOrganization = useCallback(() => {
    setCrudModal({
      isOpen: true,
      mode: 'add',
      type: 'organization',
      id: null,
      parentId: null,
      initialName: '',
    });
  }, []);

  const handleEditOrganization = useCallback(() => {
    if (!browsingOrganizationId) {
      alert('Please select an organization first');
      return;
    }
    const org = organizations.find((o) => o.id === browsingOrganizationId);
    if (!org) return;
    
    setCrudModal({
      isOpen: true,
      mode: 'edit',
      type: 'organization',
      id: browsingOrganizationId,
      parentId: null,
      initialName: org.name,
    });
  }, [browsingOrganizationId, organizations]);

  const handleDeleteOrganization = useCallback(() => {
    if (!browsingOrganizationId) {
      alert('Please select an organization first');
      return;
    }
    const org = organizations.find((o) => o.id === browsingOrganizationId);
    if (!org) return;
    
    setDeleteModal({
      isOpen: true,
      type: 'organization',
      id: browsingOrganizationId,
      name: org.name,
    });
  }, [browsingOrganizationId, organizations]);

  // CRUD handlers for projects
  const handleAddProject = useCallback(() => {
    if (!browsingOrganizationId) {
      alert('Please select an organization first');
      return;
    }
    setCrudModal({
      isOpen: true,
      mode: 'add',
      type: 'project',
      id: null,
      parentId: browsingOrganizationId,
      initialName: '',
    });
  }, [browsingOrganizationId]);

  const handleEditProject = useCallback((project: ProjectWithTasks) => {
    setCrudModal({
      isOpen: true,
      mode: 'edit',
      type: 'project',
      id: project.id,
      parentId: project.organization_id,
      initialName: project.name,
    });
  }, []);

  const handleDeleteProject = useCallback((project: ProjectWithTasks) => {
    setDeleteModal({
      isOpen: true,
      type: 'project',
      id: project.id,
      name: project.name,
    });
  }, []);

  // CRUD handlers for tasks
  const handleAddTask = useCallback((projectId: number) => {
    setCrudModal({
      isOpen: true,
      mode: 'add',
      type: 'task',
      id: null,
      parentId: projectId,
      initialName: '',
    });
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setCrudModal({
      isOpen: true,
      mode: 'edit',
      type: 'task',
      id: task.id,
      parentId: task.project_id,
      initialName: task.name,
    });
  }, []);

  const handleDeleteTask = useCallback((task: Task) => {
    setDeleteModal({
      isOpen: true,
      type: 'task',
      id: task.id,
      name: task.name,
    });
  }, []);

  // Close CRUD modal
  const closeCrudModal = useCallback(() => {
    setCrudModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Handle CRUD modal save
  const handleCrudModalSave = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('Name cannot be empty');
      return;
    }

    try {
      if (crudModal.type === 'organization') {
        if (crudModal.mode === 'add') {
          // Add new organization
          const newOrg = await window.electronAPI.addOrganization(trimmed);
          setOrganizations((prev) => [...prev, newOrg]);
          // Auto-select the new organization in browsing state
          setBrowsingSelection(newOrg.id, null, null);
          lastLoadedOrganizationId.current = newOrg.id;
          setProjects([]);
          setTaskDetail(null);
          setExpandedProjects(new Set());
        } else if (crudModal.mode === 'edit' && crudModal.id) {
          // Edit existing organization
          await window.electronAPI.updateOrganization(crudModal.id, { name: trimmed });
          setOrganizations((prev) =>
            prev.map((o) => (o.id === crudModal.id ? { ...o, name: trimmed } : o)),
          );
        }
      } else if (crudModal.type === 'project') {
        if (crudModal.mode === 'add' && crudModal.parentId) {
          // Add new project
          const newProject = await window.electronAPI.addProject(trimmed, crudModal.parentId);
          setProjects((prev) => [...prev, { ...newProject, tasks: [] }]);
          setExpandedProjects((prev) => {
            const next = new Set(prev);
            next.add(newProject.id);
            return next;
          });
        } else if (crudModal.mode === 'edit' && crudModal.id) {
          // Edit existing project
          const project = projects.find((p) => p.id === crudModal.id);
          if (project) {
            await window.electronAPI.updateProject(crudModal.id, { name: trimmed });
            setProjects((prev) =>
              prev.map((p) => (p.id === crudModal.id ? { ...p, name: trimmed } : p)),
            );
            setTaskDetail((prev) =>
              prev && prev.projectId === crudModal.id ? { ...prev, projectName: trimmed } : prev,
            );
          }
        }
      } else if (crudModal.type === 'task') {
        if (crudModal.mode === 'add' && crudModal.parentId && browsingOrganizationId) {
          // Add new task
          const newTask = await window.electronAPI.addTask(trimmed, crudModal.parentId);
          setProjects((prev) =>
            prev.map((p) =>
              p.id === crudModal.parentId ? { ...p, tasks: [...p.tasks, newTask] } : p,
            ),
          );
          // Expand the project to show the new task
          setExpandedProjects((prev) => {
            const next = new Set(prev);
            next.add(crudModal.parentId!);
            return next;
          });
        } else if (crudModal.mode === 'edit' && crudModal.id) {
          // Edit existing task
          await window.electronAPI.updateTask(crudModal.id, { name: trimmed });
          setProjects((prev) =>
            prev.map((p) => ({
              ...p,
              tasks: p.tasks.map((t) => (t.id === crudModal.id ? { ...t, name: trimmed } : t)),
            })),
          );
          setTaskDetail((prev) =>
            prev && prev.id === crudModal.id ? { ...prev, name: trimmed } : prev,
          );
        }
      }

      closeCrudModal();
    } catch (error) {
      console.error(`Failed to ${crudModal.mode} ${crudModal.type}`, error);
      alert(`Failed to ${crudModal.mode} ${crudModal.type}`);
    }
  }, [crudModal, projects, browsingOrganizationId, closeCrudModal, setBrowsingSelection]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal) return;

    try {
      if (deleteModal.type === 'organization') {
        await window.electronAPI.deleteOrganization(deleteModal.id);
        setOrganizations((prev) => prev.filter((o) => o.id !== deleteModal.id));
        // Clear selection if deleted org was selected
        if (browsingOrganizationId === deleteModal.id) {
          setBrowsingSelection(null, null, null);
          setProjects([]);
          setTaskDetail(null);
          setExpandedProjects(new Set());
          lastLoadedOrganizationId.current = null;
        }
        // Stop timer if a task in this org was being tracked
        if (timerTask?.organization_id === deleteModal.id) {
          await stop();
        }
      } else if (deleteModal.type === 'project') {
        await window.electronAPI.deleteProject(deleteModal.id);
        setProjects((prev) => prev.filter((p) => p.id !== deleteModal.id));
        // Clear selection if deleted project was selected
        if (browsingProjectId === deleteModal.id) {
          setBrowsingSelection(browsingOrganizationId, null, null);
          setTaskDetail(null);
        }
        // Stop timer if a task in this project was being tracked
        if (timerTask?.project_id === deleteModal.id) {
          await stop();
        }
      } else if (deleteModal.type === 'task') {
        await window.electronAPI.deleteTask(deleteModal.id);
        setProjects((prev) =>
          prev.map((p) => ({
            ...p,
            tasks: p.tasks.filter((t) => t.id !== deleteModal.id),
          })),
        );
        // Clear selection if deleted task was selected
        if (browsingTaskId === deleteModal.id) {
          setBrowsingSelection(browsingOrganizationId, browsingProjectId, null);
          setTaskDetail(null);
        }
        // Stop timer if deleted task was being tracked
        if (timerTask?.id === deleteModal.id) {
          await stop();
        }
      }

      setDeleteModal(null);
    } catch (error) {
      console.error(`Failed to delete ${deleteModal.type}`, error);
      alert(`Failed to delete ${deleteModal.type}`);
    }
  }, [deleteModal, browsingOrganizationId, browsingProjectId, browsingTaskId, setBrowsingSelection, timerTask, stop]);

  // Close delete modal
  const closeDeleteModal = useCallback(() => {
    setDeleteModal(null);
  }, []);

  return (
    <div className="organization-view">
      <LoadingOverlay visible={isOverlayVisible} logoSrc={loadingLogo} />

      <header className="app-header">
        <div className="app-title">
          <img
            src={theme === 'dark' ? '/logo-icon.png' : '/logo-icon-light.png'}
            alt="Trackerton"
            className="app-title__icon"
          />
          <span className="app-title__text">Trackerton</span>
        </div>
        <div className="header-right">
          <select className="org-select" value={browsingOrganizationId?.toString() ?? ''} onChange={handleOrganizationChange}>
            <option value="">Select organization…</option>
            {organizations.map((org) => (
              <option value={org.id.toString()} key={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <div className="org-actions">
            <button
              className="org-action-btn org-action-btn--add"
              onClick={handleAddOrganization}
              title="Add organization"
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            {browsingOrganizationId && (
              <>
                <button
                  className="org-action-btn org-action-btn--edit"
                  onClick={handleEditOrganization}
                  title="Edit organization"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  className="org-action-btn org-action-btn--delete"
                  onClick={handleDeleteOrganization}
                  title="Delete organization"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {timerTask && timerStatus !== 'idle' ? (
        <CurrentTaskBanner
          taskName={timerTask.name}
          timerDisplay={timerDisplay}
          timerStatus={timerStatus === 'running' ? 'running' : 'paused'}
          projectName={timerContext.projectName}
          organizationName={timerContext.organizationName}
          onStop={() => void handleStopTimer()}
          onResume={() => handleStartTimer(timerTask)}
          actionDisabled={timerActionPending}
        />
      ) : null}

      <div className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Projects</h2>
          </div>
          <div id="projectsList" className="projects-list">
            <ProjectsSidebar
              organizationSelected={Boolean(browsingOrganizationId)}
              loadingProjects={loadingProjects}
              projects={projects}
              expandedProjects={expandedProjects}
              selectedProjectId={browsingProjectId}
              selectedTaskId={browsingTaskId}
              onToggleProject={toggleProject}
              onSelectTask={handleTaskSelection}
              timerTask={timerTask}
              timerStatus={timerStatus}
              timerDisplay={timerDisplay}
              onAddProject={handleAddProject}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        </aside>

        <main className="main-panel">
          <div id="mainContent">
            <TaskDetailPanel
              hasOrganization={Boolean(browsingOrganizationId)}
              hasProject={Boolean(browsingProjectId)}
              hasTask={Boolean(browsingTaskId)}
              loadingTask={loadingTask}
              taskDetail={taskDetail}
              onProjectNameBlur={handleProjectNameBlur}
              onProjectDescriptionBlur={handleProjectDescriptionBlur}
              onProjectStatusChange={handleProjectStatusChange}
              onTaskNameBlur={handleTaskNameBlur}
              onTaskStatusChange={handleTaskStatusChange}
              onOpenTimeEntryModal={openTimeEntryModal}
              onDeleteTimeEntry={(entryId) => void handleDeleteTimeEntry(entryId)}
              timerTask={timerTask}
              timerStatus={timerStatus}
              timerDisplay={timerDisplay}
              timerElapsedTime={timerElapsedTime}
              onStopTimer={() => void handleStopTimer()}
              onStartTimer={(task: Task) => handleStartTimer(task)}
              actionDisabled={timerActionPending}
              getRealTimeTotal={getRealTimeTotal}
              projectStatus={projects.find((p) => p.id === browsingProjectId)?.status}
            />
          </div>
        </main>
      </div>

      <TimeEntryModal state={modalState} onClose={closeTimeEntryModal} onSave={handleTimeEntrySave} />

      {/* CRUD Modal for Projects and Tasks */}
      <GenericModal
        isOpen={crudModal.isOpen}
        type={crudModal.type}
        mode={crudModal.mode}
        initialValue={crudModal.initialName}
        onSave={handleCrudModalSave}
        onClose={closeCrudModal}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          type={deleteModal.type}
          itemName={deleteModal.name}
          onConfirm={handleDeleteConfirm}
          onClose={closeDeleteModal}
        />
      )}
    </div>
  );
}
