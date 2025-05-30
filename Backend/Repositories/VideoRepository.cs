using Backend.Data;
using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public class VideoRepository(AppDbContext context): BaseAsyncCrudRepository<Video, IVideoRepository>(context, context.Videos), IVideoRepository
{
    public async Task<Video?> GetVideoByIdAsync(Guid id)
    {
        return await context.Videos.FirstOrDefaultAsync(v => v.Id == id);
    }
    public static bool CheckPrivateVideoAccess(HttpContext httpContext, int ownerId)
    {
        JwtService.GetUserIdFromContext(httpContext,out var userId);
        JwtService.GetUserRoleFromContext(httpContext,out var role);
        return ownerId == userId ||role >= EUserRole.Admin;
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