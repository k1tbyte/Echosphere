using Backend.Data;
using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public class VideoRepository(AppDbContext context): BaseAsyncCrudRepository<Video>(context,context.Videos),IVideoRepository
{
    public bool Autosave { get; set; } = true;
    public async Task<Video?> GetVideoByIdAsync(Guid id)
    {
        return await context.Videos.FirstOrDefaultAsync(v => v.Id == id);
    }
    public async Task<List<Guid>> GetProcessingVideosIdsAsync()
    {
        return await context.Videos
            .Where(v => v.Status == EVideoStatus.Processing)
            .OrderBy(v => v.CreatedAt)
            .Select(v => v.Id)
            .ToListAsync();
    }
}