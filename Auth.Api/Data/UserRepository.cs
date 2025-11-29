using Auth.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Auth.Api.Data
{
    public interface IUserRepository
    {
        Task<UserModel?> GetByUsernameAsync(string username);
        Task AddAsync(UserModel user);
        // ... các phương thức khác
    }

    public class UserRepository : IUserRepository
    {
        private readonly AuthDbContext _context;

        public UserRepository(AuthDbContext context)
        {
            _context = context;
        }

        public async Task<UserModel?> GetByUsernameAsync(string username)
        {
            return await _context.user.SingleOrDefaultAsync(u => u.Username == username);
        }

        public async Task AddAsync(UserModel user)
        {
            _context.user.Add(user);
            await _context.SaveChangesAsync();
        }
    }
}