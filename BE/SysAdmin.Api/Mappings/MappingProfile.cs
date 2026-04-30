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
            CreateMap<BannerModel, BannerResponseDto>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id));

            CreateMap<CreateBannerRequestDto, BannerModel>()
                .ForMember(dest => dest.Id, opt => opt.Ignore());
        }
    }
}
