type VideoProvider = 'youtube' | 'vimeo' | null;

export interface ParsedVideo {
    id: string;
    provider: VideoProvider;
    thumbnailUrl: string;
    title?: string;
}


export async function parseVideoUrl(url: string): Promise<ParsedVideo | null> {
    try {
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const youtubeMatch = url.match(youtubeRegex);

        if (youtubeMatch && youtubeMatch[1]) {
            const videoId = youtubeMatch[1];
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

            return {
                id: videoId,
                provider: 'youtube',
                thumbnailUrl,
            };
        }

        const vimeoRegex = /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;
        const vimeoMatch = url.match(vimeoRegex);

        if (vimeoMatch && vimeoMatch[1]) {
            const videoId = vimeoMatch[1];
            // Fetch Vimeo oEmbed data to get the thumbnail and title
            const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch Vimeo data');
            }

            const data = await response.json();

            const thumbnailUrl = data.thumbnail_url
                ? data.thumbnail_url.replace(/_\d+x\d+\./, '_1280x720.')
                : null;

            return {
                id: videoId,
                provider: 'vimeo',
                thumbnailUrl: thumbnailUrl || data.thumbnail_url,
                title: data.title,
            };
        }

        return null;
    } catch (error) {
        console.error('Error parsing video URL:', error);
        return null;
    }
}

export function captureVideoFrame(videoElement: HTMLVideoElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create thumbnail'));
                }
            }, 'image/jpeg', 0.95);
        } catch (error) {
            reject(error);
        }
    });
}