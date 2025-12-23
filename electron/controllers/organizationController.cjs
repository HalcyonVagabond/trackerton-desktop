const Organization = require('../models/organization');

class OrganizationController {
  static async createOrganization(name, status = 'active') {
    return await Organization.create({ name, status });
  }

  static async getOrganizations(statusFilter = null) {
    return await Organization.findAll(statusFilter);
  }

  static async updateOrganization(id, data) {
    return await Organization.update(id, data);
  }

  static async deleteOrganization(id) {
    return await Organization.delete(id);
  }

  static async getOrganizationById(id) {
    return await Organization.findById(id);
  }
}

module.exports = OrganizationController;
