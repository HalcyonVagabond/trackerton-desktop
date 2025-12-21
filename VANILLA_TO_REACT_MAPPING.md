# Vanilla JS to React Conversion Mapping

## HTML Views (3 total)

### 1. **index.html** (Main Window)
**Location:** `trackerton-desktop/src/views/index.html`
**Purpose:** Main time tracking interface
**React Status:** ✅ Converted to `src/App.tsx`

**Features:**
- Organization/Project/Task dropdowns with "⋯" action menus
- Timer display (elapsed time)
- Start/Stop/Resume buttons
- Settings modal (theme toggle)
- "Task Management" button to open org view window
- Aggregated data display (currently unused)

---

### 2. **menuBarPopup.html** (Menu Bar Tray)
**Location:** `trackerton-desktop/src/views/menuBarPopup.html`
**Purpose:** Quick access popup from menu bar tray icon
**React Status:** ❌ NOT YET CONVERTED

**Features:**
- Shows current task name (e.g., "Create Follow Up Sequence · Hubspot Sequences")
- Timer display (synced with main window)
- Status badge (Running/Paused/Idle)
- Start/Stop buttons
- "Open Main Window" button
- Prompt when no task selected: "Select a task in the main window to control the timer from here"

**JavaScript:** `src/renderer/menuBarPopup.js`
- Syncs timer state via IPC
- Updates status badge styling based on timer state
- Shows/hides controls based on task selection
- Handles start/stop/resume from tray

---

### 3. **organizationView.html** (Task Management Window)
**Location:** `trackerton-desktop/src/views/organizationView.html`
**Purpose:** Full project/task management view with time entry editing
**React Status:** ❌ NOT YET CONVERTED

**Features:**
- Organization selector dropdown in header
- "Back" button to return to main window
- **Sidebar:** Projects list for selected org (shows project names, can expand to show tasks)
- **Main Panel:** 
  - Selected project header with time stats
  - Project description (editable)
  - Task list with:
    - Task name
    - Total time per task
    - Expand to show individual time entries
  - Time entry details:
    - Duration (editable)
    - First started / Last worked timestamps (editable)
    - Number of entries
- **Edit Modal:**
  - Can edit task names
  - Can edit project descriptions
  - Can edit time entry durations (hours/minutes/seconds inputs)
  - Can edit timestamps
- **Empty States:**
  - No projects: "📁 No Projects - Select an organization to view projects"
  - No project selected: "👈 Select a Project"

**JavaScript:** 
- `src/renderer/organizationWorkPage/organizationView.js` (entry point)
- `src/renderer/organizationWorkPage/organizationViewSetup.js` (main logic)

---

## JavaScript Modules (9 files)

### Core Renderer Files

#### 1. **renderer.js** (Entry Point)
**Location:** `trackerton-desktop/src/renderer.js`
**React Status:** ✅ Replaced by `src/main.tsx`

Imports and initializes:
- `renderer/app.js` → `initializeApp()`
- `renderer/themeToggle.js` → Theme listener

---

#### 2. **renderer/app.js**
**Location:** `trackerton-desktop/src/renderer/app.js`
**React Status:** ✅ Logic moved to hooks and App.tsx

**Responsibilities:**
- `initializeApp()`: Main initialization function
- Sets up event listeners
- Loads organizations from DB
- Restores last selected org/project/task from localStorage
- Triggers change events to update UI state

**React Equivalent:**
- `src/App.tsx` - Main component with useEffect hooks
- `src/hooks/useOrganizations.ts` - Loads orgs
- `src/hooks/useProjects.ts` - Loads projects
- `src/hooks/useTasks.ts` - Loads tasks
- localStorage handled in hooks

---

#### 3. **renderer/dataLoader.js**
**Location:** `trackerton-desktop/src/renderer/dataLoader.js`
**React Status:** ✅ Converted to custom hooks

**Functions:**
- `loadOrganizations()` → `useOrganizations` hook
- `loadProjects(orgId)` → `useProjects` hook
- `loadTasks(projectId)` → `useTasks` hook
- `loadAggregatedData(taskId)` → Not yet implemented
- `loadProjectsAndTasks(orgId)` → For org view (not converted)
- `saveSelectionState()` → Should be in hooks
- `getSelectionState()` → Should be in hooks
- `restoreSelectionState()` → Should be in hooks

