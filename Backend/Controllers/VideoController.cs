using Backend.Controllers.Abstraction;
using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route(Constants.DefaultRoutePattern)]
public class VideoController(IS3FileService s3FileService,IVideoRepository videoRepository,
    IS3FileService fileService, IVideoProcessingService videoProcessingService,
    IAccountRepository accountRepository):BaseFileController(fileService)
{
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