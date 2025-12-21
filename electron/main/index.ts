import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Import database and IPC handlers (CommonJS modules)
// @ts-ignore - CommonJS modules without type definitions
import initializeDatabase from '../db/initDb.cjs'
// @ts-ignore
import registerOrganizationHandlers from '../ipcHandlers/organizationHandlers.cjs'
// @ts-ignore
import registerProjectHandlers from '../ipcHandlers/projectHandlers.cjs'
// @ts-ignore
import registerTaskHandlers from '../ipcHandlers/taskHandlers.cjs'
// @ts-ignore
import registerTimeEntryHandlers from '../ipcHandlers/timeEntryHandlers.cjs'

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
let timerState = {
  status: 'idle',
  elapsedTime: 0,
  display: '00:00:00',
  task: null,
  updatedAt: Date.now(),
  source: 'main',
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
  timerState = {
    ...timerState,
    ...state,
    source: 'main',
    updatedAt: state?.updatedAt ?? Date.now(),
  }
  broadcastTimerState()
  updateTrayTitle()
})

ipcMain.handle('timer-state-get', () => timerState)

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
  await initializeDatabase()
  registerOrganizationHandlers()
  registerProjectHandlers()
  registerTaskHandlers()
  registerTimeEntryHandlers()

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

app.on('before-quit', () => {
  isQuitting = true
})

// Clean up on exit
app.on('will-quit', () => {
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
  }
})

