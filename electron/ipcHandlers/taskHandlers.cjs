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
  ipcMain.handle(GET_TASKS, async (event, projectId) => {
    return await TaskController.getTasks(projectId);
  });

  ipcMain.handle(ADD_TASK, async (event, { name, projectId }) => {
    return await TaskController.createTask(name, projectId);
  });

  ipcMain.handle(UPDATE_TASK, async (event, { id, name }) => {
    return await TaskController.updateTask(id, name);
  });

  ipcMain.handle(DELETE_TASK, async (event, id) => {
    return await TaskController.deleteTask(id);
  });
}

module.exports = registerTaskHandlers;
