import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

console.log('Main process starting...')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log('__dirname:', __dirname)

// Import database and IPC handlers (CommonJS modules)
// @ts-ignore - CommonJS modules without type definitions
import initializeDatabase from '../db/initDb.cjs'
console.log('initializeDatabase imported')
// @ts-ignore
import registerOrganizationHandlers from '../ipcHandlers/organizationHandlers.cjs'
console.log('registerOrganizationHandlers imported')
// @ts-ignore
import registerProjectHandlers from '../ipcHandlers/projectHandlers.cjs'
console.log('registerProjectHandlers imported')
// @ts-ignore
import registerTaskHandlers from '../ipcHandlers/taskHandlers.cjs'
console.log('registerTaskHandlers imported')
// @ts-ignore
import registerTimeEntryHandlers from '../ipcHandlers/timeEntryHandlers.cjs'
// @ts-ignore
import TimeEntryController from '../controllers/timeEntryController.cjs'
console.log('All imports complete')

// Custom property for tracking app quit state
let isQuitting = false

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

// Request single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let tray: Tray | null = null
let menuBarWindow: BrowserWindow | null = null // Small popup from menu bar
let mainWindow: BrowserWindow | null = null // Full application window
let currentTheme = 'light' // Track current theme

/**
 * Timer State Management
 * 
 * The main process is the single source of truth for timer state.
 * This ensures accurate timing even when renderer windows are throttled.
 * 
 * Key concepts:
 * - elapsedTime: Total seconds on the current timer session
 * - lastSavedElapsed: The elapsedTime value at which we last saved to the database
 * - Unsaved time = elapsedTime - lastSavedElapsed
 * 
 * Time is saved to the database:
 * 1. By frontend auto-save every 15 seconds (frontend notifies main via updateTimerSavedElapsed)
 * 2. By main process on app quit (saves any remaining unsaved time)
 * 3. By frontend on explicit stop() call
 */
let timerState: {
  status: 'idle' | 'running' | 'paused';
  elapsedTime: number;
  display: string;
  task: any;
  updatedAt: number;
  source: string;
  startTimeRef: number; // When the timer was started (used to calculate elapsed time)
  lastSavedElapsed: number; // Last elapsed time that was saved to the database
} = {
  status: 'idle',
  elapsedTime: 0,
  display: '00:00:00',
  task: null,
  updatedAt: Date.now(),
  source: 'main',
  startTimeRef: 0,
  lastSavedElapsed: 0,
}

// Timer state persistence
let timerStateFilePath: string | null = null

function getTimerStateFilePath(): string {
  if (!timerStateFilePath) {
    timerStateFilePath = path.join(app.getPath('userData'), 'timer-state.json')
  }
  return timerStateFilePath
}

function loadTimerState() {
  try {
    const filePath = getTimerStateFilePath()
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      const elapsedTime = typeof parsed.elapsedTime === 'number' ? parsed.elapsedTime : 0
      // Restore timer state but set status to paused if it was running
      // (since we don't want to auto-resume on app restart)
      // IMPORTANT: lastSavedElapsed should equal elapsedTime on restore because
      // the previous session saved any unsaved time before quitting
      return {
        status: parsed.status === 'running' ? 'paused' : (parsed.status || 'idle'),
        elapsedTime,
        display: parsed.display || '00:00:00',
        task: parsed.task || null,
        updatedAt: Date.now(),
        source: 'main',
        startTimeRef: 0,
        lastSavedElapsed: elapsedTime, // Match elapsed since previous quit saved it
      }
    }
  } catch (error) {
    console.error('Failed to load timer state:', error)
  }
  return null
}

