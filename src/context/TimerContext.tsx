import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Task, TimerState } from '../types/electron';
import { formatDuration } from '../utils/timeUtils';

type TimerStatus = 'idle' | 'running' | 'paused';

interface TimerContextValue {
  status: TimerStatus;
  elapsedTime: number;
  display: string;
  task: Task | null;
  setTaskContext: (task: Task | null, initialElapsed?: number) => void;
  start: (task?: Task, forceReset?: boolean) => void;
  pause: () => void;
  stop: () => Promise<boolean>;
  /** Reset timer completely - clears task and elapsed time */
  reset: () => void;
  /** 
   * Get the unsaved elapsed time (time since last auto-save).
   * For total task time display: use taskDurations[taskId] + getUnsavedTime()
   * This approach avoids double-counting since DB total already includes auto-saved time.
   */
  getUnsavedTime: () => number;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

/**
 * TimerProvider - Manages timer state synchronized with the Electron main process
 * 
 * Architecture:
 * - Main process is the source of truth for timing (avoids Chromium throttling)
 * - Frontend receives state updates via IPC
 * - Frontend handles user interactions and time entry saves
 * - Main process handles quit-time saves for unsaved time
 * 
 * Time tracking:
 * - previousElapsedRef: Local tracking of what elapsed time has been saved to DB
 * - This syncs with main process's lastSavedElapsed on state updates
 * - Unsaved time = elapsedTime - previousElapsedRef
 */
export function TimerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [display, setDisplay] = useState('0:00');
  const [task, setTask] = useState<Task | null>(null);

  // Track the elapsed time that has been saved to the database
  // This should stay in sync with main process's lastSavedElapsed
  const previousElapsedRef = useRef(0);
  const lastStatusRef = useRef<TimerStatus>('idle');
  // Ref for current elapsed time (for use in intervals without stale closures)
  const elapsedTimeRef = useRef(0);
  // Track if we've done initial sync
  const initialSyncDone = useRef(false);

  // Subscribe to timer state updates from main process
  // The main process handles all timing to avoid Chromium throttling
  useEffect(() => {
    const handleTimerState = async (state: TimerState) => {
      setStatus(state.status);
      setElapsedTime(state.elapsedTime);
      elapsedTimeRef.current = state.elapsedTime;
      setDisplay(state.display || formatDuration(state.elapsedTime));
      setTask(state.task);

      // Sync our local "what's been saved" tracking with main process
      // This is critical for preventing duplicate saves
      if (state.lastSavedElapsed !== undefined) {
        previousElapsedRef.current = state.lastSavedElapsed;
      } else if (!initialSyncDone.current) {
        // First sync - if no lastSavedElapsed provided, assume all elapsed time is saved
        // (this handles the case of restoring from a previous session)
        previousElapsedRef.current = state.elapsedTime;
      }
      
      initialSyncDone.current = true;
      lastStatusRef.current = state.status;
    };

    const unsubscribe = window.electronAPI.onTimerState(handleTimerState);

    // Request initial state
    window.electronAPI.requestTimerState().then(handleTimerState);

    return () => {
      unsubscribe?.();
    };
  }, []);

  const setTaskContext = useCallback((newTask: Task | null, initialElapsed = 0) => {
    if (!newTask) {
      previousElapsedRef.current = 0;
      setTask(null);
      setElapsedTime(0);
      elapsedTimeRef.current = 0;
      setDisplay('0:00');
      setStatus('idle');
      lastStatusRef.current = 'idle';
      window.electronAPI.updateTimerState({
        status: 'idle',
        elapsedTime: 0,
        display: '0:00',
        task: null,
        updatedAt: Date.now(),
      });
      // Reset the saved elapsed tracking in main process
      window.electronAPI.updateTimerSavedElapsed(0);
      return;
    }

    const normalizedElapsed = Math.max(0, Math.floor(initialElapsed));
    const nextStatus: TimerStatus = normalizedElapsed > 0 ? 'paused' : 'idle';
    const nextDisplay = formatDuration(normalizedElapsed);

    // When setting a new task context with initial elapsed time,
    // that time is already saved in the database, so sync our tracking
    previousElapsedRef.current = normalizedElapsed;
    setTask(newTask);
    setElapsedTime(normalizedElapsed);
    elapsedTimeRef.current = normalizedElapsed;
    setDisplay(nextDisplay);
    setStatus(nextStatus);
    lastStatusRef.current = nextStatus;

    window.electronAPI.updateTimerState({
      status: nextStatus,
      elapsedTime: normalizedElapsed,
      display: nextDisplay,
      task: newTask,
      updatedAt: Date.now(),
      taskTotalDuration: normalizedElapsed, // Total from DB at start of session
    });
    // Sync saved elapsed with main process
    window.electronAPI.updateTimerSavedElapsed(normalizedElapsed);
  }, []);

  const start = useCallback(
    (selectedTask?: Task, forceReset = false) => {
      const taskToUse = selectedTask || task;
      if (!taskToUse) {
        console.warn('Cannot start timer without a task');
        return;
      }

      // forceReset = true means always start fresh (used when switching tasks)
      // Otherwise, only resume if same task and currently paused
      const isSameTask = task && selectedTask && task.id === selectedTask.id;
      const isResumingPaused = isSameTask && status === 'paused' && !forceReset;
      
      // Only keep elapsed time if resuming the same paused task
      const shouldResetTime = !isResumingPaused;
      
      const newElapsedTime = shouldResetTime ? 0 : elapsedTime;
      const newDisplay = shouldResetTime ? '0:00' : display;
      
      if (shouldResetTime) {
        setElapsedTime(0);
        elapsedTimeRef.current = 0;
        previousElapsedRef.current = 0;
        setDisplay('0:00');
      }

      setStatus('running');
      lastStatusRef.current = 'running';
      setTask(taskToUse);

      window.electronAPI.updateTimerState({
        status: 'running',
        task: taskToUse,
        elapsedTime: newElapsedTime,
        display: newDisplay,
        updatedAt: Date.now(),
      });
      
      if (shouldResetTime) {
        window.electronAPI.updateTimerSavedElapsed(0);
      }
    },
    [task, elapsedTime, display, status],
  );

