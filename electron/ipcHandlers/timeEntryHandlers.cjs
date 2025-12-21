// src/ipcHandlers/timeEntryHandlers.js
const { ipcMain } = require('electron');
const TimeEntryController = require('../controllers/timeEntryController');
const {
  SAVE_TIME_ENTRY,
  GET_TIME_ENTRIES,
  UPDATE_TIME_ENTRY,
  DELETE_TIME_ENTRY,
  GET_LATEST_TIME_ENTRY,
  GET_TOTAL_DURATION_BY_TASK,
} = require('../constants/ipcChannels');

function registerTimeEntryHandlers() {
  ipcMain.on(SAVE_TIME_ENTRY, async (event, timeEntry) => {
    console.log('Saving time entry:', timeEntry);
    await TimeEntryController.createTimeEntry(
      timeEntry.task_id,
      timeEntry.duration,
      timeEntry.timestamp
    );
  });

  ipcMain.handle(GET_TIME_ENTRIES, async (event, filter) => {
    return await TimeEntryController.getTimeEntries(filter);
  });

  ipcMain.handle(UPDATE_TIME_ENTRY, async (event, { id, duration, timestamp }) => {
    return await TimeEntryController.updateTimeEntry(id, duration, timestamp);
  });

  ipcMain.handle(DELETE_TIME_ENTRY, async (event, id) => {
    return await TimeEntryController.deleteTimeEntry(id);
  });

  ipcMain.handle(GET_LATEST_TIME_ENTRY, async (event, taskId) => {
    return await TimeEntryController.getLatestTimeEntryByTask(taskId);
  });

  ipcMain.handle(GET_TOTAL_DURATION_BY_TASK, async (event, taskId) => {
    return await TimeEntryController.getTotalDurationByTask(taskId);
  });
}

module.exports = registerTimeEntryHandlers;
