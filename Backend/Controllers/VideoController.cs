using System.Buffers;
using System.Text;
using System.Text.Json;
using Backend.Controllers.Abstraction;
using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Backend.Requests;
using Backend.Services;
using Backend.Services.Filters;
using Backend.Workers;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route(Constants.DefaultRoutePattern)]
public class VideoController(IS3FileService s3FileService,IVideoRepository videoRepository,
    IS3FileService fileService,
    IAccountRepository accountRepository): BaseFileController(fileService)
{
    [HttpPatch]
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> SelfUpdate([FromBody] Video? entity)
    {
        var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == JwtService.UserIdClaimType)?.Value;
        if (entity != null && int.TryParse(userId, out var id) && id == entity.OwnerId)
        {
            await videoRepository.WithAutoSave().Update(entity);
            return Ok();
        }
        return Forbid();
    }
    [HttpPatch]
    [RequireRole(EUserRole.Moder)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update([FromBody] Video? entity)
    {
        if (entity != null)
        {
            await videoRepository.WithAutoSave().Update(entity);
            return Ok();
        }
        return Forbid();
    }

    [HttpGet]
    [ProducesResponseType(typeof(Video),StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<Video>> GetById(Guid id)
    {
        var result = await videoRepository.GetVideoByIdAsync(id);
        var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == JwtService.UserIdClaimType)?.Value;
        if (result == null)
            return NotFound();
        if (result.IsPublic)
        {
            return Ok(result);
        }
        if (await accountRepository.CheckPrivateVideoAccess(userId,result.OwnerId))
        {
            return Ok(result);
        }
        return Forbid();
    }

    [HttpDelete]
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == "id")?.Value;
        var video = await videoRepository.GetVideoByIdAsync(id);
        if (!await accountRepository.CheckPrivateVideoAccess(userId, video.OwnerId))
        {
            return Forbid();
        }
        var success = await accountRepository.WithAutoSave().DeleteById(id);
        if (!success)
            return NotFound();
        return Ok();
    }
    
    private const string BucketName = "videos";
    [HttpGet]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> PlayVideo(string file)
    {
        //Video availability check
        /*var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == "id")?.Value;
        var video = await videoRepository.GetVideoByUrlAsync(file);
        if (video == null)
        {
            return NotFound();
        }
        if (!video.IsPublic&&await accountRepository.CheckPrivateVideoAccess(userId, video.OwnerId))
        {
            return Forbid();
        }*/
        
        
        string masterPlaylist = $"{file}/master.m3u8";
        try
        {
            var result = await s3FileService.DownloadFileStreamAsync("videos", masterPlaylist);
            return File(result.Stream, "application/vnd.apple.mpegurl"); 
        }
        catch (Exception e)
        {
            return NotFound(e.Message);
        }
    }
    
    [HttpPost]
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
        if (video == null || !JwtService.GetUserIdFromContext(HttpContext, out var userId) || video.OwnerId != userId)
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
            return Ok();
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
                Status = EVideoStatus.Pending,
                PreviewUrl = request.PreviewUrl,
                Provider = EVideoProvider.Local,
                Duration = request.Duration,
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
    
    /*
    [HttpPost]
    //[RequireRole(EUserRole.User)]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UploadVideo([FromQuery] bool multiQuality=true)
    {
        var contentType= Request.ContentType ?? "application/octet-stream";
        string tempFilePath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}");
        try
        {
            await using (var fs = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write))
            {
                await Request.Body.CopyToAsync(fs);
            }
            await using (var readStream = new FileStream(tempFilePath, FileMode.Open, FileAccess.Read))
            {

                var objName = await fileService.UploadFileStreamAsync(readStream, BucketName, contentType);
                if (multiQuality)
                { 
                    await videoProcessingService.ProcessVideoMultiQualityAsync(tempFilePath, BucketName, objName);
                }
                else
                {
                    await videoProcessingService.ProcessVideoSingleQualityAsync(tempFilePath, BucketName, objName);
                }
            }

            return Ok("File uploaded and processed successfully.");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error during upload or processing: {ex.Message}");
        }
        finally
        {
            try
            {
                if (System.IO.File.Exists(tempFilePath))
                    System.IO.File.Delete(tempFilePath);
            }
            catch (Exception cleanupEx)
            {
                Console.Error.WriteLine($"Failed to delete temp file {tempFilePath}: {cleanupEx.Message}");
            }
        }
    }
    */
    
    [HttpGet]
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DownloadRawVideo(string objectName)
    {
        try
        {
            return await DownloadFromBucket("videos", objectName + "_raw");
        }
        catch (Exception e)
        {
            return StatusCode(500, $"Error during download: {e.Message}");
        }
    }
    
}