using AutoMapper;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Hubs;

namespace Backend.Utils;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<User, UserSimplifiedDTO>().ForMember(dest => dest.OnlineStatus,
            opt => opt.MapFrom(src => EchoHub.GetUserStatus(src.Id)));
        CreateMap<User, UserSimplifiedExtendedDTO>().ForMember(dest => dest.OnlineStatus,
            opt => opt.MapFrom(src => EchoHub.GetUserStatus(src.Id)));
        CreateMap<Video, VideoDTO>()
            .ForMember(dest => dest.OwnerSimplified, opt => opt.MapFrom(src => src.Owner))
            .ForMember(dest => dest.Owner, opt => opt.Ignore());
    }
}