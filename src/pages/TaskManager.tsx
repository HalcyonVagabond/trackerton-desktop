import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAutoPause } from '../hooks/useAutoPause';
import type { Organization, Task, TimeEntry, ProjectStatus, TaskStatus } from '../types/electron';
import type { ProjectWithTasks, TaskDetail, TimeEntryModalState } from '../types/taskManager';
import { parseNumber } from '../utils/taskManager';
import { TimeEntryModal } from '../components/taskManager/TimeEntryModal';
import { LoadingOverlay } from '../components/taskManager/LoadingOverlay';
import { useAppState } from '../context/AppStateContext';
import { GenericModal } from '../components/GenericModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { NavPanel } from '../components/layout/NavPanel';
import { ContentPanel } from '../components/layout/ContentPanel';
import { DetailPanel } from '../components/layout/DetailPanel';
import { WelcomeModal } from '../components/WelcomeModal';
import { LicenseAcceptanceModal, hasAcceptedLicense } from '../components/LicenseAcceptanceModal';
import '../styles/app-layout.css';

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
  const { theme, mode: themeMode, setTheme } = useTheme();
  const {
    timer,
    browsingOrganizationId,
    browsingProjectId,
    browsingTaskId,
    setBrowsingSelection,
    startTaskFromBrowser,
    hydrated,
  } = useAppState();
  // Timer context provides getUnsavedTime() - for total, use taskDurations[taskId] + getUnsavedTime()
  const { status: timerStatus, task: timerTask, start, stop, pause: timerPause, reset: timerReset, getUnsavedTime } = timer;

  // Auto-pause hook - pauses timer when system is idle
  const handleAutoPause = useCallback(() => {
    if (timerStatus === 'running') {
      timerPause();
    }
  }, [timerStatus, timerPause]);

  const { settings: autoPauseSettings, toggleEnabled: toggleAutoPause, updateSettings: updateAutoPauseSettings } = useAutoPause(
    timerStatus === 'running',
    handleAutoPause
  );

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(() => new Set());
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);
  const [modalState, setModalState] = useState<TimeEntryModalState>({ isOpen: false, entry: null });
  const [timerActionPending, setTimerActionPending] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [projectTotalTime, setProjectTotalTime] = useState(0);
  const [taskDurations, setTaskDurations] = useState<Record<number, number>>({});
  
  // License acceptance state - check if already accepted
  const [licenseAccepted, setLicenseAccepted] = useState(() => hasAcceptedLicense());
  
  // Status filter states
  const [projectStatusFilter, setProjectStatusFilter] = useState<ProjectStatus | ''>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | ''>('');
  
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
    () => (theme === 'dark' ? './logo-icon-light.png' : './logo-icon-dark.png'),
    [theme],
  );

  // Filter projects and tasks based on status filters
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        if (!projectStatusFilter) return true;
        return project.status === projectStatusFilter;
      })
      .map((project) => ({
        ...project,
        tasks: project.tasks.filter((task) => {
          if (!taskStatusFilter) return true;
          return task.status === taskStatusFilter;
        }),
      }));
  }, [projects, projectStatusFilter, taskStatusFilter]);

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

  // Calculate real-time project total (saved time + unsaved timer time if applicable)
  const realTimeProjectTotal = useMemo(() => {
    // Start with the saved project total time (includes all auto-saved time entries)
    let total = projectTotalTime;
    
    // If timer is running/paused for a task in the current project, add only the UNSAVED time
    // This prevents double-counting since auto-saved time is already in projectTotalTime
    if (timerTask && timerTask.project_id === browsingProjectId && timerStatus !== 'idle') {
      total += getUnsavedTime();
    }
    
    return total;
  }, [projectTotalTime, timerTask, browsingProjectId, timerStatus, getUnsavedTime]);

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
          rawProjects.map(async (project) => {
            const tasks = await window.electronAPI.getTasks(project.id, undefined);
            
            // Add organization_id to each task for proper context when starting timer
            const tasksWithOrg = tasks.map(task => ({
              ...task,
              organization_id: organizationId,
            }));
            
            // Apply saved task order from localStorage
            const taskOrderKey = `task-order-${project.id}`;
            const savedTaskOrder = localStorage.getItem(taskOrderKey);
            let orderedTasks = tasksWithOrg;
            
            if (savedTaskOrder) {
              try {
                const orderArray: number[] = JSON.parse(savedTaskOrder);
                orderedTasks = [...tasksWithOrg].sort((a, b) => {
                  const aIndex = orderArray.indexOf(a.id);
                  const bIndex = orderArray.indexOf(b.id);
                  // Items not in order array go to the end
                  if (aIndex === -1 && bIndex === -1) return 0;
                  if (aIndex === -1) return 1;
                  if (bIndex === -1) return -1;
                  return aIndex - bIndex;
                });
              } catch {
                // Ignore invalid JSON
              }
            }
            
            return { ...project, tasks: orderedTasks };
          }),
        );

        if (!isMounted.current) {
          return;
        }

        // Apply saved project order from localStorage
        const projectOrderKey = `project-order-${organizationId}`;
        const savedProjectOrder = localStorage.getItem(projectOrderKey);
        let orderedProjects = projectsWithTasks;
        
        if (savedProjectOrder) {
          try {
            const orderArray: number[] = JSON.parse(savedProjectOrder);
            orderedProjects = [...projectsWithTasks].sort((a, b) => {
              const aIndex = orderArray.indexOf(a.id);
              const bIndex = orderArray.indexOf(b.id);
              // Items not in order array go to the end
              if (aIndex === -1 && bIndex === -1) return 0;
              if (aIndex === -1) return 1;
              if (bIndex === -1) return -1;
              return aIndex - bIndex;
            });
          } catch {
            // Ignore invalid JSON
          }
        }

        setProjects(orderedProjects);

  const requestedProjectId = options?.projectId ?? null;
  const requestedTaskId = options?.taskId ?? null;

        if (requestedProjectId && orderedProjects.some((proj) => proj.id === requestedProjectId)) {
          const projectForSelection = orderedProjects.find((proj) => proj.id === requestedProjectId) ?? null;
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

  // Calculate project total time and task durations when project changes
  const reloadTaskDurations = useCallback(async () => {
    if (!browsingProjectId) {
      setProjectTotalTime(0);
      setTaskDurations({});
      return;
    }
    
    const project = projects.find(p => p.id === browsingProjectId);
    if (!project || !project.tasks || project.tasks.length === 0) {
      setProjectTotalTime(0);
      setTaskDurations({});
      return;
    }
    
    try {
      // Fetch all task durations
      const durations = await Promise.all(
        project.tasks.map(async (task) => ({
          taskId: task.id,
          duration: await window.electronAPI.getTotalDurationByTask(task.id) || 0
        }))
      );
      
      // Build duration map
      const durationMap: Record<number, number> = {};
      let total = 0;
      for (const { taskId, duration } of durations) {
        durationMap[taskId] = duration;
        total += duration;
      }
      
      setTaskDurations(durationMap);
      setProjectTotalTime(total);
    } catch (error) {
      console.error('Failed to load project total time:', error);
      setProjectTotalTime(0);
      setTaskDurations({});
    }
  }, [browsingProjectId, projects]);

  useEffect(() => {
    void reloadTaskDurations();
  }, [reloadTaskDurations, taskDetail]); // Re-run when taskDetail changes (new time entries)

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

  const handleTaskDescriptionBlur = async (taskId: number, value: string) => {
    try {
      const projectId = browsingProjectId;
      if (!projectId) return;
      const project = projects.find((p) => p.id === projectId);
      const task = project?.tasks.find((t) => t.id === taskId);
      if (!task) return;
      // Allow empty descriptions
      const newDescription = value.trim() || null;
      if (task.description === newDescription) return;
      await window.electronAPI.updateTask(taskId, { description: newDescription ?? undefined });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, description: newDescription } : t)) }
            : p,
        ),
      );
      setTaskDetail((prev) => (prev && prev.id === taskId ? { ...prev, description: newDescription } : prev));
    } catch (error) {
      console.error('Failed to update task description', error);
      alert('Failed to update task description');
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
    // Refresh task durations to ensure header/row times are in sync with detail panel
    await reloadTaskDurations();
    setDetailPanelOpen(true);
  };
  
  const closeDetailPanel = () => {
    setDetailPanelOpen(false);
  };

  const openTimeEntryModal = (entry: TimeEntry) => {
    setModalState({ isOpen: true, entry });
  };

  const closeTimeEntryModal = () => {
    setModalState({ isOpen: false, entry: null });
  };

  const handleTimeEntrySave = async ({ duration, timestamp, notes }: { duration: number; timestamp: string; notes?: string }) => {
    if (!modalState.entry) return;
    await window.electronAPI.updateTimeEntry(modalState.entry.id, { duration, timestamp, notes });
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
        // Also refresh task durations to keep header/row times in sync
        await reloadTaskDurations();
      }
    } catch (error) {
      console.error('Failed to stop timer', error);
    } finally {
      setTimerActionPending(false);
    }
  }, [timerActionPending, timerStatus, timerTask, stop, browsingProjectId, browsingTaskId, loadTaskDetails, reloadTaskDurations]);

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
        // Check if we're resuming the exact same task (same ID) or starting a different/new task
        const isSameTask = timerTask && timerTask.id === targetTask.id;
        const isResumingPausedTask = isSameTask && timerStatus === 'paused';
        
        if (isResumingPausedTask) {
          // Resume the same paused task - just call start directly
          const orgId = targetTask.organization_id ?? browsingOrganizationId;
          const taskWithOrg = { ...targetTask, organization_id: orgId ?? undefined };
          start(taskWithOrg);
        } else {
          // Starting a new/different task - use startTaskFromBrowser to properly reset timer state
          const orgId = targetTask.organization_id ?? browsingOrganizationId;
          const projId = targetTask.project_id ?? browsingProjectId;
          if (orgId && projId) {
            await startTaskFromBrowser(orgId, projId, targetTask.id, targetTask);
          } else {
            console.warn('Cannot start task: missing organization or project ID');
          }
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

  const handleArchiveOrganization = useCallback(async () => {
    if (!browsingOrganizationId) {
      alert('Please select an organization first');
      return;
    }
    const org = organizations.find((o) => o.id === browsingOrganizationId);
    if (!org) return;
    
    try {
      await window.electronAPI.updateOrganization(browsingOrganizationId, { status: 'archived' });
      setOrganizations((prev) => 
        prev.map((o) => o.id === browsingOrganizationId ? { ...o, status: 'archived' } : o)
      );
      // If timer is running for a task in this org, stop it
      if (timerTask?.organization_id === browsingOrganizationId) {
        stop();
      }
      window.electronAPI.showNotification('Organization Archived', `"${org.name}" has been archived`);
    } catch (err) {
      console.error('Failed to archive organization:', err);
      alert('Failed to archive organization');
    }
  }, [browsingOrganizationId, organizations, timerTask, stop]);

  const handleUnarchiveOrganization = useCallback(async () => {
    if (!browsingOrganizationId) return;
    const org = organizations.find((o) => o.id === browsingOrganizationId);
    if (!org) return;
    
    try {
      await window.electronAPI.updateOrganization(browsingOrganizationId, { status: 'active' });
      setOrganizations((prev) => 
        prev.map((o) => o.id === browsingOrganizationId ? { ...o, status: 'active' } : o)
      );
      window.electronAPI.showNotification('Organization Restored', `"${org.name}" has been restored`);
    } catch (err) {
      console.error('Failed to restore organization:', err);
      alert('Failed to restore organization');
    }
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

  const handleEditProject = useCallback((projectId: number) => {
    const project = projectsRef.current.find(p => p.id === projectId);
    if (!project) return;
    setCrudModal({
      isOpen: true,
      mode: 'edit',
      type: 'project',
      id: project.id,
      parentId: project.organization_id,
      initialName: project.name,
    });
  }, []);

  const handleDeleteProject = useCallback((projectId: number) => {
    const project = projectsRef.current.find(p => p.id === projectId);
    if (!project) return;
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

  const handleEditTask = useCallback((taskId: number) => {
    // Find the task in any project
    let task: Task | undefined;
    for (const project of projectsRef.current) {
      task = project.tasks.find(t => t.id === taskId);
      if (task) break;
    }
    if (!task) return;
    setCrudModal({
      isOpen: true,
      mode: 'edit',
      type: 'task',
      id: task.id,
      parentId: task.project_id,
      initialName: task.name,
    });
  }, []);

  const handleDeleteTask = useCallback((taskId: number) => {
    // Find the task in any project
    let task: Task | undefined;
    for (const project of projectsRef.current) {
      task = project.tasks.find(t => t.id === taskId);
      if (task) break;
    }
    if (!task) return;
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
        // Reset timer if a task in this org was being tracked
        if (timerTask?.organization_id === deleteModal.id) {
          await timerReset();
        }
      } else if (deleteModal.type === 'project') {
        await window.electronAPI.deleteProject(deleteModal.id);
        setProjects((prev) => prev.filter((p) => p.id !== deleteModal.id));
        // Clear selection if deleted project was selected
        if (browsingProjectId === deleteModal.id) {
          setBrowsingSelection(browsingOrganizationId, null, null);
          setTaskDetail(null);
        }
        // Reset timer if a task in this project was being tracked
        if (timerTask?.project_id === deleteModal.id) {
          await timerReset();
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
        // Reset timer if deleted task was being tracked
        if (timerTask?.id === deleteModal.id) {
          await timerReset();
        }
      }

      setDeleteModal(null);
    } catch (error) {
      console.error(`Failed to delete ${deleteModal.type}`, error);
      alert(`Failed to delete ${deleteModal.type}`);
    }
  }, [deleteModal, browsingOrganizationId, browsingProjectId, browsingTaskId, setBrowsingSelection, timerTask, timerReset]);

  // Close delete modal
  const closeDeleteModal = useCallback(() => {
    setDeleteModal(null);
  }, []);

  // Reorder projects - saves order to localStorage for persistence
  const handleReorderProjects = useCallback((projectId: number, newIndex: number) => {
    setProjects(prevProjects => {
      const projectIndex = prevProjects.findIndex(p => p.id === projectId);
      if (projectIndex === -1 || projectIndex === newIndex) return prevProjects;
      
      const newProjects = [...prevProjects];
      const [removed] = newProjects.splice(projectIndex, 1);
      newProjects.splice(newIndex, 0, removed);
      
      // Save order to localStorage
      if (browsingOrganizationId) {
        const orderKey = `project-order-${browsingOrganizationId}`;
        const order = newProjects.map(p => p.id);
        localStorage.setItem(orderKey, JSON.stringify(order));
      }
      
      return newProjects;
    });
  }, [browsingOrganizationId]);

  // Reorder tasks within a project - saves order to localStorage for persistence
  const handleReorderTasks = useCallback((taskId: number, projectId: number, newIndex: number) => {
    setProjects(prevProjects => {
      return prevProjects.map(project => {
        if (project.id !== projectId) return project;
        
        const taskIndex = project.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1 || taskIndex === newIndex) return project;
        
        const newTasks = [...project.tasks];
        const [removed] = newTasks.splice(taskIndex, 1);
        newTasks.splice(newIndex, 0, removed);
        
        // Save task order to localStorage
        const orderKey = `task-order-${projectId}`;
        const order = newTasks.map(t => t.id);
        localStorage.setItem(orderKey, JSON.stringify(order));
        
        return { ...project, tasks: newTasks };
      });
    });
  }, []);

  return (
    <div className="app-layout" data-theme={theme}>
      <LoadingOverlay visible={isOverlayVisible} logoSrc={loadingLogo} />
      
      {/* License acceptance modal - shows before anything else on first launch */}
      {!licenseAccepted && (
        <LicenseAcceptanceModal onAccept={() => setLicenseAccepted(true)} />
      )}
      
      {/* Welcome modal - only shows after license is accepted */}
      {licenseAccepted && <WelcomeModal />}

      {/* Left Navigation Panel */}
      <NavPanel
        organizations={organizations}
        selectedOrgId={browsingOrganizationId}
        selectedOrgStatus={organizations.find(o => o.id === browsingOrganizationId)?.status}
        onSelectOrg={(id) => {
          setBrowsingSelection(id, null, null);
          setTaskDetail(null);
          setProjects([]);
          setExpandedProjects(new Set());
          lastLoadedOrganizationId.current = id;
          void loadProjectsForOrganization(id, { projectId: null, taskId: null });
        }}
        onAddOrg={handleAddOrganization}
        onEditOrg={handleEditOrganization}
        onArchiveOrg={handleArchiveOrganization}
        onUnarchiveOrg={handleUnarchiveOrganization}
        onDeleteOrg={handleDeleteOrganization}
        projectStatusFilter={projectStatusFilter as ProjectStatus | null}
        taskStatusFilter={taskStatusFilter as TaskStatus | null}
        onProjectStatusFilterChange={(status) => setProjectStatusFilter(status || '')}
        onTaskStatusFilterChange={(status) => setTaskStatusFilter(status || '')}
        projects={filteredProjects}
        expandedProjects={expandedProjects}
        selectedProjectId={browsingProjectId}
        selectedTaskId={browsingTaskId}
        onToggleProject={toggleProject}
        onSelectProject={(projectId) => {
          if (browsingOrganizationId) {
            setBrowsingSelection(browsingOrganizationId, projectId, null);
            setTaskDetail(null);
          }
        }}
        onSelectTask={handleTaskSelection}
        onAddProject={handleAddProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
        onAddTask={handleAddTask}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
        onReorderProjects={handleReorderProjects}
        onReorderTasks={handleReorderTasks}
        timerTask={timerTask}
        timerStatus={timerStatus}
        effectiveTheme={theme}
        themeMode={themeMode}
        onThemeChange={setTheme}
        autoPauseSettings={autoPauseSettings}
        onAutoPauseToggle={toggleAutoPause}
        onAutoPauseThresholdChange={(threshold) => updateAutoPauseSettings({ idleThreshold: threshold })}
        loading={loadingProjects}
      />

      {/* Main Content Panel */}
      <ContentPanel
        hasOrganization={Boolean(browsingOrganizationId)}
        hasProject={Boolean(browsingProjectId)}
        selectedTaskId={browsingTaskId}
        project={projects.find((p) => p.id === browsingProjectId) || null}
        projectTotalTime={realTimeProjectTotal}
        taskDurations={taskDurations}
        timerTask={timerTask}
        timerStatus={timerStatus}
        getUnsavedTime={getUnsavedTime}
        onProjectNameChange={(name) => browsingProjectId && handleProjectNameBlur(browsingProjectId, name)}
        onProjectDescriptionChange={(desc) => browsingProjectId && handleProjectDescriptionBlur(browsingProjectId, desc)}
        onProjectStatusChange={(status) => browsingProjectId && handleProjectStatusChange(browsingProjectId, status)}
        onSelectTask={(taskId) => browsingProjectId && handleTaskSelection(browsingProjectId, taskId)}
        onAddTask={() => browsingProjectId && handleAddTask(browsingProjectId)}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
        onStartTimer={handleStartTimer}
        onStopTimer={() => void handleStopTimer()}
        actionDisabled={timerActionPending}
      />

      {/* Right Detail Panel */}
      <DetailPanel
        isOpen={detailPanelOpen}
        onClose={closeDetailPanel}
        taskDetail={taskDetail}
        loadingTask={loadingTask}
        timerTask={timerTask}
        timerStatus={timerStatus}
        getUnsavedTime={getUnsavedTime}
        onTaskNameChange={(name) => browsingTaskId && handleTaskNameBlur(browsingTaskId, name)}
        onTaskDescriptionChange={(desc) => browsingTaskId && handleTaskDescriptionBlur(browsingTaskId, desc)}
        onTaskStatusChange={(status) => browsingTaskId && handleTaskStatusChange(browsingTaskId, status)}
        onStartTimer={handleStartTimer}
        onStopTimer={() => void handleStopTimer()}
        onEditTimeEntry={openTimeEntryModal}
        onDeleteTimeEntry={(entryId) => void handleDeleteTimeEntry(entryId)}
        actionDisabled={timerActionPending}
      />

      {/* Modals */}
      <TimeEntryModal state={modalState} onClose={closeTimeEntryModal} onSave={handleTimeEntrySave} />

      <GenericModal
        isOpen={crudModal.isOpen}
        type={crudModal.type}
        mode={crudModal.mode}
        initialValue={crudModal.initialName}
        onSave={handleCrudModalSave}
        onClose={closeCrudModal}
      />

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
