// src/ipcHandlers/projectHandlers.js
const { ipcMain } = require('electron');
const ProjectController = require('../controllers/projectController');
const {
  GET_PROJECTS,
  ADD_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
} = require('../constants/ipcChannels');

function registerProjectHandlers() {
  ipcMain.handle(GET_PROJECTS, async (event, organizationId) => {
    return await ProjectController.getProjects(organizationId);
  });

  ipcMain.handle(ADD_PROJECT, async (event, { name, organizationId }) => {
    const newProject = await ProjectController.createProject(name, organizationId);
    return newProject; // Return the new project
  });

  ipcMain.handle(UPDATE_PROJECT, async (event, { id, name, description }) => {
    return await ProjectController.updateProject(id, name, description);
  });

  ipcMain.handle(DELETE_PROJECT, async (event, id) => {
    return await ProjectController.deleteProject(id);
  });
}

module.exports = registerProjectHandlers;
