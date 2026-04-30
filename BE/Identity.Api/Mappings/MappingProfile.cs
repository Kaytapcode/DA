using AutoMapper;
using Identity.Api.Models;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Identity.Api.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // TODO: User mappings - no UserResponseDto exists, user data returned via AuthResponseDto or through Organization.Api

            CreateMap<RegisterRequestDto, UserModel>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.Role, opt => opt.MapFrom(_ => "Student"));
        }
    }
}
