/**
 * Formats duration in seconds to human-readable format
 * Examples:
 * - 65 sec -> 1:05
 * - 3600 sec -> 1:00:00
 * - 7265 sec -> 2:01:05
 *
 * @param seconds - duration in seconds
 * @param showZeroHours - whether to show hours when they're 0 (e.g., 0:05:30)
 * @returns formatted string
 */
export function formatDuration(seconds: number, showZeroHours: boolean = false): string {
    if (!seconds && seconds !== 0) return '--:--';

    // Round to whole number
    const totalSeconds = Math.floor(seconds);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    // Add leading zeros to minutes and seconds
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSeconds.toString().padStart(2, '0');

    // Format based on hours presence
    if (hours > 0 || showZeroHours) {
        return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
        return `${minutes}:${formattedSeconds}`;
    }
}

/**
 * Extended version with more detailed formatting
 * - Support for days for very long videos
 * - Option to choose full format with labels (2 hours 3 minutes)
 *
 * @param seconds - duration in seconds
 * @param options - formatting options
 * @returns formatted string
 */
export function formatDurationExtended(
    seconds: number,
    options: {
        format?: 'compact' | 'full',
        showDays?: boolean,
        showZero?: boolean
    } = {}
): string {
    if (!seconds && seconds !== 0) return '--:--';

    const { format = 'compact', showDays = false, showZero = false } = options;

    // Round to whole number
    const totalSeconds = Math.floor(seconds);

    let days = 0;
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let remainingSeconds = totalSeconds % 60;

    // If we need to show days
    if (showDays && hours >= 24) {
        days = Math.floor(hours / 24);
        hours = hours % 24;
    }

    if (format === 'compact') {
        // Compact format (2:30:45)
        const parts: string[] = [];

        if (days > 0 || (showZero && showDays)) {
            parts.push(`${days}`);
        }

        if (parts.length > 0 || hours > 0 || (showZero && (days > 0 || showDays))) {
            parts.push(`${hours.toString().padStart(2, '0')}`);
        }

        parts.push(minutes.toString().padStart(2, '0'));
        parts.push(remainingSeconds.toString().padStart(2, '0'));

        return parts.join(':');
    } else {
        // Full format with labels
        const parts: string[] = [];

        if (days > 0 || (showZero && showDays)) {
            parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
        }

        if (hours > 0 || (showZero && (days > 0 || showDays))) {
            parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
        }

        // Исправленная логика для минут: показываем только если минуты > 0 ИЛИ showZero включен
        if (minutes > 0 || (showZero && totalSeconds >= 60)) {
            parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
        }

        // Для секунд: показываем всегда если они > 0, а когда они = 0 только если showZero включен И общее время < 60 сек
        if (remainingSeconds > 0 || (showZero && totalSeconds < 60)) {
            parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`);
        }

        // Специальный случай: если все части пустые (например, длительность = 0 и showZero = false)
        if (parts.length === 0) {
            return '0 seconds';
        }

        return parts.join(' ');
    }
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

    return `${formattedSize} ${sizes[i]}`;
}