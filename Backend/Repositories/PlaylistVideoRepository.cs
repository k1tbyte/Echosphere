using Backend.Data;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Repositories.Abstraction;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public class PlaylistVideoRepository(AppDbContext context) :BaseAsyncCrudRepository<PlaylistVideo,IPlaylistVideoRepository>
    (context, context.PlaylistVideos), IPlaylistVideoRepository
{
    public async Task<bool> IsExists(PlaylistVideoKeypairDTO dto)
    {
        return await context.PlaylistVideos.AnyAsync(pv =>
            pv.PlaylistId == dto.PlaylistId && pv.VideoId == dto.VideoId);
    }

    public async Task<PlaylistVideo?> GetPlaylistVideo(PlaylistVideoKeypairDTO dto)
    {
        return await context.PlaylistVideos.FirstOrDefaultAsync(pv =>
            pv.PlaylistId == dto.PlaylistId && pv.VideoId == dto.VideoId);
    }
}