using Backend.Data;
using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public class VideoRepository(AppDbContext context): BaseAsyncCrudRepository<Video, IVideoRepository>(context, context.Videos), IVideoRepository
{
    public async Task<Video?> GetVideoByIdAsync(Guid id)
    {
        return await context.Videos.FirstOrDefaultAsync(v => v.Id == id);
    }
    public async Task<List<Guid>> GetQueuedVideoIdsAsync()
    {
        return await context.Videos
            .Where(v => v.Status == EVideoStatus.Queued)
            .OrderBy(v => v.CreatedAt)
            .Select(v => v.Id)
            .ToListAsync();
    }
}