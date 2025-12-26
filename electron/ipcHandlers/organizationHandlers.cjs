const { ipcMain } = require('electron');
const OrganizationController = require('../controllers/organizationController');
const {
  GET_ORGANIZATIONS,
  ADD_ORGANIZATION,
  UPDATE_ORGANIZATION,
  DELETE_ORGANIZATION,
} = require('../constants/ipcChannels');

function registerOrganizationHandlers(broadcastDataChanged) {
  ipcMain.handle(GET_ORGANIZATIONS, async (event, statusFilter = null) => {
    return await OrganizationController.getOrganizations(statusFilter);
  });

  ipcMain.handle(ADD_ORGANIZATION, async (event, args) => {
    const { name, status = 'active' } = args || {};
    const result = await OrganizationController.createOrganization(name, status);
    if (broadcastDataChanged) broadcastDataChanged('organizations', 'add');
    return result;
  });

  ipcMain.handle(UPDATE_ORGANIZATION, async (event, args) => {
    const { id, data } = args || {};
    const result = await OrganizationController.updateOrganization(id, data);
    if (broadcastDataChanged) broadcastDataChanged('organizations', 'update');
    return result;
  });

  ipcMain.handle(DELETE_ORGANIZATION, async (event, id) => {
    const result = await OrganizationController.deleteOrganization(id);
    if (broadcastDataChanged) broadcastDataChanged('organizations', 'delete');
    return result;
  });
}

module.exports = registerOrganizationHandlers;
