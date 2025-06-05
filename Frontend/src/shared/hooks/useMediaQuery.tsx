import {useCallback, useEffect, useState } from "react";

interface IMediaProps {
    query: string,
    callback?: (match: boolean) => void;
}

export const useMediaQuery = (width: number) =>
{
    const [targetReached, setTargetReached] = useState(false)

    // @ts-ignore
    const updateTarget = useCallback((e) =>
    {
        if (e.matches) setTargetReached(true)
        else setTargetReached(false)
    }, [])

    useEffect(() =>
    {
        const media = window.matchMedia(`(max-width: ${width}px)`)
        media.addEventListener('change', updateTarget)

        // Check on mount (callback is not called until a change occurs)
        if (media.matches) setTargetReached(true)

        return () => media.removeEventListener('change', updateTarget)
    }, [])

    return targetReached
}
export default useMediaQuery;