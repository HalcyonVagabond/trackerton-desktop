const Project = require('../models/project');

class ProjectController {
  static async createProject(name, organization_id) {
    console.log('ProjectController.createProject called with name:', name, 'and organization_id:', organization_id)
    return await Project.create({ name, organization_id });
  }

  static async getProjects(organization_id) {
    console.log('\n\nProjectController.getProjects called with organization_id:', organization_id, '\n\n');
    return await Project.findAll(organization_id);
  }

  static async updateProject(id, name, description = '') {
    return await Project.update(id, { name, description });
  }

  static async deleteProject(id) {
    return await Project.delete(id);
  }

  static async getProjectById(id) {
    return await Project.findById(id);
  }
}

module.exports = ProjectController;
