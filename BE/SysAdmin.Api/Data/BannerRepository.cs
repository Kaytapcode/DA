using SysAdmin.Api.Models;
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
        private readonly SysAdminDbContext _context;

        public BannerRepository(SysAdminDbContext context)
        {
            _context = context;
        }

        public async Task<BannerModel?> GetByIdAsync(Guid id)
        {
            return await _context.Banners.FirstOrDefaultAsync(b => b.Id == id);
        }

        public async Task<List<BannerModel>> GetSystemBannersAsync()
        {
            // Return active system-wide banners (OrgId = NULL) ordered by DisplayOrder
            return await _context.Banners
                .Where(b => b.IsActive && b.OrgId == null)
                .OrderBy(b => b.DisplayOrder)
                .ToListAsync();
        }

        public async Task<List<BannerModel>> GetOrgBannersAsync(Guid orgId)
        {
            // Return active banners for this org + active system-wide banners, ordered by DisplayOrder
            return await _context.Banners
                .Where(b => b.IsActive && (b.OrgId == orgId || b.OrgId == null))
                .OrderBy(b => b.DisplayOrder)
                .ToListAsync();
        }

        public async Task<List<BannerModel>> GetAllAsync()
        {
            return await _context.Banners.OrderBy(b => b.DisplayOrder).ToListAsync();
        }

        public async Task<BannerModel> CreateAsync(BannerModel banner)
        {
            banner.CreatedAt = DateTime.UtcNow;
            _context.Banners.Add(banner);
            await _context.SaveChangesAsync();
            return banner;
        }

        public async Task<BannerModel> UpdateAsync(BannerModel banner)
        {
            banner.UpdatedAt = DateTime.UtcNow;
            _context.Banners.Update(banner);
            await _context.SaveChangesAsync();
            return banner;
        }

        public async Task DeleteAsync(Guid id)
        {
            var banner = await _context.Banners.FirstOrDefaultAsync(b => b.Id == id);
            if (banner != null)
            {
                _context.Banners.Remove(banner);
                await _context.SaveChangesAsync();
            }
        }
    }
}
