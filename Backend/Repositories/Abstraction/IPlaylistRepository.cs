using Backend.Data.Entities;

namespace Backend.Repositories.Abstraction;

public interface IPlaylistRepository: IAsyncCrudRepository<Playlist,  IPlaylistRepository>
{
    
}