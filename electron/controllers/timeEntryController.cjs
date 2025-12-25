const TimeEntry = require('../models/timeEntry');

class TimeEntryController {
  static async createTimeEntry(task_id, duration, timestamp, notes = null) {
    return await TimeEntry.create({ task_id, duration, timestamp, notes });
  }

  static async getTimeEntries(filter) {
    return await TimeEntry.findAll(filter);
  }

  static async updateTimeEntry(id, data) {
    return await TimeEntry.update(id, data);
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
