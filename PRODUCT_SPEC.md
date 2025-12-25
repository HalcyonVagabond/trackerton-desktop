# Trackerton - Product Specification

> A beautifully designed desktop time tracking application for macOS built with Electron + React + TypeScript.

---

## Overview

**Trackerton** is a native macOS desktop application designed for freelancers, developers, and professionals who need to track time across multiple organizations, projects, and tasks. It features a clean three-panel interface, menu bar integration, and smart auto-pause functionality.

### Key Value Propositions
- **Hierarchical Organization**: Track time across Organizations → Projects → Tasks
- **Always Accessible**: Menu bar popup for quick timer control without switching apps
- **Smart Auto-Pause**: Automatically pauses when you step away from your computer
- **Beautiful Dark/Light Themes**: Native-feeling UI with system theme support
- **Offline-First**: All data stored locally with SQLite - no account required

---

## Application Architecture

### Technology Stack
- **Framework**: Electron (cross-platform desktop)
- **Frontend**: React 18 + TypeScript
- **Styling**: Custom CSS with CSS variables for theming
- **Database**: SQLite (local, offline-first)
- **Build**: Vite + electron-builder

### Window Types
1. **Main Window** - Full application with three-panel layout
2. **Menu Bar Popup** - Compact timer control accessible from system tray

---

## User Interface