**React Hooks Created:**
- ✅ `src/hooks/useOrganizations.ts`
- ✅ `src/hooks/useProjects.ts`
- ✅ `src/hooks/useTasks.ts`
- ❌ Need to add localStorage persistence to hooks

---

#### 4. **renderer/events.js**
**Location:** `trackerton-desktop/src/renderer/events.js`
**React Status:** ⚠️ Partially converted

**Main Responsibilities:**
- `setupEventListeners()`: Attaches all DOM event listeners
- Handles dropdown changes (org → projects → tasks cascade)
- Shows/hides "⋯" more buttons based on selections
- Shows/hides Edit/Delete options in dropdown menus
- Opens modals for add/edit/delete operations
- Handles "View Organization Work" button click
- Handles settings button click
- Click-outside to close dropdown menus

**React Status:**
- ✅ Dropdown changes handled via `onChange` in App.tsx
- ✅ Menu visibility logic in App.tsx state
- ✅ Settings modal in App.tsx
- ❌ Add/Edit/Delete modals NOT created yet
- ❌ Organization view window NOT implemented

**What's Missing:**
- Generic modal component for add/edit/delete
- IPC calls for CRUD operations
- Organization view window opening

---

#### 5. **renderer/timer.js**
**Location:** `trackerton-desktop/src/renderer/timer.js`
**React Status:** ✅ Converted to `useTimer` hook

**Functions:**
- `startTimer()` → `start()` in useTimer
- `stopTimer()` → `stop()` in useTimer
- `resumeTimer()` → `start()` with existing task
- `saveTimeEntry()` → IPC call (should be in hook)
- `validateSelections()` → Done in App.tsx
- `updateTimerDisplay()` → State update in hook
- `broadcastTimerState()` → IPC to sync windows
- `applyExternalState()` → Listener for timer state changes
- `initializeTimerSync()` → Set up IPC listeners

**React Hook:**
- ✅ `src/hooks/useTimer.ts`
- ✅ Syncs state across windows via IPC
- ✅ Updates display every second when running
- ✅ Handles start/pause/stop
- ⚠️ Need to verify saveTimeEntry IPC call works

---

#### 6. **renderer/modals.js**
**Location:** `trackerton-desktop/src/renderer/modals.js`
**React Status:** ❌ NOT YET CONVERTED

