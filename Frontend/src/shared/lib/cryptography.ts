/**
 * Creates a unique file identification by hashing the beginning and end of the file
 * @param file File to be identified
 * @param bytesPerSection Number of bytes read from start and end (default 8MB)
 * @returns Promise with file hash
 */
export async function createFileFingerprint(file: File, bytesPerSection: number = 8 * 1024 * 1024): Promise<string> {
    // Determine whether we are reading the whole file or parts of it
    const fullHash = file.size <= bytesPerSection * 2;

    // If the file is small, read the whole file
    if (fullHash) {
        return hashFileSlice(file, 0, file.size);
    }

    // Otherwise we read the beginning and the end
    const startHash = await hashFileSlice(file, 0, bytesPerSection);
    const endHash = await hashFileSlice(file, Math.max(0, file.size - bytesPerSection), file.size);

    const combinedString = `${startHash}_${endHash}}`;
    return hashString(combinedString);
}

/**
 * Hashes a fragment of a file
 * @param file File for hashing
 * @param start Start position
 * @param end End position
 * @returns Promise with fragment hash
 */
export async function hashFileSlice(file: File, start: number, end: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                resolve(hashHex);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(reader.error);

        // Read the file fragment
        const slice = file.slice(start, end);
        reader.readAsArrayBuffer(slice);
    });
}

/**
 * Hashes a string
 * @param str String to hash
 * @returns Promise with string hash
 */
export async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}