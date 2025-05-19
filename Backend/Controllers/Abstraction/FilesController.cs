using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers.Abstraction;

[Route(Constants.DefaultRoutePattern)]
public class FilesController(MinioService minio): ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Upload(IFormFile file,[FromQuery] string userId)
    {
        if (file == null || string.IsNullOrWhiteSpace(userId))
            return BadRequest("File and user id cannot be null or empty");
        var key = $"{userId}/{Guid.NewGuid()}_{file.FileName}";
        using var stream = file.OpenReadStream();

        await minio.UploadFileAsync(key, stream, file.ContentType);

        return Ok(new { key });
    }

    [HttpGet]
    public IActionResult GetUrl([FromQuery] string key)
    {
        var url = minio.GetPresignedUrl(key, TimeSpan.FromMinutes(15));
        return Ok(new { url });
    }
}