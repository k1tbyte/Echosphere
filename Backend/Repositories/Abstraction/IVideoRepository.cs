using Backend.Data.Entities;

namespace Backend.Repositories.Abstraction;

public interface IVideoRepository : IAsyncCrudRepository<Video,  IVideoRepository>
{
    public Task<Video?> GetVideoByIdAsync(Guid id);
    public Task<List<Guid>> GetQueuedVideoIdsAsync();

    public Task<IEnumerable<Video>> GetVideosFromPlaylistAsync(
        int playlistId,
        Func<IQueryable<Video>, IQueryable<Video>>? filter = null,
        string? sortBy = "CreatedAt",
        bool sortDescending = false,
        int offset = 0,
        int limit = 20);

}