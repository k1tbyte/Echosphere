using Backend.Data.Entities;
using Backend.Repositories;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Backend.Services.Filters;
using Microsoft.AspNetCore.Mvc;
using Minio;
using Minio.DataModel.Args;

namespace Backend.Controllers.Abstraction;

[Route(Constants.DefaultRoutePattern)]

public class FilesController(IS3FileService fileService, IConfiguration config, IAccountRepository accountRepository, IVideoProcessingService videoProcessingService) : ControllerBase
{
    [HttpPost]
    //[RequireRole(EUserRole.User)]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UploadStream([FromQuery] string bucketName = "avatars")
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
                var objName = await fileService.UploadFileStreamAsync(readStream, bucketName, contentType);

                if (bucketName == "avatars")
                {
                    var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == "id")?.Value;
                    await accountRepository.SetAvatar(userId, objName);
                }

                if (bucketName == "videos")
                {
                    await videoProcessingService.ProcessFullVideoPipelineAsync(tempFilePath, bucketName, objName);
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
    //[RequireRole(EUserRole.User)]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(string),StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadFile([FromQuery] string bucketName, [FromQuery] string objectName)
    {
        if (string.IsNullOrEmpty(bucketName) || string.IsNullOrEmpty(objectName))
            return BadRequest("Bucket name and object name are required.");
        try
        {
            var (stream, contentType, fileName) = await fileService.DownloadFileStreamAsync(bucketName, objectName);
            fileName += Path.GetExtension(contentType);
            return File(stream, contentType, fileName);
        }
        catch (Exception ex)
        {
            return NotFound(ex.Message);
        }
    }

    
    
    [HttpGet]
    public async Task<IActionResult> TestHls()
    {
        string testFile = @"D:\test.mp4";
        try
        {
            var stream = new FileStream(testFile, FileMode.Open, FileAccess.Read);
            var objName= await fileService.UploadFileStreamAsync(stream,"videos");
            await videoProcessingService.ProcessFullVideoPipelineAsync(testFile, "videos", objName);
            return Ok("HLS processing done");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error: {ex.Message}");
        }
    }
}
