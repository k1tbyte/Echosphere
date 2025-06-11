using Backend.Data.Entities;
using Backend.DTO;

namespace Backend.Repositories.Abstraction;

public interface IPlaylistVideoRepository: IAsyncCrudRepository<PlaylistVideo,  IPlaylistVideoRepository>
{
    public Task<bool> IsExists(PlaylistVideoKeypairDTO dto);
    
    public Task<PlaylistVideo?> GetPlaylistVideo(PlaylistVideoKeypairDTO dto);
    
}