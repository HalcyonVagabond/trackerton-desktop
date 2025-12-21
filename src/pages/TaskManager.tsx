import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import type { Organization, Task, TimeEntry } from '../types/electron';
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
import organizationViewStylesHref from '../organizationView-styles.css?url';

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
    selectedOrganizationId,
    selectedProjectId,
    selectedTaskId,
    setSelection,
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

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    let link = document.querySelector<HTMLLinkElement>('link[data-trackerton-task-manager-styles="true"]');
    let ownsLink = false;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = organizationViewStylesHref;
      link.dataset.trackertonTaskManagerStyles = 'true';
      document.head.appendChild(link);
      ownsLink = true;
    }

    return () => {
      if (ownsLink && link && document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

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
          window.electronAPI.getTasks(projectId),
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
        const rawProjects = await window.electronAPI.getProjects(organizationId);
        const projectsWithTasks = await Promise.all(
          rawProjects.map(async (project) => ({
            ...project,
            tasks: await window.electronAPI.getTasks(project.id),
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

          setSelection(organizationId, requestedProjectId, resolvedTaskId);

          if (resolvedTaskId) {
            await loadTaskDetails(requestedProjectId, resolvedTaskId, projectForSelection);
          } else {
            setTaskDetail(null);
          }
        } else {
          setExpandedProjects(new Set());
          setSelection(organizationId, null, null);
          setTaskDetail(null);
        }
      } catch (error) {
        console.error('Failed to load projects', error);
        if (isMounted.current) {
          setProjects([]);
          setExpandedProjects(new Set());
          setSelection(organizationId, null, null);
          setTaskDetail(null);
        }
      } finally {
        if (isMounted.current) {
          setLoadingProjects(false);
        }
      }
    },
    [loadTaskDetails, setSelection],
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
      setSelection(orgIdFromParams, projectId, taskId);
      lastLoadedOrganizationId.current = orgIdFromParams;
      void loadProjectsForOrganization(orgIdFromParams, { projectId, taskId });
      return;
    }

    if (organizationExists(selectedOrganizationId)) {
      const orgId = selectedOrganizationId;
      if (!orgId) {
        return;
      }

      if (lastLoadedOrganizationId.current !== orgId) {
        lastLoadedOrganizationId.current = orgId;
        void loadProjectsForOrganization(orgId, {
          projectId: selectedProjectId ?? null,
          taskId: selectedTaskId ?? null,
        });
      }
      return;
    }

    if (!shouldUseParams && selectedOrganizationId) {
      lastLoadedOrganizationId.current = null;
      setSelection(null, null, null);
      setProjects([]);
      setTaskDetail(null);
      setExpandedProjects(new Set());
      return;
    }

    if (lastLoadedOrganizationId.current !== null) {
      lastLoadedOrganizationId.current = null;
      setSelection(null, null, null);
      setProjects([]);
      setTaskDetail(null);
      setExpandedProjects(new Set());
    }
  }, [
    hydrated,
    organizations,
    location.search,
    selectedOrganizationId,
    selectedProjectId,
    selectedTaskId,
    loadProjectsForOrganization,
    setSelection,
  ]);

  useEffect(() => {
    if (!timerTask || timerStatus === 'idle') {
      return;
    }

    const targetOrgId = timerTask.organization_id ?? null;
    const targetProjectId = timerTask.project_id ?? null;
    const targetTaskId = timerTask.id ?? null;
    const effectiveOrgId = targetOrgId ?? selectedOrganizationId ?? null;

    if (targetOrgId && targetOrgId !== selectedOrganizationId) {
      setSelection(targetOrgId, targetProjectId ?? null, targetTaskId ?? null);
      lastLoadedOrganizationId.current = targetOrgId;
      void loadProjectsForOrganization(targetOrgId, {
        projectId: targetProjectId ?? null,
        taskId: targetTaskId ?? null,
      });
      return;
    }

    if (targetProjectId && targetProjectId !== selectedProjectId && effectiveOrgId) {
      setSelection(effectiveOrgId, targetProjectId, targetTaskId ?? null);
      lastLoadedOrganizationId.current = effectiveOrgId;
      void loadProjectsForOrganization(effectiveOrgId, {
        projectId: targetProjectId,
        taskId: targetTaskId ?? null,
      });
      if (targetTaskId) {
        void loadTaskDetails(targetProjectId, targetTaskId);
      }
      return;
    }

    if (targetTaskId && targetTaskId !== selectedTaskId && selectedProjectId && effectiveOrgId) {
      setSelection(effectiveOrgId, selectedProjectId, targetTaskId);
      lastLoadedOrganizationId.current = effectiveOrgId;
      void loadTaskDetails(selectedProjectId, targetTaskId);
    }
  }, [
    timerTask,
    timerStatus,
    selectedOrganizationId,
    selectedProjectId,
    selectedTaskId,
    loadProjectsForOrganization,
    loadTaskDetails,
    setSelection,
  ]);

  useEffect(() => {
    if (!timerTask) {
      previousTimerStatus.current = timerStatus;
      return;
    }

    if (
      previousTimerStatus.current === 'running' &&
      timerStatus !== 'running' &&
      timerTask.project_id &&
      timerTask.id === selectedTaskId
    ) {
      void loadTaskDetails(timerTask.project_id, timerTask.id);
    }

    previousTimerStatus.current = timerStatus;
  }, [timerStatus, timerTask, loadTaskDetails, selectedTaskId]);

  const handleOrganizationChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const orgId = event.target.value ? Number(event.target.value) : null;
    setSelection(orgId, null, null);
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
      await window.electronAPI.updateProject(projectId, trimmed, project.description || '');
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
      await window.electronAPI.updateProject(projectId, project.name, value);
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
      const projectId = selectedProjectId;
      if (!projectId) return;
      const project = projects.find((p) => p.id === projectId);
      const task = project?.tasks.find((t) => t.id === taskId);
      if (!task || task.name === trimmed) return;
      await window.electronAPI.updateTask(taskId, trimmed);
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

  const handleTaskSelection = async (projectId: number, taskId: number) => {
    if (!selectedOrganizationId) {
      return;
    }

    setSelection(selectedOrganizationId, projectId, taskId);
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
    if (selectedProjectId && selectedTaskId) {
      await loadTaskDetails(selectedProjectId, selectedTaskId);
    }
  };

  const handleDeleteTimeEntry = async (entryId: number) => {
    const confirmed = window.confirm('Are you sure you want to delete this time entry?');
    if (!confirmed) return;
    try {
      await window.electronAPI.deleteTimeEntry(entryId);
      if (selectedProjectId && selectedTaskId) {
        await loadTaskDetails(selectedProjectId, selectedTaskId);
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
        if (activeTask.project_id === selectedProjectId && activeTask.id === selectedTaskId) {
          await loadTaskDetails(activeTask.project_id, activeTask.id);
        }
      }
    } catch (error) {
      console.error('Failed to stop timer', error);
    } finally {
      setTimerActionPending(false);
    }
  }, [timerActionPending, timerStatus, timerTask, stop, selectedProjectId, selectedTaskId, loadTaskDetails]);

  const handleStartTimer = useCallback(
    (taskOverride?: Task | null) => {
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
        start(targetTask);
      } catch (error) {
        console.error('Failed to start timer', error);
      } finally {
        setTimerActionPending(false);
      }
    },
    [timerActionPending, start, timerTask],
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
    if (!selectedOrganizationId) {
      alert('Please select an organization first');
      return;
    }
    const org = organizations.find((o) => o.id === selectedOrganizationId);
    if (!org) return;
    
    setCrudModal({
      isOpen: true,
      mode: 'edit',
      type: 'organization',
      id: selectedOrganizationId,
      parentId: null,
      initialName: org.name,
    });
  }, [selectedOrganizationId, organizations]);

  const handleDeleteOrganization = useCallback(() => {
    if (!selectedOrganizationId) {
      alert('Please select an organization first');
      return;
    }
    const org = organizations.find((o) => o.id === selectedOrganizationId);
    if (!org) return;
    
    setDeleteModal({
      isOpen: true,
      type: 'organization',
      id: selectedOrganizationId,
      name: org.name,
    });
  }, [selectedOrganizationId, organizations]);

  // CRUD handlers for projects
  const handleAddProject = useCallback(() => {
    if (!selectedOrganizationId) {
      alert('Please select an organization first');
      return;
    }
    setCrudModal({
      isOpen: true,
      mode: 'add',
      type: 'project',
      id: null,
      parentId: selectedOrganizationId,
      initialName: '',
    });
  }, [selectedOrganizationId]);

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
          // Auto-select the new organization
          setSelection(newOrg.id, null, null);
          lastLoadedOrganizationId.current = newOrg.id;
          setProjects([]);
          setTaskDetail(null);
          setExpandedProjects(new Set());
        } else if (crudModal.mode === 'edit' && crudModal.id) {
          // Edit existing organization
          await window.electronAPI.updateOrganization(crudModal.id, trimmed);
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
            await window.electronAPI.updateProject(crudModal.id, trimmed, project.description || '');
            setProjects((prev) =>
              prev.map((p) => (p.id === crudModal.id ? { ...p, name: trimmed } : p)),
            );
            setTaskDetail((prev) =>
              prev && prev.projectId === crudModal.id ? { ...prev, projectName: trimmed } : prev,
            );
          }
        }
      } else if (crudModal.type === 'task') {
        if (crudModal.mode === 'add' && crudModal.parentId && selectedOrganizationId) {
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
          await window.electronAPI.updateTask(crudModal.id, trimmed);
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
  }, [crudModal, projects, selectedOrganizationId, closeCrudModal, setSelection]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal) return;

    try {
      if (deleteModal.type === 'organization') {
        await window.electronAPI.deleteOrganization(deleteModal.id);
        setOrganizations((prev) => prev.filter((o) => o.id !== deleteModal.id));
        // Clear selection if deleted org was selected
        if (selectedOrganizationId === deleteModal.id) {
          setSelection(null, null, null);
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
        if (selectedProjectId === deleteModal.id) {
          setSelection(selectedOrganizationId, null, null);
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
        if (selectedTaskId === deleteModal.id) {
          setSelection(selectedOrganizationId, selectedProjectId, null);
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
  }, [deleteModal, selectedOrganizationId, selectedProjectId, selectedTaskId, setSelection, timerTask, stop]);

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
          <span>Task Management</span>
        </div>
        <div className="header-actions">
          <div className="org-select-group">
            <select className="org-select" value={selectedOrganizationId ?? ''} onChange={handleOrganizationChange}>
              <option value="">Select organization…</option>
              {organizations.map((org) => (
                <option value={org.id} key={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <button
              className="org-action-btn org-action-btn--add"
              onClick={handleAddOrganization}
              title="Add organization"
              type="button"
            >
              +
            </button>
            {selectedOrganizationId && (
              <>
                <button
                  className="org-action-btn org-action-btn--edit"
                  onClick={handleEditOrganization}
                  title="Edit organization"
                  type="button"
                >
                  ✎
                </button>
                <button
                  className="org-action-btn org-action-btn--delete"
                  onClick={handleDeleteOrganization}
                  title="Delete organization"
                  type="button"
                >
                  ✕
                </button>
              </>
            )}
          </div>
          <button className="back-btn" onClick={() => navigate('/')} type="button">
            <span>←</span>
            <span>Back</span>
          </button>
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
              organizationSelected={Boolean(selectedOrganizationId)}
              loadingProjects={loadingProjects}
              projects={projects}
              expandedProjects={expandedProjects}
              selectedProjectId={selectedProjectId}
              selectedTaskId={selectedTaskId}
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
              hasOrganization={Boolean(selectedOrganizationId)}
              hasProject={Boolean(selectedProjectId)}
              hasTask={Boolean(selectedTaskId)}
              loadingTask={loadingTask}
              taskDetail={taskDetail}
              onProjectNameBlur={handleProjectNameBlur}
              onProjectDescriptionBlur={handleProjectDescriptionBlur}
              onTaskNameBlur={handleTaskNameBlur}
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
