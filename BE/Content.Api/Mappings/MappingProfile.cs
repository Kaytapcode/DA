using AutoMapper;
using Content.Api.Models;
using Shared.Contracts.Requests;
using Shared.Contracts.Responses;

namespace Content.Api.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // Course mappings
            CreateMap<CourseModel, CourseResponseDto>()
                .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id));

            CreateMap<CreateCourseRequestDto, CourseModel>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));

            // Module mappings
            CreateMap<ModuleModel, CourseResponseDto>();
                
            CreateMap<CreateModuleRequestDto, ModuleModel>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));

            // Content mappings
            CreateMap<ContentModel, CourseResponseDto>();
            CreateMap<CreateContentRequestDto, ContentModel>();
        }
    }
}
