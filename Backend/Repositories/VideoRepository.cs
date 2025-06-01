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
    public static bool CheckVideoManagementAccess(HttpContext httpContext,Video video,bool deleteGranted)
    {
        JwtService.GetUserIdFromContext(httpContext,out var userId);
        JwtService.GetUserRoleFromContext(httpContext,out var role);
        if (deleteGranted)
            return video.OwnerId == userId ||role >= EUserRole.Admin;
        return video.IsPublic && role >= EUserRole.Moder;
    }
    public static bool CheckVideoAccess(HttpContext httpContext, Video video)
    {
        JwtService.GetUserIdFromContext(httpContext,out var userId);
        JwtService.GetUserRoleFromContext(httpContext,out var role);
        if (video.OwnerId == userId || role >= EUserRole.Admin)
        {
            return true;
        }
        if (video.IsPublic)
        {
            if (video.Status != EVideoStatus.Blocked)
            {
                return true;
            }
            return role >= EUserRole.Moder;
        }
        return false;
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