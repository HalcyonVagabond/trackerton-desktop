const TimeEntry = require('../models/timeEntry');

class TimeEntryController {
  static async createTimeEntry(task_id, duration, timestamp) {
    return await TimeEntry.create({ task_id, duration, timestamp });
  }

  static async getTimeEntries(filter) {
    return await TimeEntry.findAll(filter);
  }

  static async updateTimeEntry(id, duration, timestamp) {
    return await TimeEntry.update(id, { duration, timestamp });
  }

  static async deleteTimeEntry(id) {
    return await TimeEntry.delete(id);
  }

  static async getLatestTimeEntryByTask(task_id) {
    return await TimeEntry.findLatestByTaskId(task_id);
  }

  static async getTotalDurationByTask(task_id) {
    return await TimeEntry.getTotalDurationByTaskId(task_id);
  }
}

module.exports = TimeEntryController;
