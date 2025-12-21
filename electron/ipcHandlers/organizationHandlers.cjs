const { ipcMain } = require('electron');
const OrganizationController = require('../controllers/organizationController');
const {
  GET_ORGANIZATIONS,
  ADD_ORGANIZATION,
  UPDATE_ORGANIZATION,
  DELETE_ORGANIZATION,
} = require('../constants/ipcChannels');

function registerOrganizationHandlers() {
  ipcMain.handle(GET_ORGANIZATIONS, async () => {
    console.log('Handling GET_ORGANIZATIONS');
    const result = await OrganizationController.getOrganizations();
    // console.log('GET_ORGANIZATIONS result:', result);
    return result;
  });

  ipcMain.handle(ADD_ORGANIZATION, async (event, name) => {
    const newOrganization = await OrganizationController.createOrganization(name);
    return newOrganization; // Return the new organization
  });

  ipcMain.handle(UPDATE_ORGANIZATION, async (event, { id, name }) => {
    console.log('Handling UPDATE_ORGANIZATION with id:', id, 'and name:', name);
    const result = await OrganizationController.updateOrganization(id, name);
    console.log('UPDATE_ORGANIZATION result:', result);
    return result;
  });

  ipcMain.handle(DELETE_ORGANIZATION, async (event, id) => {
    console.log('Handling DELETE_ORGANIZATION with id:', id);
    const result = await OrganizationController.deleteOrganization(id);
    console.log('DELETE_ORGANIZATION result:', result);
    return result;
  });
}

module.exports = registerOrganizationHandlers;
