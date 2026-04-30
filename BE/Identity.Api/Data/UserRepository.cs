using Identity.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Identity.Api.Data
{
    public interface IUserRepository
    {
        Task<UserModel?> GetByIdAsync(Guid id);
        Task<UserModel?> GetByUsernameAsync(string username);
        Task<UserModel?> GetByEmailAsync(string email);
        Task<List<UserModel>> GetAllAsync();
        Task<(List<UserModel> Items, int Total)> SearchAsync(string? query, int pageIndex, int pageSize);
        Task AddAsync(UserModel user);
        Task UpdateAsync(UserModel user);
        Task DeleteAsync(Guid id);
        Task<bool> UserExistsByUsernameAsync(string username);
        Task<bool> UserExistsByEmailAsync(string email);
    }

    public class UserRepository : IUserRepository
    {
        private readonly AuthDbContext _context;

        public UserRepository(AuthDbContext context)
        {
            _context = context;
        }

        public async Task<UserModel?> GetByIdAsync(Guid id)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<UserModel?> GetByUsernameAsync(string username)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task<UserModel?> GetByEmailAsync(string email)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        public async Task<List<UserModel>> GetAllAsync()
        {
            return await _context.Users.ToListAsync();
        }

        public async Task<(List<UserModel> Items, int Total)> SearchAsync(string? query, int pageIndex, int pageSize)
        {
            var q = _context.Users.AsQueryable();
            if (!string.IsNullOrWhiteSpace(query))
                q = q.Where(u => EF.Functions.Like(u.Username, $"%{query}%") ||
                                 EF.Functions.Like(u.Email, $"%{query}%"));

            var total = await q.CountAsync();
            var items = await q.OrderBy(u => u.Username)
                               .Skip(pageIndex * pageSize)
                               .Take(pageSize)
                               .ToListAsync();
            return (items, total);
        }

        public async Task AddAsync(UserModel user)
        {
            if (user.Id == Guid.Empty) user.Id = Guid.NewGuid();
            user.CreatedAt = DateTime.UtcNow;
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(UserModel user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var user = await GetByIdAsync(id);
            if (user != null)
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> UserExistsByUsernameAsync(string username)
        {
            return await _context.Users.AnyAsync(u => u.Username == username);
        }

        public async Task<bool> UserExistsByEmailAsync(string email)
        {
            return await _context.Users.AnyAsync(u => u.Email == email);
        }
    }
}
