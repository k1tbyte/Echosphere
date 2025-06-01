using Backend.Data.Entities;

namespace Backend.Repositories.Abstraction;

public interface IVideoRepository : IAsyncCrudRepository<Video,  IVideoRepository>
{
    public Task<Video?> GetVideoByIdAsync(Guid id);
    public Task<List<Guid>> GetQueuedVideoIdsAsync();
    
}