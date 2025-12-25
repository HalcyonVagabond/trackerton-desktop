// src/ipcHandlers/taskHandlers.js
const { ipcMain } = require('electron');
const TaskController = require('../controllers/taskController');
const {
  GET_TASKS,
  ADD_TASK,
  UPDATE_TASK,
  DELETE_TASK,
} = require('../constants/ipcChannels');

function registerTaskHandlers() {
  ipcMain.handle(GET_TASKS, async (event, args) => {
    const { projectId, statusFilter = null } = args || {};
    return await TaskController.getTasks(projectId, statusFilter);
  });

  ipcMain.handle(ADD_TASK, async (event, args) => {
    const { name, projectId, description = null, status = 'todo' } = args || {};
    return await TaskController.createTask(name, projectId, description, status);
  });

  ipcMain.handle(UPDATE_TASK, async (event, args) => {
    const { id, data } = args || {};
    return await TaskController.updateTask(id, data);
  });

  ipcMain.handle(DELETE_TASK, async (event, id) => {
    return await TaskController.deleteTask(id);
  });
}

module.exports = registerTaskHandlers;
