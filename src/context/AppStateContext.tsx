import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Task, SelectionState } from '../types/electron';
import { useTimer } from './TimerContext';

interface AppStateContextValue {
  // Selection state for menu bar (active timer task)
  selectedOrganizationId: number | null;
  selectedProjectId: number | null;
  selectedTaskId: number | null;
  setSelectedOrganizationId: (organizationId: number | null) => void;
  setSelectedProjectId: (projectId: number | null) => void;
  setSelectedTaskId: (taskId: number | null) => void;
  setSelection: (organizationId: number | null, projectId: number | null, taskId: number | null) => void;
  // Browsing state for task manager (doesn't affect timer)
  browsingOrganizationId: number | null;
  browsingProjectId: number | null;
  browsingTaskId: number | null;
  setBrowsingOrganizationId: (organizationId: number | null) => void;
  setBrowsingProjectId: (projectId: number | null) => void;
  setBrowsingTaskId: (taskId: number | null) => void;
  setBrowsingSelection: (organizationId: number | null, projectId: number | null, taskId: number | null) => void;
  // Start a task from the browser (stops current timer and starts new one)
  startTaskFromBrowser: (organizationId: number, projectId: number, taskId: number, task: any) => Promise<void>;
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
  // Selection state (for menu bar - active timer task)
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectIdState] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskIdState] = useState<number | null>(null);
  // Browsing state (for task manager - doesn't affect timer)
  const [browsingOrganizationId, setBrowsingOrganizationIdState] = useState<number | null>(null);
  const [browsingProjectId, setBrowsingProjectIdState] = useState<number | null>(null);
  const [browsingTaskId, setBrowsingTaskIdState] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Subscribe to selection state updates from main process (shared across windows)
  useEffect(() => {
    const handleSelectionState = (state: SelectionState) => {
      const sanitized = sanitizeSelection(state.organizationId, state.projectId, state.taskId);
      setSelectedOrganizationIdState(sanitized.organizationId);
      setSelectedProjectIdState(sanitized.projectId);
      setSelectedTaskIdState(sanitized.taskId);
    };

    const unsubscribe = window.electronAPI.onSelectionState(handleSelectionState);

    // Request initial state from main process
    window.electronAPI.requestSelectionState().then((state) => {
      const sanitized = sanitizeSelection(state.organizationId, state.projectId, state.taskId);
      handleSelectionState(state);
      // Initialize browsing state to match persisted selection state
      setBrowsingOrganizationIdState(sanitized.organizationId);
      setBrowsingProjectIdState(sanitized.projectId);
      setBrowsingTaskIdState(sanitized.taskId);
      setHydrated(true);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const setSelection = useCallback((organizationId: number | null, projectId: number | null, taskId: number | null) => {
    const sanitized = sanitizeSelection(organizationId, projectId, taskId);

    setSelectedOrganizationIdState((prev) => (prev === sanitized.organizationId ? prev : sanitized.organizationId));
    setSelectedProjectIdState((prev) => (prev === sanitized.projectId ? prev : sanitized.projectId));
    setSelectedTaskIdState((prev) => (prev === sanitized.taskId ? prev : sanitized.taskId));

    // Persist to main process (shared across all windows)
    window.electronAPI.updateSelectionState(sanitized);
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

  // Browsing state setters (for task manager)
  const setBrowsingSelection = useCallback((organizationId: number | null, projectId: number | null, taskId: number | null) => {
    const sanitized = sanitizeSelection(organizationId, projectId, taskId);
    setBrowsingOrganizationIdState((prev) => (prev === sanitized.organizationId ? prev : sanitized.organizationId));
    setBrowsingProjectIdState((prev) => (prev === sanitized.projectId ? prev : sanitized.projectId));
    setBrowsingTaskIdState((prev) => (prev === sanitized.taskId ? prev : sanitized.taskId));
  }, []);

  const handleSetBrowsingOrganization = useCallback(
    (organizationId: number | null) => {
      setBrowsingSelection(organizationId, null, null);
    },
    [setBrowsingSelection],
  );

  const handleSetBrowsingProject = useCallback(
    (projectId: number | null) => {
      setBrowsingSelection(browsingOrganizationId, projectId, null);
    },
    [browsingOrganizationId, setBrowsingSelection],
  );

  const handleSetBrowsingTask = useCallback(
    (taskId: number | null) => {
      setBrowsingSelection(browsingOrganizationId, browsingProjectId, taskId);
    },
    [browsingOrganizationId, browsingProjectId, setBrowsingSelection],
  );

  // Start a task from the browser (stops current and starts new)
  const startTaskFromBrowser = useCallback(
    async (organizationId: number, projectId: number, taskId: number, task: any) => {
      // Stop current task if running
      if (timer.status === 'running' || timer.status === 'paused') {
        await timer.stop();
      }

      // Update selection to the new task
      setSelection(organizationId, projectId, taskId);

      // Start the timer with the new task
      timer.start(task);
    },
    [timer, setSelection],
  );

  // Note: Browsing state is initialized directly from persisted selection in the hydration effect above

  const value = useMemo<AppStateContextValue>(
    () => ({
      selectedOrganizationId,
      selectedProjectId,
      selectedTaskId,
      setSelectedOrganizationId: handleSetOrganization,
      setSelectedProjectId: handleSetProject,
      setSelectedTaskId: handleSetTask,
      setSelection,
      browsingOrganizationId,
      browsingProjectId,
      browsingTaskId,
      setBrowsingOrganizationId: handleSetBrowsingOrganization,
      setBrowsingProjectId: handleSetBrowsingProject,
      setBrowsingTaskId: handleSetBrowsingTask,
      setBrowsingSelection,
      startTaskFromBrowser,
      timer,
      hydrated,
    }),
    [
      selectedOrganizationId,
      selectedProjectId,
      selectedTaskId,
      handleSetOrganization,
      handleSetProject,
      handleSetTask,
      setSelection,
      browsingOrganizationId,
      browsingProjectId,
      browsingTaskId,
      handleSetBrowsingOrganization,
      handleSetBrowsingProject,
      handleSetBrowsingTask,
      setBrowsingSelection,
      startTaskFromBrowser,
      timer,
      hydrated,
    ],
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
