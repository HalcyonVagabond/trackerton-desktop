const Project = require('../models/project');

class ProjectController {
  static async createProject(name, organization_id, description = null, status = 'in_progress') {
    return await Project.create({ name, organization_id, description, status });
  }

  static async getProjects(organization_id, statusFilter = null) {
    return await Project.findAll(organization_id, statusFilter);
  }

  static async updateProject(id, data) {
    return await Project.update(id, data);
  }

  static async deleteProject(id) {
    return await Project.delete(id);
  }

  static async getProjectById(id) {
    return await Project.findById(id);
  }
}

module.exports = ProjectController;
