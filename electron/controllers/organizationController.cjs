const Organization = require('../models/organization');

class OrganizationController {
  static async createOrganization(name) {
    return await Organization.create({ name });
  }

  static async getOrganizations() {
    return await Organization.findAll();
  }

  static async updateOrganization(id, name) {
    return await Organization.update(id, { name });
  }

  static async deleteOrganization(id) {
    return await Organization.delete(id);
  }

  static async getOrganizationById(id) {
    return await Organization.findById(id);
  }
}

module.exports = OrganizationController;
