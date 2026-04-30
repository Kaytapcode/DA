using AutoMapper;
using SysAdmin.Api.Models;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace SysAdmin.Api.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // Banner mappings
            CreateMap<BannerAndActivityModel, BannerResponseDto>()
                .ForMember(dest => dest.BannerId, opt => opt.MapFrom(src => src.Id));

            CreateMap<BannerRequestDto, BannerAndActivityModel>()
                .ForMember(dest => dest.Id, opt => opt.Ignore());
        }
    }
}
