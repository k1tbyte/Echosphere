using Backend.Data.Entities;

namespace Backend.DTO;

public class VideoDTO:Video
{
    public UserSimplifiedDTO? OwnerSimplified { get; set; }
}