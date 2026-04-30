using AutoMapper;
using Organization.Api.Models;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Organization.Api.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // Organization mappings
            CreateMap<OrganizationModel, OrganizationResponseDto>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id));

            CreateMap<CreateOrganizationRequestDto, OrganizationModel>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

            // Member mappings
            CreateMap<MemberModel, MemberResponseDto>()
                .ForMember(dest => dest.UserId, opt => opt.MapFrom(src => src.UserId))
                .ForMember(dest => dest.OrgId, opt => opt.MapFrom(src => src.OrgId));

            CreateMap<CreateMemberRequestDto, MemberModel>()
                .ForMember(dest => dest.JoinDate, opt => opt.MapFrom(_ => DateTime.UtcNow));
        }
    }
}
