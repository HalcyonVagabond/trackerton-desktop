// Note: useTimer is now provided via TimerContext - use `import { useTimer } from '../context/TimerContext'`
// This re-export is for backward compatibility only
export { useTimer } from '../context/TimerContext'
export { useOrganizations } from './useOrganizations'
export { useProjects } from './useProjects'
export { useTasks } from './useTasks'
export { useTheme } from './useTheme'
export { useAutoPause, IDLE_THRESHOLD_OPTIONS, type AutoPauseSettings } from './useAutoPause'
