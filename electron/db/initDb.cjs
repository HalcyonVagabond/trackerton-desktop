const { initOrganizationTable } = require('./organizationDb');
const { initProjectTable } = require('./projectDb');
const { initTaskTable } = require('./taskDb');
const { initTimeEntryTable } = require('./timeEntryDb');

async function initializeDatabase() {
  try {
    await initOrganizationTable();
    await initProjectTable();
    await initTaskTable();
    await initTimeEntryTable();

  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

module.exports = initializeDatabase;
