// src/ipcHandlers/taskHandlers.js
const { ipcMain } = require('electron');
const TaskController = require('../controllers/taskController');
const {
  GET_TASKS,
  ADD_TASK,
  UPDATE_TASK,
  DELETE_TASK,
} = require('../constants/ipcChannels');

function registerTaskHandlers(broadcastDataChanged) {
  ipcMain.handle(GET_TASKS, async (event, args) => {
    const { projectId, statusFilter = null } = args || {};
    return await TaskController.getTasks(projectId, statusFilter);
  });

  ipcMain.handle(ADD_TASK, async (event, args) => {
    const { name, projectId, description = null, status = 'todo' } = args || {};
    const result = await TaskController.createTask(name, projectId, description, status);
    if (broadcastDataChanged) broadcastDataChanged('tasks', 'add');
    return result;
  });

  ipcMain.handle(UPDATE_TASK, async (event, args) => {
    const { id, data } = args || {};
    const result = await TaskController.updateTask(id, data);
    if (broadcastDataChanged) broadcastDataChanged('tasks', 'update');
    return result;
  });

  ipcMain.handle(DELETE_TASK, async (event, id) => {
    const result = await TaskController.deleteTask(id);
    if (broadcastDataChanged) broadcastDataChanged('tasks', 'delete');
    return result;
  });
}

module.exports = registerTaskHandlers;
