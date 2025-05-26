using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Route(Constants.DefaultRoutePattern)]
public class VideoController(IS3FileService s3FileService):ControllerBase
{
    [HttpGet("{file}")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetVideo(string file)
    {
        string fileNameWithoutExt = Path.GetFileNameWithoutExtension(file);
        string masterPlaylist = Path.Combine(fileNameWithoutExt, "master.m3u8");
        try
        {
            var result = await s3FileService.DownloadFileStreamAsync("videos", masterPlaylist);
            return File(result.Stream, "application/vnd.apple.mpegurl"); 
        }
        catch (Exception e)
        {
            return BadRequest(e.Message);
        }
    }
}