function saveTimerState() {
  try {
    const stateToSave = {
      status: timerState.status,
      elapsedTime: timerState.elapsedTime,
      display: timerState.display,
      task: timerState.task,
      lastSavedElapsed: timerState.lastSavedElapsed,
    }
    fs.writeFileSync(getTimerStateFilePath(), JSON.stringify(stateToSave, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save timer state:', error)
  }
}

// Main process timer - runs in Node.js, never throttled even when windows are hidden
let mainProcessTimerInterval: NodeJS.Timeout | null = null

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function startMainProcessTimer() {
  if (mainProcessTimerInterval) {
    clearInterval(mainProcessTimerInterval)
  }
  
  // Set the reference point for calculating elapsed time
  timerState.startTimeRef = Date.now() - (timerState.elapsedTime * 1000)
  
  mainProcessTimerInterval = setInterval(() => {
    if (timerState.status === 'running') {
      const now = Date.now()
      const elapsed = Math.max(0, Math.floor((now - timerState.startTimeRef) / 1000))
      timerState.elapsedTime = elapsed
      timerState.display = formatDuration(elapsed)
      timerState.updatedAt = now
      
      broadcastTimerState()
      updateTrayTitle()
    }
  }, 1000)
}

function stopMainProcessTimer() {
  if (mainProcessTimerInterval) {
    clearInterval(mainProcessTimerInterval)
    mainProcessTimerInterval = null
  }
}

const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

function broadcastTimerState() {
  if (menuBarWindow && !menuBarWindow.isDestroyed()) {
    menuBarWindow.webContents.send('timer-state', timerState)
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('timer-state', timerState)
  }
}

ipcMain.on('timer-state-update', (_event, state) => {
  const previousStatus = timerState.status
  
  timerState = {
    ...timerState,
    ...state,
    source: 'main',
    updatedAt: state?.updatedAt ?? Date.now(),
  }
  
  // Handle timer start/stop in main process
  if (state.status === 'running' && previousStatus !== 'running') {
    // Starting the timer - initialize start time reference
    timerState.startTimeRef = Date.now() - (timerState.elapsedTime * 1000)
    startMainProcessTimer()
  } else if (state.status !== 'running' && previousStatus === 'running') {
    // Stopping or pausing the timer
    stopMainProcessTimer()
  }
  
  // Persist timer state to disk (for app restart recovery)
  saveTimerState()
  
  broadcastTimerState()
  updateTrayTitle()
})

ipcMain.handle('timer-state-get', () => timerState)

// Update the lastSavedElapsed when frontend confirms a save
ipcMain.on('timer-saved-elapsed-update', (_event, savedElapsed: number) => {
  timerState.lastSavedElapsed = savedElapsed
  saveTimerState()
})

// Theme management
ipcMain.on('theme-change', (_event, theme) => {
  currentTheme = theme
  // Broadcast to all windows
  if (menuBarWindow && !menuBarWindow.isDestroyed()) {
    menuBarWindow.webContents.send('theme-change', theme)
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-change', theme)
  }
})

ipcMain.handle('get-theme', () => currentTheme)

// Selection state - persisted across windows and app restarts
let selectionStateFilePath: string | null = null

function getSelectionStateFilePath(): string {
  if (!selectionStateFilePath) {
    selectionStateFilePath = path.join(app.getPath('userData'), 'selection-state.json')
  }
  return selectionStateFilePath
}

function loadSelectionState(): { organizationId: number | null; projectId: number | null; taskId: number | null } {
  try {
    const filePath = getSelectionStateFilePath()
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(data)
      return {
        organizationId: typeof parsed.organizationId === 'number' ? parsed.organizationId : null,
        projectId: typeof parsed.projectId === 'number' ? parsed.projectId : null,
        taskId: typeof parsed.taskId === 'number' ? parsed.taskId : null,
      }
    }
  } catch (error) {
    console.error('Failed to load selection state:', error)
  }
  return { organizationId: null, projectId: null, taskId: null }
}

function saveSelectionState() {
  try {
    fs.writeFileSync(getSelectionStateFilePath(), JSON.stringify(selectionState, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save selection state:', error)
  }
}

let selectionState = { organizationId: null as number | null, projectId: null as number | null, taskId: null as number | null }

function broadcastSelectionState() {
  if (menuBarWindow && !menuBarWindow.isDestroyed()) {
    menuBarWindow.webContents.send('selection-state', selectionState)
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('selection-state', selectionState)
  }
}

ipcMain.on('selection-state-update', (_event, state) => {
  selectionState = {
    organizationId: state.organizationId ?? null,
    projectId: state.projectId ?? null,
    taskId: state.taskId ?? null,
  }
  saveSelectionState()
  broadcastSelectionState()
})

ipcMain.handle('selection-state-get', () => selectionState)

ipcMain.on('timer-command', (_event, command) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('timer-command-execute', command)
  }
})

// Create the small menu bar popup window
function createMenuBarWindow() {
  menuBarWindow = new BrowserWindow({
    width: 340,
    height: 480,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload,
      contextIsolation: true,
    },
  })

  // TODO: Create separate entry point for menuBarPopup
  // For now, load the same page - we'll add routing or separate build later
  if (VITE_DEV_SERVER_URL) {
    menuBarWindow.loadURL(`${VITE_DEV_SERVER_URL}#/menubar`)
  } else {
    menuBarWindow.loadFile(indexHtml, { hash: '/menubar' })
  }

  menuBarWindow.webContents.once('did-finish-load', () => {
    broadcastTimerState()
  })

  menuBarWindow.on('blur', () => {
    if (menuBarWindow && !menuBarWindow.isDestroyed() && !menuBarWindow.webContents.isDevToolsOpened()) {
      menuBarWindow.hide()
    }
  })
}

// Create the main application window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    show: false,
    icon: path.join(__dirname, '../assets', 'logo-icon-white-bg.png'),
    webPreferences: {
      preload,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    mainWindow.webContents.openDevTools()
    // Surface the main window automatically in development
    mainWindow.once('ready-to-show', () => {
      mainWindow!.show()
      mainWindow!.focus()
    })
  } else {
    mainWindow.loadFile(indexHtml)
  }

  mainWindow.webContents.once('did-finish-load', () => {
    broadcastTimerState()
  })

  mainWindow.on('close', (event) => {
    // Don't quit the app, just hide the window
    if (!isQuitting) {
      event.preventDefault()
      mainWindow!.hide()
    }
  })
}

function updateTrayTitle() {
  if (!tray || tray.isDestroyed()) return;
  
  if (timerState.status === 'running' || timerState.status === 'paused') {
    const statusIcon = timerState.status === 'running' ? '●' : '❚❚';
    tray.setTitle(` ${statusIcon} ${timerState.display}`)
  } else {
    tray.setTitle('')
  }
}

