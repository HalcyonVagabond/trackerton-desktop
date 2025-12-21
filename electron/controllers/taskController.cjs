const Task = require('../models/task');

class TaskController {
  static async createTask(name, project_id) {
    return await Task.create({ name, project_id });
  }

  static async getTasks(project_id) {
    return await Task.findAll(project_id);
  }

  static async updateTask(id, name) {
    return await Task.update(id, { name });
  }

  static async deleteTask(id) {
    return await Task.delete(id);
  }

  static async getTaskById(id) {
    return await Task.findById(id);
  }
}

module.exports = TaskController;
