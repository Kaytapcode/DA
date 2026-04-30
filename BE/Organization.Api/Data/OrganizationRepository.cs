using Identity.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Organization.Api.Data
{
    public interface IOrganizationRepository
    {
        Task<List<OrganizationModel>> GetAllAsync();
        Task<List<OrganizationModel>> GetByOwnerIdAsync(Guid ownerId);
        Task<OrganizationModel?> GetByIdAsync(Guid id);
        Task<OrganizationModel?> GetBySlugAsync(string slug);
        Task<OrganizationModel> CreateAsync(OrganizationModel org);
        Task<OrganizationModel> UpdateAsync(OrganizationModel org);
        Task DeleteAsync(Guid id);
        Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null);
    }

    public class OrganizationRepository : IOrganizationRepository
    {
        private readonly AuthDbContext _context;

        public OrganizationRepository(AuthDbContext context)
        {
            _context = context;
        }

        public async Task<List<OrganizationModel>> GetAllAsync()
            => await _context.Organizations.Include(o => o.Members).ToListAsync();

        public async Task<List<OrganizationModel>> GetByOwnerIdAsync(Guid ownerId)
            => await _context.Organizations.Include(o => o.Members)
                .Where(o => o.OwnerId == ownerId)
                .ToListAsync();

        public async Task<OrganizationModel?> GetByIdAsync(Guid id)
            => await _context.Organizations.Include(o => o.Members).FirstOrDefaultAsync(o => o.Id == id);

        public async Task<OrganizationModel?> GetBySlugAsync(string slug)
            => await _context.Organizations.IgnoreQueryFilters()
                .FirstOrDefaultAsync(o => o.Slug == slug.ToLower());

        public async Task<OrganizationModel> CreateAsync(OrganizationModel org)
        {
            org.Id = Guid.NewGuid();
            org.Slug = org.Slug.ToLower();
            org.CreatedAt = DateTime.UtcNow;
            _context.Organizations.Add(org);
            await _context.SaveChangesAsync();
            return org;
        }

        public async Task<OrganizationModel> UpdateAsync(OrganizationModel org)
        {
            org.UpdatedAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(org.Slug))
                org.Slug = org.Slug.ToLower();
            _context.Organizations.Update(org);
            await _context.SaveChangesAsync();
            return org;
        }

        public async Task DeleteAsync(Guid id)
        {
            var org = await _context.Organizations.FindAsync(id)
                ?? throw new KeyNotFoundException($"Organization {id} not found.");
            _context.Organizations.Remove(org);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null)
            => await _context.Organizations.IgnoreQueryFilters()
                .AnyAsync(o => o.Slug == slug.ToLower() && (excludeId == null || o.Id != excludeId));
    }
}