function createTray() {
  // Use the Trackerton icon for macOS menu bar with Retina support
  const icon1xPath = path.join(__dirname, '../assets', 'iconTemplate.png')
  const icon2xPath = path.join(__dirname, '../assets', 'iconTemplate@2x.png')
  
  // Create image with multiple resolutions for Retina displays
  const trayIcon = nativeImage.createFromPath(icon1xPath)
  const icon2x = nativeImage.createFromPath(icon2xPath)
  trayIcon.addRepresentation({
    scaleFactor: 2.0,
    width: 36,
    height: 36,
    buffer: icon2x.toPNG(),
  })
  
  tray = new Tray(trayIcon)
  tray.setToolTip('Trackerton - Time Tracking')
  
  // On macOS, left-click toggles the popup, right-click shows context menu
  tray.on('click', () => {
    toggleMenuBarWindow()
  })

  tray.on('right-click', () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Trackerton',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Show Quick Access',
        click: () => showMenuBarWindow(),
      },
      {
        label: 'Open Main Window',
        click: () => showMainWindow(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ])
    tray!.popUpContextMenu(contextMenu)
  })
  
  console.log('✓ Tray icon added to the menu bar')
}

function toggleMenuBarWindow() {
  if (!menuBarWindow || menuBarWindow.isDestroyed()) {
    createMenuBarWindow()
  }
  
  if (menuBarWindow!.isVisible()) {
    menuBarWindow!.hide()
  } else {
    showMenuBarWindow()
  }
}

function showMenuBarWindow() {
  if (!menuBarWindow || menuBarWindow.isDestroyed()) {
    createMenuBarWindow()
  }
  
  if (!tray || tray.isDestroyed()) return
  
  const trayBounds = tray.getBounds()
  const windowBounds = menuBarWindow!.getBounds()

  // Position window near tray icon
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
  const y = Math.round(trayBounds.y + trayBounds.height + 4)

  menuBarWindow!.setPosition(x, y, false)
  menuBarWindow!.show()
  menuBarWindow!.focus()
  
  console.log('Menu bar popup shown at position:', { x, y })
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
  }
  mainWindow!.show()
  mainWindow!.focus()
  console.log('Main window shown')
}

app.whenReady().then(async () => {
  console.log('app.whenReady() called')
  
  try {
    // Load persisted selection state now that app is ready
    console.log('Loading selection state...')
    selectionState = loadSelectionState()
    console.log('Selection state loaded:', selectionState)
    
    // Load persisted timer state (if any)
    console.log('Loading timer state...')
    const savedTimerState = loadTimerState()
    console.log('Timer state loaded:', savedTimerState)
    if (savedTimerState) {
      timerState = savedTimerState
      // If timer had a task, make sure selection state matches
      if (savedTimerState.task) {
        const task = savedTimerState.task
        if (task.organization_id || task.project_id || task.id) {
          selectionState = {
            organizationId: task.organization_id ?? selectionState.organizationId,
            projectId: task.project_id ?? selectionState.projectId,
            taskId: task.id ?? selectionState.taskId,
          }
          saveSelectionState()
        }
      }
    }
    
    console.log('Initializing database...')
    await initializeDatabase()
    console.log('Database initialized')
    
    registerOrganizationHandlers()
    registerProjectHandlers()
    registerTaskHandlers()
    registerTimeEntryHandlers()
    console.log('Handlers registered')
  } catch (error) {
    console.error('Error during startup:', error)
  }

  // Handle opening main window from menu bar popup
  ipcMain.on('open-main-window', () => {
    showMainWindow()
  })

  // Set dock icon for macOS
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(path.join(__dirname, '../assets', 'logo-icon-white-bg.png'))
    app.dock.setIcon(dockIcon)
  }

  createTray()
  createMenuBarWindow() // Small popup
  createMainWindow() // Full window
  
  // Show a notification to confirm the app is running
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'Trackerton Started',
      body: 'Click the menu bar icon to get started!',
    })
    notification.show()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMenuBarWindow()
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the tray
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('second-instance', () => {
  if (mainWindow) {
    // Focus on the main window if the user tried to open another
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

app.on('before-quit', async () => {
  isQuitting = true
  
  // Save any unsaved time entry before quitting
  if (timerState.task && timerState.elapsedTime > timerState.lastSavedElapsed) {
    const unsavedDuration = timerState.elapsedTime - timerState.lastSavedElapsed
    if (unsavedDuration > 0) {
      try {
        await TimeEntryController.createTimeEntry(
          timerState.task.id,
          unsavedDuration,
          new Date().toISOString()
        )
        timerState.lastSavedElapsed = timerState.elapsedTime
        console.log(`Saved ${unsavedDuration} seconds on quit for task ${timerState.task.id}`)
      } catch (error) {
        console.error('Failed to save time entry on quit:', error)
      }
    }
  }
  
  // Save timer state before quitting
  saveTimerState()
})

// Clean up on exit
app.on('will-quit', () => {
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
  }
})

