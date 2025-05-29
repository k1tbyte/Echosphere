using System.Collections.Concurrent;
using Backend.Repositories.Abstraction;
using Backend.Services;

namespace Backend.Workers;

public class VideoProcessingWorker(IServiceScopeFactory scopeFactory) : BackgroundService
{
    private static readonly ConcurrentQueue<Guid> _queue = new();
    private static readonly ConcurrentDictionary<Guid, bool> _queuedIds = new();

    public static void Enqueue(Guid videoId)
    {
        if (_queuedIds.TryAdd(videoId, true))
        {
            _queue.Enqueue(videoId);
        }
    }

    public static bool TryDequeue(out Guid videoId)
    {
        var result = _queue.TryDequeue(out videoId);

        if (result)
        {
            _queuedIds.TryRemove(videoId, out _);
        }

        return result;
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        await UpdateQueueFromDbAsync();
        await base.StartAsync(cancellationToken);
    }

    private async Task UpdateQueueFromDbAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var videoRepository = scope.ServiceProvider.GetRequiredService<IVideoRepository>();

        var pendingVideosIds = await videoRepository.GetProcessingVideosIdsAsync();
        foreach (var id in pendingVideosIds)
        {
            Enqueue(id);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var updateTask = Task.Run(async () =>
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                await UpdateQueueFromDbAsync();
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            if (TryDequeue(out var videoId))
            {
                using var scope = scopeFactory.CreateScope();
                var videoProcessingService = scope.ServiceProvider.GetRequiredService<IVideoProcessingService>();

                var directory = Path.Combine(Constants.UploadsFolderPath, videoId.ToString());
                var videoPath = Path.Combine(directory, "original");

                await videoProcessingService.ProcessVideoMultiQualityAsync(videoPath, "videos", videoId.ToString());
            }
            else
            {
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }

        await updateTask;
    }
}