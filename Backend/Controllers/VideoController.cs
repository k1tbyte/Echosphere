using Backend.Repositories.Abstraction;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route(Constants.DefaultRoutePattern)]
public class VideoController(IS3FileService s3FileService,IVideoRepository videoRepository):ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVideo(string file)
    {
        var userId = HttpContext.User.Claims.FirstOrDefault(o => o.Type == "id")?.Value;
        
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
}