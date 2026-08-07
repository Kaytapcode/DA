using Organization.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Organization.Api.Data
{
    public interface IMemberRepository
    {
        Task<List<MemberModel>> GetByOrgIdAsync(Guid orgId, CancellationToken ct = default);
        /// <summary>All membership rows for a user (every org they belong to, any role).</summary>
        Task<List<MemberModel>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
        Task<MemberModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<MemberModel?> GetByUserAndOrgAsync(Guid userId, Guid orgId, CancellationToken ct = default);
        /// <summary>Returns the OrgAdmin membership row for a user (where Role == "OrgAdmin"), or null if not found.</summary>
        Task<MemberModel?> GetOrgAdminOrgAsync(Guid userId, CancellationToken ct = default);
        Task<MemberModel> CreateAsync(MemberModel member, CancellationToken ct = default);
        Task<MemberModel> UpdateAsync(MemberModel member, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
        Task<bool> IsUserOrgAdminAsync(Guid userId, Guid orgId, CancellationToken ct = default);
        Task<bool> IsUserMemberAsync(Guid userId, Guid orgId, CancellationToken ct = default);
    }

    public class MemberRepository : IMemberRepository
    {
        private readonly OrganizationDbContext _context;

        public MemberRepository(OrganizationDbContext context)
        {
            _context = context;
        }

        public async Task<List<MemberModel>> GetByOrgIdAsync(Guid orgId, CancellationToken ct = default)
            => await _context.Members
                .Where(m => m.OrgId == orgId)
                .ToListAsync(ct);

        public async Task<List<MemberModel>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
            => await _context.Members.Where(m => m.UserId == userId).ToListAsync(ct);

        public async Task<MemberModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => await _context.Members.FirstOrDefaultAsync(m => m.Id == id, ct);

        public async Task<MemberModel?> GetByUserAndOrgAsync(Guid userId, Guid orgId, CancellationToken ct = default)
            => await _context.Members.FirstOrDefaultAsync(m => m.UserId == userId && m.OrgId == orgId, ct);

        public async Task<MemberModel> CreateAsync(MemberModel member, CancellationToken ct = default)
        {
            member.Id = Guid.NewGuid();
            member.JoinDate = DateTime.UtcNow;
            member.CreatedAt = DateTime.UtcNow;
            _context.Members.Add(member);
            await _context.SaveChangesAsync(ct);
            return member;
        }

        public async Task<MemberModel> UpdateAsync(MemberModel member, CancellationToken ct = default)
        {
            _context.Members.Update(member);
            await _context.SaveChangesAsync(ct);
            return member;
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var member = await _context.Members.FindAsync(new object[] { id }, ct)
                ?? throw new KeyNotFoundException($"Member {id} not found.");
            _context.Members.Remove(member);
            await _context.SaveChangesAsync(ct);
        }

        public async Task<MemberModel?> GetOrgAdminOrgAsync(Guid userId, CancellationToken ct = default)
            => await _context.Members.FirstOrDefaultAsync(m =>
                m.UserId == userId && m.Status == "Approved" && (m.Role == "OrgAdmin" || m.Role == "Owner"), ct);

        public async Task<bool> IsUserOrgAdminAsync(Guid userId, Guid orgId, CancellationToken ct = default)
            => await _context.Members.AnyAsync(m =>
                m.UserId == userId && m.OrgId == orgId && m.Status == "Approved" &&
                (m.Role == "OrgAdmin" || m.Role == "Owner"), ct);

        // Only an APPROVED membership counts — a Pending join request grants no org access.
        public async Task<bool> IsUserMemberAsync(Guid userId, Guid orgId, CancellationToken ct = default)
            => await _context.Members.AnyAsync(m => m.UserId == userId && m.OrgId == orgId && m.Status == "Approved", ct);
    }
}
