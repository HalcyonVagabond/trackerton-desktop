// Type definitions for Electron API exposed via contextBridge

// Status types
export type OrganizationStatus = 'active' | 'inactive' | 'archived'
export type ProjectStatus = 'in_progress' | 'on_hold' | 'completed' | 'archived'
export type TaskStatus = 'todo' | 'in_progress' | 'on_hold' | 'completed' | 'archived'

export interface Organization {
  id: number
  name: string
  status?: OrganizationStatus
  created_at?: string
}

export interface Project {
  id: number
  name: string
  description?: string
  status?: ProjectStatus
  organization_id: number
  created_at?: string
}

export interface Task {
  id: number
  name: string
  description?: string | null
  status?: TaskStatus
  project_id: number
  organization_id?: number
  created_at?: string
}

export interface TimeEntry {
  id: number
  task_id: number
  duration: number
  timestamp: string
  notes?: string | null
  created_at?: string
}

export interface TimerState {
  status: 'idle' | 'running' | 'paused'
  elapsedTime: number
  display: string
  task: Task | null
  updatedAt: number
  source: string
  /** The elapsed time value at which we last saved to the database */
  lastSavedElapsed?: number
}

export interface SelectionState {
  organizationId: number | null
  projectId: number | null
  taskId: number | null
}

export interface ElectronAPI {
  // Organizations
  getOrganizations: (statusFilter?: OrganizationStatus) => Promise<Organization[]>
  addOrganization: (name: string, status?: OrganizationStatus) => Promise<Organization>
  updateOrganization: (id: number, data: { name?: string; status?: OrganizationStatus }) => Promise<void>
  deleteOrganization: (id: number) => Promise<void>

  // Projects
  getProjects: (organizationId: number, statusFilter?: ProjectStatus) => Promise<Project[]>
  addProject: (name: string, organizationId: number, description?: string, status?: ProjectStatus) => Promise<Project>
  updateProject: (id: number, data: { name?: string; description?: string; status?: ProjectStatus }) => Promise<void>
  deleteProject: (id: number) => Promise<void>

  // Tasks
  getTasks: (projectId: number, statusFilter?: TaskStatus) => Promise<Task[]>
  addTask: (name: string, projectId: number, description?: string, status?: TaskStatus) => Promise<Task>
  updateTask: (id: number, data: { name?: string; description?: string; status?: TaskStatus }) => Promise<void>
  deleteTask: (id: number) => Promise<void>

  // Time Entries
  saveTimeEntry: (data: Partial<TimeEntry>) => void
  getTimeEntries: (filter: any) => Promise<TimeEntry[]>
  updateTimeEntry: (id: number, data: { duration?: number; timestamp?: string; notes?: string }) => Promise<void>
  deleteTimeEntry: (id: number) => Promise<void>
  getLatestTimeEntry: (taskId: number) => Promise<TimeEntry | null>
  getTotalDurationByTask: (taskId: number) => Promise<number>

  // Theme Management
  sendThemeChange: (theme: 'light' | 'dark') => void
  getTheme: () => Promise<'light' | 'dark'>
  onThemeChange: (callback: (theme: string) => void) => void

  // Window Management
  openMainWindow: () => void
  resizeMenuBarWindow: (width: number, height: number) => void

  // Timer state sharing between windows
  updateTimerState: (state: Partial<TimerState>) => void
  requestTimerState: () => Promise<TimerState>
  onTimerState: (callback: (state: TimerState) => void) => (() => void) | void
  updateTimerSavedElapsed: (savedElapsed: number) => void
  sendTimerCommand: (command: 'start' | 'pause' | 'stop') => void
  onTimerCommand: (callback: (command: string) => void) => (() => void) | void

  // Selection state sharing between windows (persisted in main process)
  updateSelectionState: (state: SelectionState) => void
  requestSelectionState: () => Promise<SelectionState>
  onSelectionState: (callback: (state: SelectionState) => void) => (() => void) | void

  // System idle time for auto-pause feature
  getSystemIdleTime: () => Promise<number>

  // System notifications
  showNotification: (title: string, body: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