  const pause = useCallback(() => {
    setStatus('paused');
    lastStatusRef.current = 'paused';

    window.electronAPI.updateTimerState({
      status: 'paused',
      elapsedTime,
      display,
      task,
      updatedAt: Date.now(),
    });
  }, [elapsedTime, display, task]);

  /**
   * Stop the timer and save any unsaved time to the database.
   * Returns true if time was saved, false otherwise.
   * Note: This pauses the timer but keeps the elapsed time - use reset() to clear completely.
   */
  const stop = useCallback(async () => {
    let saved = false;

    if (task) {
      const diff = elapsedTime - previousElapsedRef.current;
      if (diff > 0) {
        await window.electronAPI.saveTimeEntry({
          task_id: task.id,
          duration: diff,
          timestamp: new Date().toISOString(),
        });
        previousElapsedRef.current = elapsedTime;
        // Notify main process of the save
        window.electronAPI.updateTimerSavedElapsed(elapsedTime);
        // Note: Don't update taskTotalDuration here - it will be updated when starting a new task
        saved = true;
      }
    }

    const nextStatus: TimerStatus = elapsedTime > 0 ? 'paused' : 'idle';
    const nextDisplay = formatDuration(elapsedTime);

    setStatus(nextStatus);
    lastStatusRef.current = nextStatus;
    setDisplay(nextDisplay);

    window.electronAPI.updateTimerState({
      status: nextStatus,
      elapsedTime,
      display: nextDisplay,
      task,
      updatedAt: Date.now(),
    });

    return saved;
  }, [elapsedTime, task]);

  /**
   * Reset the timer completely - saves any unsaved time, then clears state.
   * Use this when completely finishing work on a task.
   */
  const reset = useCallback(async () => {
    // First save any unsaved time
    if (task) {
      const diff = elapsedTime - previousElapsedRef.current;
      if (diff > 0) {
        await window.electronAPI.saveTimeEntry({
          task_id: task.id,
          duration: diff,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Then clear everything
    previousElapsedRef.current = 0;
    setTask(null);
    setElapsedTime(0);
    elapsedTimeRef.current = 0;
    setDisplay('0:00');
    setStatus('idle');
    lastStatusRef.current = 'idle';

    window.electronAPI.updateTimerState({
      status: 'idle',
      elapsedTime: 0,
      display: '0:00',
      task: null,
      updatedAt: Date.now(),
    });
    window.electronAPI.updateTimerSavedElapsed(0);
  }, [elapsedTime, task]);

  // Listen for timer commands from menubar
  useEffect(() => {
    const handleCommand = (command: string) => {
      if (command === 'start') {
        start();
      } else if (command === 'pause') {
        pause();
      } else if (command === 'stop') {
        void stop();
      } else if (command === 'reset') {
        void reset();
      }
    };

    const unsubscribe = window.electronAPI.onTimerCommand(handleCommand);
    return () => {
      unsubscribe?.();
    };
  }, [start, pause, stop, reset]);

  // Auto-save time entries every 15 seconds while running to prevent data loss
  // This provides crash protection - max 15 seconds of lost time if app crashes
  useEffect(() => {
    if (status !== 'running' || !task) {
      return;
    }

    const taskId = task.id;
    const autoSaveInterval = setInterval(async () => {
      const currentElapsed = elapsedTimeRef.current;
      const diff = currentElapsed - previousElapsedRef.current;
      if (diff >= 15) { // Only save if at least 15 seconds accumulated
        try {
          await window.electronAPI.saveTimeEntry({
            task_id: taskId,
            duration: diff,
            timestamp: new Date().toISOString(),
          });
          previousElapsedRef.current = currentElapsed;
          // Notify main process of the save so it can track for quit-time saving
          window.electronAPI.updateTimerSavedElapsed(currentElapsed);
          // Update task total duration for tray display
          try {
            const totalDuration = await window.electronAPI.getTotalDurationByTask(taskId) || 0;
            window.electronAPI.updateTimerTaskTotalDuration(totalDuration);
          } catch (error) {
            console.error('Failed to update task total duration:', error);
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 15000); // Check every 15 seconds

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [status, task]);

  /**
   * Get the unsaved elapsed time (time since last auto-save).
   * For displaying total task time, use: taskDurations[taskId] + getUnsavedTime()
   * This avoids double-counting since DB total already includes auto-saved time.
   */
  const getUnsavedTime = useCallback((): number => {
    if (status === 'idle') return 0;
    return Math.max(0, elapsedTime - previousElapsedRef.current);
  }, [status, elapsedTime]);

  const value = useMemo<TimerContextValue>(
    () => ({
      status,
      elapsedTime,
      display,
      task,
      setTaskContext,
      start,
      pause,
      stop,
      reset,
      getUnsavedTime,
    }),
    [status, elapsedTime, display, task, setTaskContext, start, pause, stop, reset, getUnsavedTime],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
