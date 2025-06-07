using System.Runtime.CompilerServices;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Repositories;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/v2/video/playlist/[action]")]
public class VideoPlaylistController(IPlaylistRepository playlistRepository,IPlaylistVideoRepository playlistVideoRepository,IVideoRepository videoRepository): ControllerBase
{
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(string),StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(string),StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AddToPlaylist([FromBody] PlaylistVideoKeypairDTO dto)
    {
        if (await playlistVideoRepository.IsExists(dto))
        {
            return Conflict("Video is already in this playlist");
        }
        try
        {
            var video = await videoRepository.GetVideoByIdAsync(dto.VideoId);
            if (video == null)
            {
                return NotFound("Video not found");
            }
            var playlist = await playlistRepository.Get(dto.PlaylistId);
            if (playlist == null)
            {
                return NotFound("Playlist not found");
            }
            var playlistVideo = new PlaylistVideo
            {
                PlaylistId = dto.PlaylistId,
                VideoId = dto.VideoId,
            };
            await playlistVideoRepository.WithAutoSave().Add(playlistVideo);
            playlist.VideoAmount += 1;
            playlist.PreviewUrl = video.PreviewUrl;

            await playlistRepository.WithAutoSave().Update(playlist);
            return NoContent();
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,e.Message);
        }
    }
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(string),StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteFromPlaylist([FromBody] PlaylistVideoKeypairDTO dto)
    {
        try
        {
            var entity = await playlistVideoRepository.GetPlaylistVideo(dto);
            if (entity == null)
            {
                return NotFound("Playlist video not found");
            }
            var playlist = await playlistRepository.Get(dto.PlaylistId);
            if (playlist == null)
            {
                return NotFound("Playlist not found");
            }
            await playlistVideoRepository.WithAutoSave().Delete(entity);
            playlist.VideoAmount -= 1;
            await playlistRepository.WithAutoSave().Update(playlist);
            return NoContent();
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,e.Message);
        }
    }
    
    [HttpGet]
    #if !DEBUG
    [RequireRole(EUserRole.User)]
    #endif
    [ProducesResponseType(typeof(IEnumerable<Playlist>),StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string),StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<Playlist>>> GetPlaylists(string? filter = null, 
        bool desc = true, 
        int offset = 0, 
        int limit = 20,
        string sortBy="CreatedAt")
    {
        try
        {
            var resultId = JwtService.GetUserIdFromHttpContext(HttpContext, out var userId);
            JwtService.GetUserRoleFromContext(HttpContext, out var userRole);

            var playlists = await playlistRepository.GetAllAsync(
                filter: q =>
                {
                    var filtered = (userRole >= EUserRole.Admin )
                        ? q
                        : q.Where(p => p.IsPublic || (resultId && p.OwnerId == userId));
                    if (!string.IsNullOrWhiteSpace(filter))
                    {
                        filtered = filtered.Where(p => EF.Functions.ILike(p.Title, $"%{filter}%"));
                    }
                    return filtered;
                },
                sortBy: sortBy,          
                sortDescending: desc,
                offset: offset,
                limit: limit
            );
            return Ok(playlists);
        }
        catch (ArgumentException e)
        {
            return BadRequest(e.Message);
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, e.Message);
        }
    }
    
    [HttpGet]
    #if !DEBUG
    [RequireRole(EUserRole.User)]
    #endif
    [ProducesResponseType(typeof(IEnumerable<Playlist>),StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string),StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<IEnumerable<Playlist>>> GetUserPlaylists( 
        string filter, 
        int userId = -1,
        bool desc=true, 
        int offset = 0,
        int limit = 20,
        string sortBy="CreatedAt")
    {
        try
        {
            JwtService.GetUserIdFromHttpContext(HttpContext, out var loggedUserId);
            JwtService.GetUserRoleFromContext(HttpContext, out var userRole);
            var playlists = await playlistRepository.GetAllAsync(
                filter: q =>
                {
                    if (userId == -1)
                    {
                        q = q.Where(p => p.OwnerId == loggedUserId);
                    } 
                    else if (userId != loggedUserId)
                    {
                        q = userRole == EUserRole.Admin ? 
                            q.Where(p => p.OwnerId == userId) : 
                            q.Where(
                                p => p.OwnerId == userId && p.IsPublic 
                            );
                    }
                    
                    if (!string.IsNullOrWhiteSpace(filter))
                    {
                        return q.Where(p => EF.Functions.ILike(p.Title, $"%{filter}%"));
                    }
                    return q;
                },
                sortBy: sortBy,          
                sortDescending: desc,
                offset: offset,
                limit: limit
            );
            return Ok(playlists);
        }
        catch (ArgumentException e)
        {
            return BadRequest(e.Message);
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, e.Message);
        }
    }
    
    
    [HttpPost]
    #if !DEBUG
        [RequireRole(EUserRole.User)]
    #endif
    [ProducesResponseType(typeof(Playlist),StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<Playlist>> CreatePlaylist([FromBody] Playlist entity)
    {
        try
        {
            var result = await playlistRepository.WithAutoSave().Add(entity);
            return Ok(result);
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,e.Message);
        }
    }

    [HttpGet("{id}")]
    #if !DEBUG
        [RequireRole(EUserRole.User)]
    #endif
    [ProducesResponseType(typeof(Playlist),StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string),StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(string),StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<Playlist>> GetPlaylist(int id)
    {
        try
        {
            var result = await playlistRepository.Get(id);
            if (result == null)
                return NotFound();
            if (PlaylistRepository.CheckPlaylistAccess(HttpContext, result))
            { 
                return Ok(result);
            }
            return Forbid();
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,e.Message);
        }
    }
    [HttpPatch]
    #if !DEBUG
        [RequireRole(EUserRole.User)]
    #endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(string),StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdatePlaylist([FromBody] Playlist entity)
    {
        try
        {
            if (!PlaylistRepository.CheckPlaylistManagementAccess(HttpContext, entity, false))
            {
                return Forbid();
            }
            await playlistRepository.WithAutoSave().Update(entity);
            return NoContent();
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,e.Message);
        }
    }
    [HttpDelete]
    #if !DEBUG
        [RequireRole(EUserRole.User)]
    #endif  
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(string),StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(string),StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeletePlaylist([FromBody]Playlist entity)
    {
        try
        {
            if (!PlaylistRepository.CheckPlaylistManagementAccess(HttpContext, entity, false))
            {
                return Forbid();
            }
            var success = await playlistRepository.WithAutoSave().Delete(entity);
            if (!success)
                return NotFound();
            return NoContent();
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,e.Message);
        }
    }
    

}