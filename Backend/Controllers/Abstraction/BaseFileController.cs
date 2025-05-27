using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;

public abstract class BaseFileController(IS3FileService fileService) : ControllerBase
{
    protected async Task<IActionResult> DownloadFromBucket(string bucketName, string? objectName)
    {
        if (string.IsNullOrEmpty(objectName))
            return BadRequest("Object name is required.");
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
}