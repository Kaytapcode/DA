using AutoMapper;
using AI.Api.Models;

namespace AI.Api.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // AI quota mappings
            CreateMap<AiQuotaModel, AiQuotaModel>().ReverseMap();
        }
    }
}
