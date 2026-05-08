using Organization.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Organization.Api.Data
{
    public interface IOrganizationRepository
    {
        Task<List<OrganizationModel>> GetAllAsync(CancellationToken ct = default);
        Task<List<OrganizationModel>> GetByOwnerIdAsync(Guid ownerId, CancellationToken ct = default);
        Task<List<OrganizationModel>> GetByMemberUserIdAsync(Guid userId, CancellationToken ct = default);
        Task<OrganizationModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<OrganizationModel?> GetBySlugAsync(string slug, CancellationToken ct = default);
        Task<OrganizationModel> CreateAsync(OrganizationModel org, CancellationToken ct = default);
        Task<OrganizationModel> UpdateAsync(OrganizationModel org, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
        Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null, CancellationToken ct = default);
    }

    public class OrganizationRepository : IOrganizationRepository
    {
        private readonly OrganizationDbContext _context;

        public OrganizationRepository(OrganizationDbContext context)
        {
            _context = context;
        }

        public async Task<List<OrganizationModel>> GetAllAsync(CancellationToken ct = default)
            => await _context.Organizations.Include(o => o.Members).ToListAsync(ct);

        public async Task<List<OrganizationModel>> GetByOwnerIdAsync(Guid ownerId, CancellationToken ct = default)
            => await _context.Organizations.Include(o => o.Members)
                .Where(o => o.OwnerId == ownerId)
                .ToListAsync(ct);

        public async Task<List<OrganizationModel>> GetByMemberUserIdAsync(Guid userId, CancellationToken ct = default)
            => await _context.Organizations.Include(o => o.Members)
                .Where(o => o.Members.Any(m => m.UserId == userId))
                .ToListAsync(ct);

        public async Task<OrganizationModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => await _context.Organizations.Include(o => o.Members).FirstOrDefaultAsync(o => o.Id == id, ct);

        public async Task<OrganizationModel?> GetBySlugAsync(string slug, CancellationToken ct = default)
            => await _context.Organizations.IgnoreQueryFilters()
                .FirstOrDefaultAsync(o => o.Slug == slug.ToLower(), ct);

        public async Task<OrganizationModel> CreateAsync(OrganizationModel org, CancellationToken ct = default)
        {
            org.Id = Guid.NewGuid();
            org.Slug = org.Slug.ToLower();
            org.CreatedAt = DateTime.UtcNow;
            _context.Organizations.Add(org);
            await _context.SaveChangesAsync(ct);
            return org;
        }

        public async Task<OrganizationModel> UpdateAsync(OrganizationModel org, CancellationToken ct = default)
        {
            org.UpdatedAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(org.Slug))
                org.Slug = org.Slug.ToLower();
            _context.Organizations.Update(org);
            await _context.SaveChangesAsync(ct);
            return org;
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var org = await _context.Organizations.FindAsync(new object[] { id }, ct)
                ?? throw new KeyNotFoundException($"Organization {id} not found.");
            _context.Organizations.Remove(org);
            await _context.SaveChangesAsync(ct);
        }

        public async Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null, CancellationToken ct = default)
            => await _context.Organizations.IgnoreQueryFilters()
                .AnyAsync(o => o.Slug == slug.ToLower() && (excludeId == null || o.Id != excludeId), ct);
    }
}
