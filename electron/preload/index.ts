import { ipcRenderer, contextBridge, type IpcRendererEvent } from 'electron'

// IPC Channel constants
const ipcChannels = {
  GET_ORGANIZATIONS: 'get-organizations',
  ADD_ORGANIZATION: 'add-organization',
  UPDATE_ORGANIZATION: 'update-organization',
  DELETE_ORGANIZATION: 'delete-organization',
  GET_PROJECTS: 'get-projects',
  ADD_PROJECT: 'add-project',
  UPDATE_PROJECT: 'update-project',
  DELETE_PROJECT: 'delete-project',
  GET_TASKS: 'get-tasks',
  ADD_TASK: 'add-task',
  UPDATE_TASK: 'update-task',
  DELETE_TASK: 'delete-task',
  SAVE_TIME_ENTRY: 'save-time-entry',
  GET_TIME_ENTRIES: 'get-time-entries',
  UPDATE_TIME_ENTRY: 'update-time-entry',
  DELETE_TIME_ENTRY: 'delete-time-entry',
  GET_LATEST_TIME_ENTRY: 'get-latest-time-entry',
  GET_TOTAL_DURATION_BY_TASK: 'get-total-duration-by-task',
  TOGGLE_DARK_MODE: 'toggle-dark-mode',
  UPDATE_TIMER_STATE: 'timer-state-update',
  GET_TIMER_STATE: 'timer-state-get',
  TIMER_STATE: 'timer-state',
  SEND_TIMER_COMMAND: 'timer-command',
  EXECUTE_TIMER_COMMAND: 'timer-command-execute',
  OPEN_MAIN_WINDOW: 'open-main-window',
  THEME_CHANGE: 'theme-change',
  GET_THEME: 'get-theme',
  UPDATE_SELECTION_STATE: 'selection-state-update',
  GET_SELECTION_STATE: 'selection-state-get',
  SELECTION_STATE: 'selection-state',
}

// Expose Trackerton API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Organizations
  getOrganizations: (statusFilter?: string) => ipcRenderer.invoke(ipcChannels.GET_ORGANIZATIONS, statusFilter),
  addOrganization: (name: string, status = 'active') => ipcRenderer.invoke(ipcChannels.ADD_ORGANIZATION, { name, status }),
  updateOrganization: (id: number, data: { name?: string; status?: string }) => ipcRenderer.invoke(ipcChannels.UPDATE_ORGANIZATION, { id, data }),
  deleteOrganization: (id: number) => ipcRenderer.invoke(ipcChannels.DELETE_ORGANIZATION, id),

  // Projects
  getProjects: (organizationId: number, statusFilter?: string) => ipcRenderer.invoke(ipcChannels.GET_PROJECTS, { organizationId, statusFilter }),
  addProject: (name: string, organizationId: number, description?: string, status = 'in_progress') => ipcRenderer.invoke(ipcChannels.ADD_PROJECT, { name, organizationId, description, status }),
  updateProject: (id: number, data: { name?: string; description?: string; status?: string }) => ipcRenderer.invoke(ipcChannels.UPDATE_PROJECT, { id, data }),
  deleteProject: (id: number) => ipcRenderer.invoke(ipcChannels.DELETE_PROJECT, id),

  // Tasks
  getTasks: (projectId: number, statusFilter?: string) => ipcRenderer.invoke(ipcChannels.GET_TASKS, { projectId, statusFilter }),
  addTask: (name: string, projectId: number, description?: string, status = 'todo') => ipcRenderer.invoke(ipcChannels.ADD_TASK, { name, projectId, description, status }),
  updateTask: (id: number, data: { name?: string; description?: string; status?: string }) => ipcRenderer.invoke(ipcChannels.UPDATE_TASK, { id, data }),
  deleteTask: (id: number) => ipcRenderer.invoke(ipcChannels.DELETE_TASK, id),

  // Time Entries
  saveTimeEntry: (data: any) => ipcRenderer.send(ipcChannels.SAVE_TIME_ENTRY, data),
  getTimeEntries: (filter: any) => ipcRenderer.invoke(ipcChannels.GET_TIME_ENTRIES, filter),
  updateTimeEntry: (id: number, data: { duration?: number; timestamp?: string; notes?: string }) => ipcRenderer.invoke(ipcChannels.UPDATE_TIME_ENTRY, { id, ...data }),
  deleteTimeEntry: (id: number) => ipcRenderer.invoke(ipcChannels.DELETE_TIME_ENTRY, id),
  getLatestTimeEntry: (taskId: number) => ipcRenderer.invoke(ipcChannels.GET_LATEST_TIME_ENTRY, taskId),
  getTotalDurationByTask: (taskId: number) => ipcRenderer.invoke(ipcChannels.GET_TOTAL_DURATION_BY_TASK, taskId),

  // Dark Mode
  onToggleDarkMode: (callback: (event: any, ...args: any[]) => void) => ipcRenderer.on(ipcChannels.TOGGLE_DARK_MODE, callback),
  
  // Theme Management
  sendThemeChange: (theme: string) => ipcRenderer.send(ipcChannels.THEME_CHANGE, theme),
  getTheme: () => ipcRenderer.invoke(ipcChannels.GET_THEME),
  onThemeChange: (callback: (theme: string) => void) => ipcRenderer.on(ipcChannels.THEME_CHANGE, (_event, theme) => callback(theme)),
  
  // Window Management
  openMainWindow: () => ipcRenderer.send(ipcChannels.OPEN_MAIN_WINDOW),
  resizeMenuBarWindow: (width: number, height: number) => ipcRenderer.send('resize-menubar-window', { width, height }),

  // Timer state sharing between windows
  updateTimerState: (state: any) => ipcRenderer.send(ipcChannels.UPDATE_TIMER_STATE, state),
  requestTimerState: () => ipcRenderer.invoke(ipcChannels.GET_TIMER_STATE),
  onTimerState: (callback: (state: any) => void) => {
    const listener = (_event: IpcRendererEvent, state: any) => callback(state)
    ipcRenderer.on(ipcChannels.TIMER_STATE, listener)
    return () => {
      ipcRenderer.removeListener(ipcChannels.TIMER_STATE, listener)
    }
  },
  updateTimerSavedElapsed: (savedElapsed: number) => ipcRenderer.send('timer-saved-elapsed-update', savedElapsed),
  sendTimerCommand: (command: string) => ipcRenderer.send(ipcChannels.SEND_TIMER_COMMAND, command),
  onTimerCommand: (callback: (command: string) => void) => {
    const listener = (_event: IpcRendererEvent, command: string) => callback(command)
    ipcRenderer.on(ipcChannels.EXECUTE_TIMER_COMMAND, listener)
    return () => {
      ipcRenderer.removeListener(ipcChannels.EXECUTE_TIMER_COMMAND, listener)
    }
  },

  // Selection state sharing between windows (persisted in main process)
  updateSelectionState: (state: { organizationId: number | null; projectId: number | null; taskId: number | null }) => 
    ipcRenderer.send(ipcChannels.UPDATE_SELECTION_STATE, state),
  requestSelectionState: () => ipcRenderer.invoke(ipcChannels.GET_SELECTION_STATE),
  onSelectionState: (callback: (state: { organizationId: number | null; projectId: number | null; taskId: number | null }) => void) => {
    const listener = (_event: IpcRendererEvent, state: any) => callback(state)
    ipcRenderer.on(ipcChannels.SELECTION_STATE, listener)
    return () => {
      ipcRenderer.removeListener(ipcChannels.SELECTION_STATE, listener)
    }
  },
})


// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child)
    }
  },
}

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}

setTimeout(removeLoading, 4999)