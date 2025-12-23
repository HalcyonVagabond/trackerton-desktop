const { ipcMain } = require('electron');
const OrganizationController = require('../controllers/organizationController');
const {
  GET_ORGANIZATIONS,
  ADD_ORGANIZATION,
  UPDATE_ORGANIZATION,
  DELETE_ORGANIZATION,
} = require('../constants/ipcChannels');

function registerOrganizationHandlers() {
  ipcMain.handle(GET_ORGANIZATIONS, async (event, statusFilter = null) => {
    return await OrganizationController.getOrganizations(statusFilter);
  });

  ipcMain.handle(ADD_ORGANIZATION, async (event, args) => {
    const { name, status = 'active' } = args || {};
    return await OrganizationController.createOrganization(name, status);
  });

  ipcMain.handle(UPDATE_ORGANIZATION, async (event, args) => {
    const { id, data } = args || {};
    return await OrganizationController.updateOrganization(id, data);
  });

  ipcMain.handle(DELETE_ORGANIZATION, async (event, id) => {
    return await OrganizationController.deleteOrganization(id);
  });
}

module.exports = registerOrganizationHandlers;
