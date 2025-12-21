// Type definitions for Electron API exposed via contextBridge

export interface Organization {
  id: number
  name: string
  created_at?: string
}

export interface Project {
  id: number
  name: string
  description?: string
  organization_id: number
  created_at?: string
}

export interface Task {
  id: number
  name: string
  project_id: number
  organization_id?: number
  created_at?: string
}

export interface TimeEntry {
  id: number
  task_id: number
  duration: number
  timestamp: string
  created_at?: string
}

export interface TimerState {
  status: 'idle' | 'running' | 'paused'
  elapsedTime: number
  display: string
  task: Task | null
  updatedAt: number
  source: string
}

export interface ElectronAPI {
  // Organizations
  getOrganizations: () => Promise<Organization[]>
  addOrganization: (name: string) => Promise<Organization>
  updateOrganization: (id: number, name: string) => Promise<void>
  deleteOrganization: (id: number) => Promise<void>

  // Projects
  getProjects: (organizationId: number) => Promise<Project[]>
  addProject: (name: string, organizationId: number) => Promise<Project>
  updateProject: (id: number, name: string, description?: string) => Promise<void>
  deleteProject: (id: number) => Promise<void>

  // Tasks
  getTasks: (projectId: number) => Promise<Task[]>
  addTask: (name: string, projectId: number) => Promise<Task>
  updateTask: (id: number, name: string) => Promise<void>
  deleteTask: (id: number) => Promise<void>

  // Time Entries
  saveTimeEntry: (data: Partial<TimeEntry>) => void
  getTimeEntries: (filter: any) => Promise<TimeEntry[]>
  updateTimeEntry: (id: number, duration: number, timestamp: string) => Promise<void>
  deleteTimeEntry: (id: number) => Promise<void>
  getLatestTimeEntry: (taskId: number) => Promise<TimeEntry | null>
  getTotalDurationByTask: (taskId: number) => Promise<number>

  // Theme Management
  sendThemeChange: (theme: 'light' | 'dark') => void
  getTheme: () => Promise<'light' | 'dark'>
  onThemeChange: (callback: (theme: string) => void) => void

  // Window Management
  openMainWindow: () => void

  // Timer state sharing between windows
  updateTimerState: (state: Partial<TimerState>) => void
  requestTimerState: () => Promise<TimerState>
  onTimerState: (callback: (state: TimerState) => void) => (() => void) | void
  sendTimerCommand: (command: 'start' | 'pause' | 'stop') => void
  onTimerCommand: (callback: (command: string) => void) => (() => void) | void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
