using Identity.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SysAdmin.Api.Data
{
    public interface IBannerRepository
    {
        Task<BannerModel?> GetByIdAsync(Guid id);
        Task<List<BannerModel>> GetSystemBannersAsync();
        Task<List<BannerModel>> GetOrgBannersAsync(Guid orgId);
        Task<List<BannerModel>> GetAllAsync();
        Task<BannerModel> CreateAsync(BannerModel banner);
        Task<BannerModel> UpdateAsync(BannerModel banner);
        Task DeleteAsync(Guid id);
    }

    public class BannerRepository : IBannerRepository
    {
        private readonly AuthDbContext _context;

        public BannerRepository(AuthDbContext context)
        {
            _context = context;
        }

        public async Task<BannerModel?> GetByIdAsync(Guid id)
        {
            // TODO: Implement when DB is available
            throw new NotImplementedException("Database not available yet");
        }

        public async Task<List<BannerModel>> GetSystemBannersAsync()
        {
            // TODO: Implement when DB is available
            // Should return active system-wide banners (OrgId = NULL) ordered by DisplayOrder
            throw new NotImplementedException("Database not available yet");
        }

        public async Task<List<BannerModel>> GetOrgBannersAsync(Guid orgId)
        {
            // TODO: Implement when DB is available
            // Should return active banners for this org + active system-wide banners, ordered by DisplayOrder
            throw new NotImplementedException("Database not available yet");
        }

        public async Task<List<BannerModel>> GetAllAsync()
        {
            // TODO: Implement when DB is available
            throw new NotImplementedException("Database not available yet");
        }

        public async Task<BannerModel> CreateAsync(BannerModel banner)
        {
            // TODO: Implement when DB is available
            throw new NotImplementedException("Database not available yet");
        }

        public async Task<BannerModel> UpdateAsync(BannerModel banner)
        {
            // TODO: Implement when DB is available
            throw new NotImplementedException("Database not available yet");
        }

        public async Task DeleteAsync(Guid id)
        {
            // TODO: Implement when DB is available
            throw new NotImplementedException("Database not available yet");
        }
    }
}