**Responsibilities:**
- `initializeModal()`: Set up generic modal for add/edit/delete
- Shows modal for Organization/Project/Task CRUD
- Validates selections (can't add project without org, etc.)
- Calls IPC functions:
  - `addOrganization(name)`
  - `updateOrganization(id, name)`
  - `deleteOrganization(id)`
  - `addProject(name, orgId)`
  - `updateProject(id, name)`
  - `deleteProject(id)`
  - `addTask(name, projectId)`
  - `updateTask(id, name)`
  - `deleteTask(id)`
- Reloads dropdown after save

**What Needs to be Created:**
- `src/components/GenericModal.tsx` - Reusable modal component
- `src/components/DeleteConfirmModal.tsx` - Delete confirmation
- State management for modal visibility
- IPC calls already exposed in preload

---

#### 7. **renderer/display.js**
**Location:** `trackerton-desktop/src/renderer/display.js`
**React Status:** ⚠️ Not used (aggregation display removed)

**Functions:**
- `aggregateTime(entries)` - Groups time entries
- `displayAggregatedData(data)` - Currently clears div (unused)

**Note:** The vanilla app removed aggregated data display from main window. This is now shown in the Organization View window instead.

---

#### 8. **renderer/themeToggle.js**
**Location:** `trackerton-desktop/src/renderer/themeToggle.js`
**React Status:** ✅ Converted to `useTheme` hook

**Responsibilities:**
- Listen for theme changes via IPC
- Update `data-theme` attribute on `<html>`
- Toggle light/dark theme

**React Hook:**
- ✅ `src/hooks/useTheme.ts`
- ✅ Syncs with system/manual theme changes
- ✅ Updates DOM attribute

---

#### 9. **renderer/menuBarPopup.js**
**Location:** `trackerton-desktop/src/renderer/menuBarPopup.js`
**React Status:** ❌ NOT YET CONVERTED

**Responsibilities:**
- Displays current timer state in tray popup
- Shows current task name and project
- Updates timer display every second
- Shows status badge (Running/Paused/Idle)
- Handles Start/Stop/Resume from tray
- "Open Main Window" button
- Syncs state via IPC with main window

**Needs:**
- New React component: `src/components/MenuBarPopup.tsx`
- Reuse `useTimer` hook for state sync
- Style with menuBarPopup-specific CSS

---

## IPC Channels (Already Exposed in Preload)

### Organizations
- ✅ `window.electronAPI.getOrganizations()`
- ✅ `window.electronAPI.addOrganization(name)`
- ✅ `window.electronAPI.updateOrganization(id, name)`
- ✅ `window.electronAPI.deleteOrganization(id)`

### Projects
- ✅ `window.electronAPI.getProjects(organizationId)`
- ✅ `window.electronAPI.addProject(name, organizationId)`
- ✅ `window.electronAPI.updateProject(id, name)`
- ✅ `window.electronAPI.deleteProject(id)`

### Tasks
- ✅ `window.electronAPI.getTasks(projectId)`
- ✅ `window.electronAPI.addTask(name, projectId)`
- ✅ `window.electronAPI.updateTask(id, name)`
- ✅ `window.electronAPI.deleteTask(id)`

### Time Entries
- ✅ `window.electronAPI.getTimeEntries(filter)`
- ✅ `window.electronAPI.saveTimeEntry(entry)`
- ✅ `window.electronAPI.updateTimeEntry(id, updates)`
- ✅ `window.electronAPI.deleteTimeEntry(id)`
- ✅ `window.electronAPI.getTotalDurationByTask(taskId)`

### Timer State Sync
- ✅ `window.electronAPI.updateTimerState(state)`
- ✅ `window.electronAPI.onTimerState(callback)`
- ✅ `window.electronAPI.requestTimerState()`
- ✅ `window.electronAPI.onTimerCommand(callback)`

### Theme
- ✅ `window.electronAPI.getTheme()`
- ✅ `window.electronAPI.sendThemeChange(theme)`
- ✅ `window.electronAPI.onThemeChange(callback)`

---

## Conversion Priority

### HIGH PRIORITY (Core functionality)
1. ✅ **Main window UI** - App.tsx with Victorian styles
2. ✅ **Timer functionality** - useTimer hook
3. ✅ **Dropdowns with data loading** - useOrganizations/Projects/Tasks
4. ❌ **Add/Edit/Delete modals** - GenericModal component
5. ❌ **Menu bar popup** - MenuBarPopup component

### MEDIUM PRIORITY (Secondary windows)
6. ❌ **Organization View window** - Full task management interface
7. ❌ **localStorage persistence** - Save/restore selections

### LOW PRIORITY (Enhancements)
8. ❌ **Time entry editing** - In org view
9. ❌ **Project descriptions** - In org view
10. ❌ **Empty states** - Better UX messaging

---

## Current Status Summary

### ✅ Completed
- Main window UI with Victorian theme
- Timer display and controls
- Organization/Project/Task dropdowns
- Theme toggle (light/dark)
- IPC integration for data loading
- Custom React hooks for state management

### ❌ Not Yet Implemented
- **Add/Edit/Delete modals** - No CRUD operations yet
- **Menu bar tray popup** - Separate React component needed
- **Organization View window** - Task management interface
- **localStorage persistence** - Selections not saved across sessions
- **Time entry editing** - Can't modify existing time entries

### ⚠️ Partially Implemented
- Timer state sync (works, but saveTimeEntry needs testing)
- Dropdown action menus (UI exists, but modals not connected)

---

## Next Steps

1. **Create GenericModal component** for add/edit operations
2. **Create DeleteConfirmModal component** for delete confirmations
3. **Wire up modal actions** to IPC calls
4. **Add localStorage** to hooks for persistence
5. **Create MenuBarPopup component** for tray
6. **Create OrganizationView component** for task management window
7. **Test all CRUD operations** end-to-end
