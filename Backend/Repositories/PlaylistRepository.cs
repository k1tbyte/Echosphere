using Backend.Data;
using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Backend.Services;

namespace Backend.Repositories;

public class PlaylistRepository(AppDbContext context) :BaseAsyncCrudRepository<Playlist,IPlaylistRepository>(context, context.Playlists), IPlaylistRepository
{
    public static bool CheckPlaylistManagementAccess(HttpContext httpContext,Playlist playlist,bool deleteGranted)
    {
        JwtService.GetUserIdFromHttpContext(httpContext,out var userId);
        JwtService.GetUserRoleFromContext(httpContext,out var role);
        if (deleteGranted)
            return playlist.OwnerId == userId ||role >= EUserRole.Admin;
        return playlist.IsPublic && role >= EUserRole.Moder;
    }
    public static bool CheckPlaylistAccess(HttpContext httpContext, Playlist playlist)
    {
        JwtService.GetUserIdFromHttpContext(httpContext,out var userId);
        JwtService.GetUserRoleFromContext(httpContext,out var role);
        return playlist.OwnerId == userId || role >= EUserRole.Admin || playlist.IsPublic;
    }
}