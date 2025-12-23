const Task = require('../models/task');

class TaskController {
  static async createTask(name, project_id, status = 'todo') {
    return await Task.create({ name, project_id, status });
  }

  static async getTasks(project_id, statusFilter = null) {
    return await Task.findAll(project_id, statusFilter);
  }

  static async updateTask(id, data) {
    return await Task.update(id, data);
  }

  static async deleteTask(id) {
    return await Task.delete(id);
  }

  static async getTaskById(id) {
    return await Task.findById(id);
  }
}

module.exports = TaskController;
