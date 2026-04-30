using Organization.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Organization.Api.Data
{
    public interface IMemberRepository
    {
        Task<List<MemberModel>> GetByOrgIdAsync(Guid orgId);
        Task<MemberModel?> GetByIdAsync(Guid id);
        Task<MemberModel?> GetByUserAndOrgAsync(Guid userId, Guid orgId);
        Task<MemberModel> CreateAsync(MemberModel member);
        Task<MemberModel> UpdateAsync(MemberModel member);
        Task DeleteAsync(Guid id);
        Task<bool> IsUserOrgAdminAsync(Guid userId, Guid orgId);
        Task<bool> IsUserMemberAsync(Guid userId, Guid orgId);
    }

    public class MemberRepository : IMemberRepository
    {
        private readonly OrganizationDbContext _context;

        public MemberRepository(OrganizationDbContext context)
        {
            _context = context;
        }

        public async Task<List<MemberModel>> GetByOrgIdAsync(Guid orgId)
            => await _context.Members
                .Include(m => m.User)
                .Where(m => m.OrgId == orgId)
                .ToListAsync();

        public async Task<MemberModel?> GetByIdAsync(Guid id)
            => await _context.Members.Include(m => m.User).FirstOrDefaultAsync(m => m.Id == id);

        public async Task<MemberModel?> GetByUserAndOrgAsync(Guid userId, Guid orgId)
            => await _context.Members.FirstOrDefaultAsync(m => m.UserId == userId && m.OrgId == orgId);

        public async Task<MemberModel> CreateAsync(MemberModel member)
        {
            member.Id = Guid.NewGuid();
            member.JoinDate = DateTime.UtcNow;
            member.CreatedAt = DateTime.UtcNow;
            _context.Members.Add(member);
            await _context.SaveChangesAsync();
            return member;
        }

        public async Task<MemberModel> UpdateAsync(MemberModel member)
        {
            _context.Members.Update(member);
            await _context.SaveChangesAsync();
            return member;
        }

        public async Task DeleteAsync(Guid id)
        {
            var member = await _context.Members.FindAsync(id)
                ?? throw new KeyNotFoundException($"Member {id} not found.");
            _context.Members.Remove(member);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> IsUserOrgAdminAsync(Guid userId, Guid orgId)
            => await _context.Members.AnyAsync(m =>
                m.UserId == userId && m.OrgId == orgId &&
                (m.Role == "OrgAdmin" || m.Role == "Owner"));

        public async Task<bool> IsUserMemberAsync(Guid userId, Guid orgId)
            => await _context.Members.AnyAsync(m => m.UserId == userId && m.OrgId == orgId);
    }
}
