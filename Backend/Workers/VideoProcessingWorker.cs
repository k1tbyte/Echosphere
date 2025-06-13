using System.Collections.Concurrent;
using Backend.Data.Entities;
using Backend.Repositories.Abstraction;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.Workers;

public class VideoProcessingWorker(IServiceScopeFactory scopeFactory) : BackgroundService
{
    private const int TimeoutDays = 7; 
    private static readonly ConcurrentQueue<Guid> _queue = new();

    public static void Enqueue(Guid videoId)
    {
        _queue.Enqueue(videoId);
    }

    public static bool TryDequeue(out Guid videoId)
    {
        return _queue.TryDequeue(out videoId);
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        await base.StartAsync(cancellationToken);
    }

    private async Task UpdateQueueFromDbAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var videoRepository = scope.ServiceProvider.GetRequiredService<IVideoRepository>();
        
        var pendingVideosIds = await videoRepository.GetQueuedVideoIdsAsync();
        foreach (var id in pendingVideosIds)
        {
            Enqueue(id);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        List<Guid> deadVideoIds = [];
        var lastSanityCheck = DateTime.UtcNow.AddHours(-1);
        while (!stoppingToken.IsCancellationRequested)
        {
            while (TryDequeue(out var videoId))
            {
                using var scope = scopeFactory.CreateScope();
                var videoProcessingService = scope.ServiceProvider.GetRequiredService<IVideoProcessingService>();

                var directory = Path.Combine(Constants.UploadsFolderPath, videoId.ToString());
                var videoPath = Path.Combine(directory, "original");
                if (!File.Exists(videoPath))
                {
                    // If the video file does not exist or is older than 7 days, mark it as dead
                    deadVideoIds.Add(videoId);
                    continue;
                }

                try
                {
                    var videoRepository = scope.ServiceProvider.GetRequiredService<IVideoRepository>();
                    var video = await videoRepository.GetVideoByIdAsync(videoId);
                    if (video != null)
                    {
                        switch (video.Status)
                        {
                            case EVideoStatus.Ready:
                                continue;
                            case EVideoStatus.Queued:
                                video.Status = EVideoStatus.Processing;
                                await videoRepository.WithAutoSave().Update(video);
                                break;
                        }
                        try
                        {
                            await videoProcessingService.ProcessVideoMultiQualityAsync(videoPath, videoId.ToString(),
                                video.GetSettings());
                        }
                        catch (Exception ex)
                        {
                            throw new VideoProcessingException($"Error processing video: {videoId}", ex);
                        }

                        video.Status = EVideoStatus.Ready;
                        await videoRepository.WithAutoSave().Update(video);
                    }

                    Directory.Delete(directory, true);
                }
                catch (VideoProcessingException e)
                {
                    Enqueue(videoId);
                    Console.WriteLine(e);
                }
                catch (IOException e)
                {
                    Console.WriteLine($"Error deleting video file {videoPath}: {e}");
                }
                catch (Exception e)
                {
                    Console.WriteLine($"Error {videoPath}: {e}");
                }
            }
            
            // Sanity check to remove dead videos every hour
            if (DateTime.UtcNow - lastSanityCheck > TimeSpan.FromHours(1))
            {
                lastSanityCheck = DateTime.UtcNow;
                foreach (var directory in Directory.GetDirectories(Constants.UploadsFolderPath))
                {
                    var videoPath = Path.Combine(directory, "original");
                    if (!File.Exists(videoPath) || Directory.GetCreationTime(directory) < DateTime.UtcNow.AddDays(-TimeoutDays))
                    {
                        try
                        {
                            Directory.Delete(directory, true);
                        }
                        catch (Exception e)
                        {
                            Console.WriteLine(e);
                        }
                    }
                }

                if (deadVideoIds.Count > 0)
                {
                    using var scope = scopeFactory.CreateScope();
                    var videoRepository = scope.ServiceProvider.GetRequiredService<IVideoRepository>();

                    await videoRepository.Set.Where(e => deadVideoIds.Contains(e.Id))
                        .ExecuteDeleteAsync(cancellationToken: stoppingToken);
                }
                
                deadVideoIds.Clear();
                await UpdateQueueFromDbAsync();
            }
            
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}