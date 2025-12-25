import { useState, useEffect, useRef, useCallback } from 'react'
import type { TimerState, Task } from '../types/electron'
import { formatDuration } from '../utils/timeUtils'

export function useTimer() {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [display, setDisplay] = useState('0:00')
  const [task, setTask] = useState<Task | null>(null)

  const previousElapsedRef = useRef(0)
  const lastStatusRef = useRef<'idle' | 'running' | 'paused'>('idle')

  // Subscribe to timer state updates from main process
  // The main process handles all timing to avoid Chromium throttling
  useEffect(() => {
    const handleTimerState = (state: TimerState) => {
      setStatus(state.status)
      setElapsedTime(state.elapsedTime)
      setDisplay(state.display || formatDuration(state.elapsedTime))
      setTask(state.task)

      const statusChanged = lastStatusRef.current !== state.status

      if (state.status === 'running') {
        if (statusChanged) {
          previousElapsedRef.current = state.elapsedTime
        }
      } else {
        previousElapsedRef.current = state.elapsedTime
      }

      lastStatusRef.current = state.status
    }

    const unsubscribe = window.electronAPI.onTimerState(handleTimerState)

    // Request initial state
    window.electronAPI.requestTimerState().then(handleTimerState)

    return () => {
      unsubscribe?.()
    }
  }, [])

  // Timer is now managed entirely by the main process to avoid Chromium throttling
  // when windows are hidden. We just receive updates via IPC.

  const setTaskContext = useCallback((newTask: Task | null, initialElapsed = 0) => {
    if (!newTask) {
      previousElapsedRef.current = 0
      setTask(null)
      setElapsedTime(0)
      setDisplay('0:00')
      setStatus('idle')
      lastStatusRef.current = 'idle'
      window.electronAPI.updateTimerState({
        status: 'idle',
        elapsedTime: 0,
        display: '0:00',
        task: null,
        updatedAt: Date.now(),
      })
      return
    }

    const normalizedElapsed = Math.max(0, Math.floor(initialElapsed))
    const nextStatus: 'idle' | 'paused' = normalizedElapsed > 0 ? 'paused' : 'idle'
    const nextDisplay = formatDuration(normalizedElapsed)

    previousElapsedRef.current = normalizedElapsed
    setTask(newTask)
    setElapsedTime(normalizedElapsed)
    setDisplay(nextDisplay)
    setStatus(nextStatus)
    lastStatusRef.current = nextStatus

    window.electronAPI.updateTimerState({
      status: nextStatus,
      elapsedTime: normalizedElapsed,
      display: nextDisplay,
      task: newTask,
      updatedAt: Date.now(),
    })
  }, [])

  const start = useCallback((selectedTask?: Task) => {
    const taskToUse = selectedTask || task
    if (!taskToUse) {
      console.warn('Cannot start timer without a task')
      return
    }

    setStatus('running')
    lastStatusRef.current = 'running'
    setTask(taskToUse)
    
    previousElapsedRef.current = elapsedTime
    window.electronAPI.updateTimerState({
      status: 'running',
      task: taskToUse,
      elapsedTime,
      display,
      updatedAt: Date.now(),
    })
  }, [task, elapsedTime, display])

  const pause = useCallback(() => {
    setStatus('paused')
    lastStatusRef.current = 'paused'
    
    window.electronAPI.updateTimerState({
      status: 'paused',
      elapsedTime,
      display,
      task,
      updatedAt: Date.now(),
    })
  }, [elapsedTime, display, task])

  const stop = useCallback(async () => {
    let saved = false

    if (task) {
      const diff = elapsedTime - previousElapsedRef.current
      if (diff > 0) {
        await window.electronAPI.saveTimeEntry({
          task_id: task.id,
          duration: diff,
          timestamp: new Date().toISOString(),
        })
        previousElapsedRef.current = elapsedTime
        saved = true
      }
    }

    const nextStatus: 'idle' | 'paused' = elapsedTime > 0 ? 'paused' : 'idle'
    const nextDisplay = formatDuration(elapsedTime)

    setStatus(nextStatus)
  lastStatusRef.current = nextStatus
    setDisplay(nextDisplay)

    window.electronAPI.updateTimerState({
      status: nextStatus,
      elapsedTime,
      display: nextDisplay,
      task,
      updatedAt: Date.now(),
    })

    return saved
  }, [elapsedTime, task])

  // Listen for timer commands from menubar
  useEffect(() => {
    const handleCommand = (command: string) => {
      if (command === 'start') {
        start()
      } else if (command === 'pause') {
        pause()
      } else if (command === 'stop') {
        void stop()
      }
    }

    const unsubscribe = window.electronAPI.onTimerCommand(handleCommand)
    return () => {
      unsubscribe?.()
    }
  }, [start, pause, stop])

  return {
    status,
    elapsedTime,
    display,
    task,
    setTaskContext,
    start,
    pause,
    stop,
  }
}
