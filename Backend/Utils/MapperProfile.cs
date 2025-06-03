using AutoMapper;
using Backend.Data.Entities;
using Backend.DTO;

namespace Backend.Utils;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<User, UserSimplifiedDTO>();
        CreateMap<User, UserSimplifiedExtendedDTO>();
        CreateMap<Video, VideoDTO>()
            .ForMember(dest => dest.OwnerSimplified, opt => opt.MapFrom(src => src.Owner))
            .ForMember(dest => dest.Owner, opt => opt.Ignore());
    }
}