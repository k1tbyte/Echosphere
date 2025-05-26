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
    [RequireRole(EUserRole.User)]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadStream([FromQuery] string filename, [FromQuery] string bucketName = "avatars")
    {
        if (string.IsNullOrWhiteSpace(filename))
            return BadRequest("Filename is required as query parameter.");

        var objName = await fileService.UploadFileStreamAsync(Request.Body, filename, bucketName);

        if (bucketName == "avatars")
        {
            var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == "id")?.Value;
            await accountRepository.SetAvatar(userId, objName);
        }

        if (bucketName == "videos")
        {
            string tempFilePath = Path.Combine(Path.GetTempPath(), filename);

            using (var fs = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write))
            {
                await Request.Body.CopyToAsync(fs);
            }
            try
            {
                string outputPrefix = Path.GetFileNameWithoutExtension(filename);
                await videoProcessingService.ProcessFullVideoPipelineAsync(tempFilePath,bucketName, outputPrefix);
                //await videoProcessingService.ProcessAndUploadHlsAsync(tempFilePath, bucketName, outputPrefix);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error during HLS processing: {ex.Message}");
            }
            finally
            {
                if (System.IO.File.Exists(tempFilePath))
                {
                    System.IO.File.Delete(tempFilePath);
                }
            }
        }

        return Ok("File uploaded via stream successfully.");
    }
    
    [HttpGet]
    [RequireRole(EUserRole.User)]
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
            await videoProcessingService.ProcessFullVideoPipelineAsync(testFile, "videos", "test_video_hls");
            return Ok("HLS processing done");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error: {ex.Message}");
        }
    }
}
