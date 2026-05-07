using Identity.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Identity.Api.Data
{
    public interface IUserRepository
    {
        Task<UserModel?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<UserModel?> GetByUsernameAsync(string username, CancellationToken ct = default);
        Task<UserModel?> GetByEmailAsync(string email, CancellationToken ct = default);
        Task<List<UserModel>> GetAllAsync(CancellationToken ct = default);
        Task<(List<UserModel> Items, int Total)> SearchAsync(string? query, int pageIndex, int pageSize, CancellationToken ct = default);
        Task AddAsync(UserModel user, CancellationToken ct = default);
        Task UpdateAsync(UserModel user, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
        Task<bool> UserExistsByUsernameAsync(string username, CancellationToken ct = default);
        Task<bool> UserExistsByEmailAsync(string email, CancellationToken ct = default);
    }

    public class UserRepository : IUserRepository
    {
        private readonly AuthDbContext _context;

        public UserRepository(AuthDbContext context)
        {
            _context = context;
        }

        public async Task<UserModel?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        }

        public async Task<UserModel?> GetByUsernameAsync(string username, CancellationToken ct = default)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Username == username, ct);
        }

        public async Task<UserModel?> GetByEmailAsync(string email, CancellationToken ct = default)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        }

        public async Task<List<UserModel>> GetAllAsync(CancellationToken ct = default)
        {
            return await _context.Users.ToListAsync(ct);
        }

        public async Task<(List<UserModel> Items, int Total)> SearchAsync(string? query, int pageIndex, int pageSize, CancellationToken ct = default)
        {
            var q = _context.Users.AsQueryable();
            if (!string.IsNullOrWhiteSpace(query))
                q = q.Where(u => EF.Functions.ILike(u.Username, $"%{query}%") ||
                                 EF.Functions.ILike(u.Email, $"%{query}%"));

            var total = await q.CountAsync(ct);
            var items = await q.OrderBy(u => u.Username)
                               .Skip(pageIndex * pageSize)
                               .Take(pageSize)
                               .ToListAsync(ct);
            return (items, total);
        }

        public async Task AddAsync(UserModel user, CancellationToken ct = default)
        {
            user.Id = Guid.NewGuid();
            user.CreatedAt = DateTime.UtcNow;
            _context.Users.Add(user);
            await _context.SaveChangesAsync(ct);
        }

        public async Task UpdateAsync(UserModel user, CancellationToken ct = default)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync(ct);
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var user = await GetByIdAsync(id, ct);
            if (user != null)
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync(ct);
            }
        }

        public async Task<bool> UserExistsByUsernameAsync(string username, CancellationToken ct = default)
        {
            return await _context.Users.AnyAsync(u => u.Username == username, ct);
        }

        public async Task<bool> UserExistsByEmailAsync(string email, CancellationToken ct = default)
        {
            return await _context.Users.AnyAsync(u => u.Email == email, ct);
        }
    }
}
