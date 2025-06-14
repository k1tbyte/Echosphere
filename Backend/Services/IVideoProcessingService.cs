﻿using Backend.Utils;

namespace Backend.Services;


public sealed class VideoSettingsConfig
{
    public sealed class Quality
    {
        public required short Height { get; set; }
        public required int VideoBitrate { get; set; } // Kbps
        public EAudioBitrate? AudioBitrate { get; set; }
    }

    public sealed class VideoSettings
    {
        public required string Codec { get; set; }
        public required string Preset { get; set; }
    }
    public sealed class AudioSettings
    {
        public string Codec { get; set; } = "aac";
        public int DefaultBitrate { get; set; } = 128; // Kbps
    }
    
    public sealed class AdaptiveSettings
    {
        public required Quality[] Qualities { get; set; }
        public required VideoSettings Video { get; set; }
        public AudioSettings Audio { get; set; } = new();
    }
    
    public AdaptiveSettings? Adaptive { get; set; }
    public int ThumbnailsCaptureInterval { get; set; } = 5; // seconds
}

public interface IVideoProcessingService
{
    public Task ProcessVideoSingleQualityAsync(string inputFilePath, string outputPrefix, VideoSettingsConfig? config = null);
    public Task ProcessVideoMultiQualityAsync(string inputFilePath, string outputPrefix, VideoSettingsConfig? config = null);
}
public class VideoProcessingException : Exception
{
    public VideoProcessingException() { }

    public VideoProcessingException(string message)
        : base(message) { }

    public VideoProcessingException(string message, Exception inner)
        : base(message, inner) { }
}