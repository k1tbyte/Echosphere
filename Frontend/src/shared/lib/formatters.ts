// Time units in seconds
export const UNITS = [
    { name: 'year', nameShort: 'y', seconds: 365 * 24 * 60 * 60 },
    { name: 'month', nameShort: 'mo', seconds: 30 * 24 * 60 * 60 },
    { name: 'week', nameShort: 'w', seconds: 7 * 24 * 60 * 60 },
    { name: 'day', nameShort: 'd', seconds: 24 * 60 * 60 },
    { name: 'hour', nameShort: 'h', seconds: 60 * 60 },
    { name: 'minute', nameShort: 'm', seconds: 60 },
    { name: 'second', nameShort: 's', seconds: 1 }
];

export const VIDEO_QUALITY = [
    { minHeight: 4320, label: '8K', color: 'text-violet-400 bg-violet-600/30' },
    { minHeight: 2880, label: '5K', color: 'text-orange-400 bg-orange-600/30' },
    { minHeight: 2160, label: '4K', color: 'text-rose-400 bg-rose-600/30' },
    { minHeight: 1440, label: '2K', color: 'text-emerald-400 bg-emerald-600/30' },
    { minHeight: 1080, label: 'Full HD', color: 'text-blue-400 bg-blue-600/30' },
    { minHeight: 900, label: 'HD+', color: 'text-lime-400 bg-lime-600/30' },
    { minHeight: 720, label: 'HD', color: 'text-green-100 bg-green-300/30' },
    { minHeight: 576, label: 'SD', color: 'text-yellow-200 bg-yellow-400/30' },
    { minHeight: 480, label: '480p', color: 'text-zinc-200 bg-zinc-400/30' }
] as const;

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

        // Fixed logic for minutes: show only if minutes > 0 OR showZero is enabled
        if (minutes > 0 || (showZero && totalSeconds >= 60)) {
            parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
        }

        // For seconds: show always if they > 0, and when they = 0 only if showZero is enabled and total time < 60 sec.
        if (remainingSeconds > 0 || (showZero && totalSeconds < 60)) {
            parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`);
        }

        // Special case: if all parts are empty (e.g. duration = 0 and showZero = false)
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

/**
 * Formats a date to show how much time has passed
 * Examples:
 * - 30 seconds ago -> "30 seconds ago"
 * - 2 minutes ago -> "2 minutes ago"
 * - 1 hour ago -> "1 hour ago"
 * - 2 days ago -> "2 days ago"
 * - 1 week ago -> "1 week ago"
 * - 3 months ago -> "3 months ago"
 * - 2 years ago -> "2 years ago"
 *
 * @param dateString - ISO date string or Date object
 * @param options - formatting options
 * @returns formatted string showing time elapsed
 */
export function formatTimeAgo(
    dateString: string | Date,
    options: {
        format?: 'short' | 'long', // "2m ago" vs "2 minutes ago"
        maxUnit?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year', // maximum unit to show
        showJustNow?: boolean, // show "just now" for very recent times
        justNowThreshold?: number // seconds threshold for "just now" (default: 10)
    } = {}
): string {
    const {
        format = 'long',
        maxUnit = 'year',
        showJustNow = true,
        justNowThreshold = 10
    } = options;

    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        // Handle future dates
        if (diffInSeconds < 0) {
            return format === 'short' ? 'in future' : 'in the future';
        }

        // Handle "just now" case
        if (showJustNow && diffInSeconds <= justNowThreshold) {
            return format === 'short' ? 'now' : 'just now';
        }

        // Find the maximum allowed unit index
        const maxUnitIndex = UNITS.findIndex(unit => unit.name === maxUnit);
        const allowedUnits = UNITS.slice(maxUnitIndex);

        // Find the appropriate unit
        for (const unit of allowedUnits) {
            const value = Math.floor(diffInSeconds / unit.seconds);

            if (value >= 1) {
                if (format === 'short') {
                    return `${value}${unit.nameShort} ago`;
                } else {
                    const unitName = value === 1 ? unit.name : `${unit.name}s`;
                    return `${value} ${unitName} ago`;
                }
            }
        }

        // Fallback for very small times when showJustNow is false
        return format === 'short' ? '0s ago' : '0 seconds ago';

    } catch (error) {
        console.error('Error formatting time ago:', error);
        return format === 'short' ? 'unknown' : 'unknown time';
    }
}

/**
 * Enhanced version with more precise formatting and additional options
 * Can show multiple units (e.g., "2 hours 30 minutes ago")
 *
 * @param dateString - ISO date string or Date object
 * @param options - enhanced formatting options
 * @returns formatted string with more precision
 */
export function formatTimeAgoPrecise(
    dateString: string | Date,
    options: {
        format?: 'short' | 'long',
        maxUnits?: number, // how many units to show (e.g., 2 for "2 hours 30 minutes")
        maxUnit?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year',
        showJustNow?: boolean,
        justNowThreshold?: number,
        useApproximation?: boolean // use "about" prefix for estimates
    } = {}
): string {
    const {
        format = 'long',
        maxUnits = 1,
        maxUnit = 'year',
        showJustNow = true,
        justNowThreshold = 10,
        useApproximation = false
    } = options;

    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        // Handle future dates
        if (diffInSeconds < 0) {
            return format === 'short' ? 'in future' : 'in the future';
        }

        // Handle "just now" case
        if (showJustNow && diffInSeconds <= justNowThreshold) {
            return format === 'short' ? 'now' : 'just now';
        }

        // Find the maximum allowed unit index
        const maxUnitIndex = UNITS.findIndex(unit => unit.name === maxUnit);
        const allowedUnits = UNITS.slice(maxUnitIndex);

        // Calculate multiple units
        const parts: string[] = [];
        let remainingSeconds = diffInSeconds;

        for (const unit of allowedUnits) {
            if (parts.length >= maxUnits) break;

            const value = Math.floor(remainingSeconds / unit.seconds);

            if (value >= 1) {
                if (format === 'short') {
                    parts.push(`${value}${unit.nameShort}`);
                } else {
                    const unitName = value === 1 ? unit.name : `${unit.name}s`;
                    parts.push(`${value} ${unitName}`);
                }
                remainingSeconds -= value * unit.seconds;
            }
        }

        if (parts.length === 0) {
            return format === 'short' ? '0s ago' : '0 seconds ago';
        }

        const timeString = parts.join(format === 'short' ? ' ' : ' ');
        const prefix = useApproximation && parts.length > 1 ? 'about ' : '';

        return format === 'short'
            ? `${prefix}${timeString} ago`
            : `${prefix}${timeString} ago`;

    } catch (error) {
        console.error('Error formatting precise time ago:', error);
        return format === 'short' ? 'unknown' : 'unknown time';
    }
}

export function getVideoQuality(height: number | undefined): { label: string; color: string } | undefined {
    if(height === undefined) {
        return;
    }

    // Handle invalid input
    if (!height || height <= 0) {
        return { label: 'Unknown', color: 'text-gray-400' };
    }

    // Find the first threshold that the height meets or exceeds
    for (const threshold of VIDEO_QUALITY) {
        if (height >= threshold.minHeight) {
            return {
                label: threshold.label,
                color: threshold.color
            };
        }
    }

    // Fallback for very low resolutions (below 144p)
    return { label: `${height}p`, color: 'text-gray-500' };
}