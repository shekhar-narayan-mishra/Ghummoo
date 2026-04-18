// Abstraction: hides MongoDB implementation from service layer
// SOLID - ISP: IUserRepository only exposes user-specific methods, not guide methods

class IUserRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByEmail(email) { throw new Error('Not implemented'); }
  async create(data) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
  async findAll(filter) { throw new Error('Not implemented'); }
}

module.exports = IUserRepository;