### Theme System
- **Light Mode**: Clean white/gray backgrounds with high contrast
- **Dark Mode**: Deep dark backgrounds (#0d0d0d, #161616) with soft text
- **System Mode**: Automatically follows macOS appearance settings

### Color Palette
```
Primary Accent: #3b82f6 (Blue)
Success/Timer Running: #22c55e (Green)
Warning: #f59e0b (Amber)
Danger: #ef4444 (Red)
Timer Display: #d4a520 (Gold)
```

### Three-Panel Layout

#### Left Panel - Navigation (280px width)
- **Brand Header**: Trackerton logo + settings gear icon
- **Organization Selector**: Dropdown to switch between organizations
- **Status Filters**: Two dropdowns for filtering projects and tasks by status
- **Project Tree**: Expandable list showing projects with nested tasks
  - Projects show: name, status badge, task count
  - Tasks show: name, status badge, active indicator (green dot when timer running)
  - "+ Add Task" button appears when project is expanded

#### Center Panel - Content Area (Flexible width)
- **Timer Bar** (top): Shows "● Timer Running [Task Name]" with elapsed time and Stop button
- **Project Header**: 
  - Editable project name (large heading)
  - Status dropdown (In Progress, On Hold, Completed, Archived)
  - Editable description textarea
- **Project Stats**: Four stat cards showing:
  - Total Time (real-time, updates while timer runs)
  - Total Tasks
  - In Progress count
  - Completed count
- **Task Table**: 
  - Columns: Task Name, Status, Timer (Start/Stop button), Actions (⋮ menu)
  - Active task row has green left border indicator
  - Hover states on rows

#### Right Panel - Task Detail (340px width, collapsible)
- **Task Header**: Name, status badge, edit/delete actions
- **Timer Section**: 
  - Large elapsed time display
  - Total time for task
  - Start/Pause/Stop controls
- **Time Entries List**: 
  - Grouped by date
  - Each entry shows: duration, timestamp, notes
  - Click to edit, hover to delete
- **Add Time Entry Button**: Manual time entry

### Menu Bar Popup (340px × dynamic height)
- **Compact Timer Display**: Task name + elapsed time
- **Quick Controls**: Start/Pause/Resume/Stop buttons
- **Task Selector**: Dropdown showing Organization > Project > Task hierarchy
- **Open Main Window**: Link to open full application
- **Dynamic Height**: Automatically resizes to fit content

---

## Features

### 1. Organization Management
- Create unlimited organizations
- Edit organization name
- **Archive organizations** (soft delete, can be restored)
- **Permanently delete** only from archived state
- Status: Active, Inactive, Archived

### 2. Project Management
- Create projects within organizations
- Edit name and description inline
- Change status: In Progress, On Hold, Completed, Archived
- Filter projects by status
- Real-time total time calculation across all tasks

### 3. Task Management
- Create tasks within projects
- Status workflow: To Do → In Progress → On Hold → Completed → Archived
- Filter tasks by status
- View detailed time entries per task
- Edit/delete tasks with confirmation

### 4. Time Tracking
- **One-click start/stop** from task list or detail panel
- **Timer persists** across window switches and app restarts
- **Pause/Resume** functionality
- **Real-time display** updates every second
- **Time entries** saved with:
  - Duration (seconds)
  - Timestamp
  - Optional notes
- **Manual time entry** for forgotten time
- **Edit existing entries** (duration, notes)
- **Delete entries** with confirmation

### 5. Menu Bar Integration
- **Tray icon** always visible in macOS menu bar
- **Click to show popup** with current timer status
- **Task selection** dropdown for quick switching
- **Start/Stop/Pause** without opening main window
- **Resume** button appears when timer is paused
- **Sync across windows** - changes reflect immediately in main window

### 6. Auto-Pause (Smart Idle Detection)
- **Configurable idle threshold**: 1, 2, 5, 10, 15, or 30 minutes
- **Automatic pause** when system idle time exceeds threshold
- **System notification** when auto-paused: "Timer auto-paused due to inactivity"
- **Enable/disable** from settings menu
- **Settings persist** across app restarts

### 7. Theme Settings
- Access via gear icon in navigation panel
- Three options: Light, Dark, System
- Instant theme switching
- Settings persist across sessions

### 8. Data Persistence
- **SQLite database** stored locally
- **No cloud sync** - privacy-first approach
- **Timer state saved** on app quit (no lost time)
- **Selection state restored** on app restart
- **Automatic database initialization**

---

## UI Components

### Buttons
- **Primary** (btn--primary): Green gradient, white text
- **Secondary** (btn--secondary): Subtle background
- **Ghost** (btn--ghost): Transparent, icon buttons
- **Danger** (btn--delete): Red gradient for destructive actions
- **Cancel**: Gray/subtle for dismiss actions

### Status Badges
Small rounded pills with status-specific colors:
- To Do: Gray
- In Progress: Blue
- On Hold: Amber
- Completed: Green
- Archived: Muted gray

### Dropdown Menus
- Floating panels with shadow
- Hover states on items
- Dividers between sections
- Icons for visual hierarchy
- Active state highlighting

### Modals
- Centered overlay with backdrop blur
- Rounded corners (12px)
- Clear title, description, action buttons
- Loading states for async operations
- Error display for failures

### Form Elements
- **Selects**: Custom styled with proper arrows
- **Inputs**: Clean borders, focus states with accent color
- **Textareas**: Auto-expanding for descriptions

---

## Keyboard Shortcuts (Future)
- `Cmd+N`: New task
- `Cmd+S`: Start/Stop timer
- `Cmd+P`: Pause timer
- `Cmd+,`: Open settings

---

## App Icon
- Custom Trackerton logo
- Light version for dark backgrounds
- Dark version for light backgrounds
- Menu bar icon (template image for macOS)

---

## Technical Notes for Marketing Page

### Download/Install
- macOS DMG installer
- Apple Silicon (M1/M2/M3) native support
- Intel Mac support
- Auto-updates via electron-updater

### System Requirements
- macOS 10.15 (Catalina) or later
- ~100MB disk space
- No internet required (offline-first)

### Privacy
- All data stored locally
- No accounts or sign-up required
- No telemetry or analytics
- No cloud sync (your data stays on your machine)

---

## Screenshots Needed for Marketing

1. **Hero Shot**: Full app with dark theme, timer running, showing all three panels
2. **Light Theme**: Same view in light mode
3. **Menu Bar Popup**: Showing timer running with task selected
4. **Auto-Pause Settings**: Settings dropdown open showing theme and auto-pause options
5. **Time Entries**: Detail panel showing list of time entries for a task
6. **Empty State**: Clean organization/project selection state

---

## Taglines/Copy Suggestions

**Primary Tagline**: 
> "Track time beautifully. Stay focused effortlessly."

**Secondary Options**:
- "The time tracker that stays out of your way"
- "Organize. Track. Focus."
- "Time tracking for people who hate time tracking"
- "Your time, your data, your machine"

**Feature Highlights**:
- ⏱️ One-click time tracking
- 📊 Organize by client, project, and task
- 🌙 Beautiful dark mode
- 💻 Lives in your menu bar
- 🔒 100% offline - your data stays private
- ⏸️ Smart auto-pause when you step away

---

## Version
**Current Version**: 0.1.0
**Status**: Ready for initial release
