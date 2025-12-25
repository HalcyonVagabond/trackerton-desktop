import { useState, useEffect, useCallback, useRef } from 'react'

export type AutoPauseSettings = {
  enabled: boolean
  idleThreshold: number // in seconds
}

const STORAGE_KEY = 'trackerton-auto-pause-settings'
const DEFAULT_SETTINGS: AutoPauseSettings = {
  enabled: false,
  idleThreshold: 300, // 5 minutes default
}

// Idle threshold options in seconds
export const IDLE_THRESHOLD_OPTIONS = [
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' },
]

export function useAutoPause(
  isRunning: boolean,
  onAutoPause: () => void
) {
  const [settings, setSettings] = useState<AutoPauseSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load auto-pause settings:', e)
    }
    return DEFAULT_SETTINGS
  })

  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasAutoPausedRef = useRef(false)

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('Failed to save auto-pause settings:', e)
    }
  }, [settings])

  // Reset auto-pause flag when timer starts
  useEffect(() => {
    if (isRunning) {
      hasAutoPausedRef.current = false
    }
  }, [isRunning])

  // Check idle time periodically when timer is running
  useEffect(() => {
    if (!settings.enabled || !isRunning) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
      return
    }

    const checkIdleTime = async () => {
      try {
        const idleTime = await (window as any).electronAPI?.getSystemIdleTime?.()
        if (idleTime !== undefined && idleTime >= settings.idleThreshold && !hasAutoPausedRef.current) {
          hasAutoPausedRef.current = true
          // Show notification before pausing
          ;(window as any).electronAPI?.showNotification?.('Trackerton', 'Timer auto-paused due to inactivity')
          onAutoPause()
        }
      } catch (e) {
        console.error('Failed to get system idle time:', e)
      }
    }

    // Check every 10 seconds
    checkIntervalRef.current = setInterval(checkIdleTime, 10000)
    // Also check immediately
    checkIdleTime()

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
    }
  }, [settings.enabled, settings.idleThreshold, isRunning, onAutoPause])

  const updateSettings = useCallback((updates: Partial<AutoPauseSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const toggleEnabled = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }))
  }, [])

  return {
    settings,
    updateSettings,
    toggleEnabled,
  }
}
