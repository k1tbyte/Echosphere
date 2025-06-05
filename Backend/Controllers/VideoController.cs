using System.Buffers;
using System.Collections;
using System.Text;
using System.Text.Json;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Backend.Controllers.Abstraction;
using Backend.Data.Entities;
using Backend.DTO;
using Backend.Repositories;
using Backend.Repositories.Abstraction;
using Backend.Requests;
using Backend.Services;
using Backend.Services.Filters;
using Backend.Utils;
using Backend.Workers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Controllers;

[Route(Constants.DefaultRoutePattern)]
public class VideoController(IS3FileService s3FileService,IVideoRepository videoRepository,
    IS3FileService fileService,
    IAccountRepository accountRepository,IMemoryCache memoryCache,IMapper mapper): BaseFileController(fileService)
{
    private const string BucketName = "videos";
    
    [HttpPatch]
    #if !DEBUG
        [RequireRole(EUserRole.User)]
    #endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateOwnVideo([FromBody] Video? entity)
    {
        JwtService.GetUserIdFromHttpContext(HttpContext,out int id);
        if (entity != null && id == entity.OwnerId)
        {
            await videoRepository.WithAutoSave().Update(entity);
            return NoContent();
        }
        return Forbid();
    }
    
    [HttpPatch]
    [RequireRole(EUserRole.Moder)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateVideo([FromBody] Video? entity)
    {
        if (entity != null)
        {
            if(!VideoRepository.CheckVideoManagementAccess(HttpContext, entity,false))
                return Forbid();
            await videoRepository.WithAutoSave().Update(entity);
            return NoContent();
        }
        return Forbid();
    }

    [HttpGet]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(VideoDTO),StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Video>> GetVideo(Guid id, bool fetchOwner = false)
    {
        var video = await videoRepository.GetVideoByIdAsync(id, fetchOwner);
        if (video == null)
            return NotFound();
        if (VideoRepository.CheckVideoAccess(HttpContext, video))
        {
            var videoDto = mapper.Map<VideoDTO>(video);
            return Ok(videoDto);
        }
        return Forbid();
    }

    [HttpDelete]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var video = await videoRepository.GetVideoByIdAsync(id);
        if (video == null)
        {
            return NotFound();
        }
        if (!VideoRepository.CheckVideoManagementAccess(HttpContext, video,true))
        {
            return Forbid();
        }
        
        var success = await videoRepository.WithAutoSave().DeleteById(id);
        await s3FileService.DeleteObjectAsync(BucketName, id.ToString());
        if (!success)
            return NotFound();
        return NoContent();
    }
    
    [HttpGet]
    #if !DEBUG
    [RequireRole(EUserRole.User)]
    #endif
    [ProducesResponseType(typeof(IEnumerable<VideoDTO>),StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string),StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<Video>> GetVideos(
        string? filter = null, 
        bool desc = true, 
        bool onlyBlocked = false,
        int offset = 0, 
        int limit = 20,
        string sortBy="CreatedAt",
        int playlistId =-1,
        bool includeOwner = false)
    {
        try
        {
            var resultId = JwtService.GetUserIdFromHttpContext(HttpContext, out var userId);
            JwtService.GetUserRoleFromContext(HttpContext, out var userRole);
            IEnumerable<Video> videos;
            Func<IQueryable<Video>, IQueryable<Video>> videoFilter = q =>
            {
                var filtered = (userRole >= EUserRole.Admin)
                    ? q
                    : q.Where(v => v.IsPublic);

                if (!string.IsNullOrWhiteSpace(filter))
                {
                    filtered = filtered.Where(v => EF.Functions.ILike(v.Title, $"%{filter}%"));
                }
                filtered = onlyBlocked
                    ? filtered.Where(v => v.Status == EVideoStatus.Blocked)
                    : filtered.Where(v => v.Status == EVideoStatus.Ready);
                return includeOwner
                    ? filtered.Include(v => v.Owner)
                    : filtered;
            };

            if (playlistId != -1)
            {
                videos = await videoRepository.GetVideosFromPlaylistAsync(
                    playlistId: playlistId,
                    filter:videoFilter,
                    sortBy: sortBy,          
                    sortDescending: desc,
                    offset: offset,
                    limit: limit
                );
                return Ok(videos);
            }
            videos = await videoRepository.GetAllAsync(
                filter: videoFilter,
                sortBy: sortBy,          
                sortDescending: desc,
                offset: offset,
                limit: limit
            );
            var videosDto = videos.Select(v => mapper.Map<VideoDTO>(v)).ToList();
            return Ok(videosDto);
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
    [ProducesResponseType(typeof(IEnumerable<Video>),StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string),StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string),StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<Video>> GetUserVideos( 
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
            var videos = await videoRepository.GetAllAsync(
                filter: q =>
                {
                    if (userId == -1)
                    {
                        q = q.Where(v => v.OwnerId == loggedUserId);
                    } 
                    else if (userId != loggedUserId)
                    {
                        q = userRole == EUserRole.Admin ? 
                            q.Where(v => v.OwnerId == userId) : 
                            q.Where(
                                v => v.OwnerId == userId && 
                                (userRole == EUserRole.Moder || v.IsPublic) && 
                                v.Status >= EVideoStatus.Ready
                            );
                    }
                    
                    if (!string.IsNullOrWhiteSpace(filter))
                    {
                        return q.Where(v => EF.Functions.ILike(v.Title, $"%{filter}%"));
                    }
                    return q;
                },
                sortBy: sortBy,          
                sortDescending: desc,
                offset: offset,
                limit: limit
            );
            return Ok(videos);
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

    
    
    
    [HttpGet("{id:guid}/{*path}")]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Resource(Guid id, string path)
    {
        try
        {
            if (!memoryCache.TryGetValue($"video_meta_{id}", out Video? video))
            {
                video = await videoRepository.GetVideoByIdAsync(id);
                if (video == null)
                    return NotFound("Video not found");
                memoryCache.Set($"video_meta_{id}", video, TimeSpan.FromMinutes(5));
            }
            /*if (VideoRepository.CheckVideoAccess(HttpContext, video!))
            {
                return Forbid();
            }*/
            var result = await s3FileService.DownloadFileStreamAsync(BucketName, $"{id}/{path}");
            return File(result.Stream, "application/octet-stream", result.FileName);
        }
        catch (Exception e)
        {
            return NotFound(e.Message);
        }
    }
    
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ContinueUpload([FromQuery] Guid id, [FromQuery] long from)
    {
        var directory = Path.Combine(Constants.UploadsFolderPath, id.ToString());
        var videoPath = Path.Combine(directory, "original");
        if (!System.IO.File.Exists(videoPath))
        {
            return NotFound("Video upload not found");
        }
        
        var video = await videoRepository.GetVideoByIdAsync(id);
        if (video == null || !JwtService.GetUserIdFromHttpContext(HttpContext, out var userId) || video.OwnerId != userId)
        {
            return NotFound("Video upload not found");
        }

        if (video.UploadSize == null || video.UploadSize == video.Size)
        {
            return BadRequest("Video upload already completed");
        }

        if (video.UploadSize != from)
        {
            var response = new
            {
                uploadSize = video.UploadSize,
                error = "Continue from position is less than current upload size"
            };
            return Conflict(JsonSerializer.Serialize(response, JsonSerializerOptions.Web));
        }
        
        
        var buffer = ArrayPool<byte>.Shared.Rent(8192); 

        int bytesRead = 0;
        long videoBytesProcessed = video.UploadSize!.Value;
        var status = video.Status;
        var responseCode = 200;
        
        try
        {
            await using var videoStream = System.IO.File.OpenWrite(videoPath);
            videoStream.Seek(videoBytesProcessed, SeekOrigin.Begin);

            var i = 0;
            while ((bytesRead = await Request.Body.ReadAsync(buffer)) > 0 &&
                   videoBytesProcessed < video.Size!.Value)
            {
                await videoStream.WriteAsync(buffer.AsMemory(0, bytesRead));
                videoBytesProcessed += bytesRead;
                /*if (i == 10)
                {
                    throw new IOException("Upload interrupted by client");
                }*/

                i++;
            }
            status = EVideoStatus.Queued;
        }
        catch (Exception e)
        {
            if(e is not IOException or OperationCanceledException)
            { 
                return StatusCode(500, $"Error during upload: {e.Message}");
            }
            responseCode = 500;
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
        
        if (videoBytesProcessed > video.UploadSize.Value)
        {
            video.Status = status;
            video.UploadSize = videoBytesProcessed;
            await videoRepository.WithAutoSave().Update(video);

            if (status == EVideoStatus.Queued)
            {
                VideoProcessingWorker.Enqueue(video.Id);
            }
            
        }
        
        return StatusCode(responseCode);
    }
    
    [HttpPost]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(string), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> InitiateUpload([FromQuery] string info)
    {
        var decoded = Convert.FromBase64String(info);
        UploadVideoRequest request;
        try
        {
            var json = Encoding.UTF8.GetString(decoded);
            request = JsonSerializer.Deserialize<UploadVideoRequest>(json, JsonSerializerOptions.Web)
                      ?? throw new ArgumentException("Invalid request format");
            if (request.Settings?.Adaptive != null)
            {
                // remove duplicates and order
                request.Settings.Adaptive.Qualities =
                    request.Settings.Adaptive.Qualities.ToDictionary(o => o.Height)
                        .OrderByDescending(o => o.Key)
                        .Select(o => o.Value)
                        .ToArray();
            }
        }
        catch (Exception e)
        {
            return BadRequest(e.Message);
        }

        if (string.IsNullOrEmpty(request.Title))
        {
            return BadRequest("Title is required");
        }

        var userId = int.Parse(HttpContext.User.Claims.FirstOrDefault(o => o.Type == JwtService.UserIdClaimType)?.Value!);
        var id = Guid.NewGuid();
        
        if (request.Provider > EVideoProvider.Local)
        {
            if(request.Provider > EVideoProvider.Vimeo)
            {
                return BadRequest("Invalid video provider");
            }
            
            if (string.IsNullOrEmpty(request.Id))
            {
                return BadRequest("Video ID is required for third-party providers");
            }

            if (request.IsPublic)
            {
                return BadRequest("Videos with third-party providers cannot be public");
            }
            
            await videoRepository.WithAutoSave().Add(new Video
            {
                Id = id,
                Title = request.Title,
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                OwnerId = userId,
                VideoUrl = request.Id,
                Status = EVideoStatus.Ready,
                PreviewUrl = request.PreviewUrl,
                Provider = request.Provider.Value
            });
            return NoContent();
        }

        if(request.SizeBytes is null or <= 0)
        {   
            return BadRequest("Video size must be specified");
        }
        
        var directory = Path.Combine(Constants.UploadsFolderPath, id.ToString());
        if (Directory.Exists(directory))
        {
            return Conflict("Video with this ID already exists");
        }
        
        Directory.CreateDirectory(directory);
        
        int bytesRead = 0;
        var buffer = ArrayPool<byte>.Shared.Rent(8192);

        try
        {
            if (request.PreviewSizeBytes > 0)
            {
                var previewPath = Path.Combine(directory, "preview");
                await using var previewStream = System.IO.File.Open(previewPath, FileMode.OpenOrCreate);
                try
                {
                    int remainingPreviewBytes = (int)request.PreviewSizeBytes.Value;
                    while (remainingPreviewBytes > 0)
                    {
                        int bytesToRead = Math.Min(buffer.Length, remainingPreviewBytes);
                        bytesRead = await Request.Body.ReadAsync(buffer, 0, bytesToRead);

                        if (bytesRead == 0)
                        {
                            throw new IOException("Unexpected end of stream when reading preview");
                        }

                        await previewStream.WriteAsync(buffer, 0, bytesRead);
                        remainingPreviewBytes -= bytesRead;
                    }

                    await previewStream.FlushAsync();
                }
                catch
                {
                    System.IO.File.Delete(previewPath);
                    return StatusCode(500, "Error processing preview stream");
                }
            }

            var videoPath = Path.Combine(directory, "original");
            await using var videoStream = System.IO.File.OpenWrite(videoPath);
            
            await videoRepository.WithAutoSave().Add(new Video
            {
                Title = request.Title,
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                OwnerId = userId,
                Id = id,
                Size = request.SizeBytes,
                UploadSize = 0,
                IsPublic = request.IsPublic,
                Status = EVideoStatus.Pending,
                PreviewUrl = request.PreviewUrl,
                Provider = EVideoProvider.Local,
                Duration = request.Duration,
                Settings = request.Settings != null 
                    ? JsonSerializer.Serialize(request.Settings, Constants.DefaultJsonOptions) 
                    : null,
            });
            
            // partial success response
            return StatusCode(206, new { id = id.ToString() });
        }
        catch (Exception e)
        {
            Console.WriteLine($"Error during video upload: {e.Message}");
            return StatusCode(500, $"Error during upload: {e.Message}");
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }
    

    
    [HttpGet]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DownloadRawVideo(string objectName)
    {
        try
        {
            return await DownloadFromBucket(BucketName, objectName + "_raw");
        }
        catch (Exception e)
        {
            return StatusCode(500, $"Error during download: {e.Message}");
        }
    }

    [HttpGet]
#if !DEBUG
        [RequireRole(EUserRole.User)]
#endif
    public async Task<VideoSettingsSchema> SettingsSchema()
    {
        Response.ContentType = "application/json";
        if (FFmpegTools.SchemaJson != null)
        {
            return FFmpegTools.Schema;
        }
        var schema = await FFmpegTools.GetSettingsSchemaAsync();
        return FFmpegTools.Schema;
    }
}