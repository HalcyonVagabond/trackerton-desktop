// src/ipcHandlers/projectHandlers.js
const { ipcMain } = require('electron');
const ProjectController = require('../controllers/projectController');
const {
  GET_PROJECTS,
  ADD_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
} = require('../constants/ipcChannels');

function registerProjectHandlers(broadcastDataChanged) {
  ipcMain.handle(GET_PROJECTS, async (event, args) => {
    const { organizationId, statusFilter = null } = args || {};
    return await ProjectController.getProjects(organizationId, statusFilter);
  });

  ipcMain.handle(ADD_PROJECT, async (event, args) => {
    const { name, organizationId, description = null, status = 'in_progress' } = args || {};
    const newProject = await ProjectController.createProject(name, organizationId, description, status);
    if (broadcastDataChanged) broadcastDataChanged('projects', 'add');
    return newProject;
  });

  ipcMain.handle(UPDATE_PROJECT, async (event, args) => {
    const { id, data } = args || {};
    const result = await ProjectController.updateProject(id, data);
    if (broadcastDataChanged) broadcastDataChanged('projects', 'update');
    return result;
  });

  ipcMain.handle(DELETE_PROJECT, async (event, id) => {
    const result = await ProjectController.deleteProject(id);
    if (broadcastDataChanged) broadcastDataChanged('projects', 'delete');
    return result;
  });
}

module.exports = registerProjectHandlers;
