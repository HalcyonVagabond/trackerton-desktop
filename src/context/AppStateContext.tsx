import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Task } from '../types/electron';
import { useTimer } from './TimerContext';

const STORAGE_KEYS = {
  organization: 'selectedOrganization',
  project: 'selectedProject',
  task: 'selectedTask',
} as const;

const parseStoredId = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

interface AppStateContextValue {
  selectedOrganizationId: number | null;
  selectedProjectId: number | null;
  selectedTaskId: number | null;
  setSelectedOrganizationId: (organizationId: number | null) => void;
  setSelectedProjectId: (projectId: number | null) => void;
  setSelectedTaskId: (taskId: number | null) => void;
  setSelection: (organizationId: number | null, projectId: number | null, taskId: number | null) => void;
  timer: ReturnType<typeof useTimer>;
  hydrated: boolean;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

const sanitizeSelection = (organizationId: number | null, projectId: number | null, taskId: number | null) => {
  const orgId = organizationId ?? null;
  const projectIdSanitized = orgId ? projectId ?? null : null;
  const taskIdSanitized = projectIdSanitized ? taskId ?? null : null;
  return {
    organizationId: orgId,
    projectId: projectIdSanitized,
    taskId: taskIdSanitized,
  };
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const timer = useTimer();
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskIdState] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setHydrated(true);
      return;
    }

    const storedOrg = parseStoredId(window.localStorage.getItem(STORAGE_KEYS.organization));
    const storedProject = parseStoredId(window.localStorage.getItem(STORAGE_KEYS.project));
    const storedTask = parseStoredId(window.localStorage.getItem(STORAGE_KEYS.task));

    const sanitized = sanitizeSelection(storedOrg, storedProject, storedTask);
    setSelectedOrganizationIdState(sanitized.organizationId);
    setSelectedProjectIdState(sanitized.projectId);
    setSelectedTaskIdState(sanitized.taskId);
    setHydrated(true);
  }, []);

  const setSelection = useCallback((organizationId: number | null, projectId: number | null, taskId: number | null) => {
    const sanitized = sanitizeSelection(organizationId, projectId, taskId);

    setSelectedOrganizationIdState((prev) => (prev === sanitized.organizationId ? prev : sanitized.organizationId));
    setSelectedProjectIdState((prev) => (prev === sanitized.projectId ? prev : sanitized.projectId));
    setSelectedTaskIdState((prev) => (prev === sanitized.taskId ? prev : sanitized.taskId));
  }, []);

  const handleSetOrganization = useCallback(
    (organizationId: number | null) => {
      setSelection(organizationId, null, null);
    },
    [setSelection],
  );

  const handleSetProject = useCallback(
    (projectId: number | null) => {
      setSelection(selectedOrganizationId, projectId, null);
    },
    [selectedOrganizationId, setSelection],
  );

  const handleSetTask = useCallback(
    (taskId: number | null) => {
      setSelection(selectedOrganizationId, selectedProjectId, taskId);
    },
    [selectedOrganizationId, selectedProjectId, setSelection],
  );

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEYS.organization,
        selectedOrganizationId ? String(selectedOrganizationId) : '',
      );
      window.localStorage.setItem(
        STORAGE_KEYS.project,
        selectedProjectId ? String(selectedProjectId) : '',
      );
      window.localStorage.setItem(STORAGE_KEYS.task, selectedTaskId ? String(selectedTaskId) : '');
    } catch (error) {
      console.error('Failed to persist selection state', error);
    }
  }, [selectedOrganizationId, selectedProjectId, selectedTaskId, hydrated]);

  useEffect(() => {
    const activeTask: Task | null = timer.task;
    if (!activeTask || timer.status === 'idle') {
      return;
    }

    const organizationId = activeTask.organization_id ?? selectedOrganizationId;
    const projectId = activeTask.project_id ?? selectedProjectId;
    const taskId = activeTask.id ?? selectedTaskId;

    setSelection(organizationId ?? null, projectId ?? null, taskId ?? null);
  }, [timer.task, timer.status, setSelection, selectedOrganizationId, selectedProjectId, selectedTaskId]);

  const value = useMemo<AppStateContextValue>(
    () => ({
      selectedOrganizationId,
      selectedProjectId,
      selectedTaskId,
      setSelectedOrganizationId: handleSetOrganization,
      setSelectedProjectId: handleSetProject,
      setSelectedTaskId: handleSetTask,
      setSelection,
      timer,
      hydrated,
    }),
    [selectedOrganizationId, selectedProjectId, selectedTaskId, handleSetOrganization, handleSetProject, handleSetTask, setSelection, timer, hydrated],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
