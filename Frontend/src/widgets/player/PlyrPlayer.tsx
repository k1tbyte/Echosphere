"use client";

import React, { forwardRef, useRef, useEffect, useState, CSSProperties, useImperativeHandle } from 'react';
import "plyr/dist/plyr.css";
import "./styles.css"
import { IPlyrPlayerProps } from './index';
import { usePlyrInstance } from './hooks/usePlyrInstance';
import {Spinner} from "@/shared/ui/Loader";

export const PlyrPlayer = forwardRef<HTMLDivElement, IPlyrPlayerProps>(({
                                                                            source,
                                                                            options = {},
                                                                            onReady,
                                                                            className,
                                                                            width = '100%',
                                                                            height,
                                                                            aspectRatio = "16:9",
                                                                            containerStyle = {},
                                                                            fillContainer = false,
                                                                        }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null!);
    const [isClient, setIsClient] = useState(false);

    const memoizedOptions = React.useMemo(() => options || {}, [options]);

    const { isLoaded } = usePlyrInstance({
        containerRef,
        source,
        options: memoizedOptions,
        aspectRatio,
        className,
        onReady
    });

    useImperativeHandle(ref, () => containerRef.current!, []);

    // Set the rendering flag on the client
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Create classes for correct positioning
    const containerClasses = [
        'plyr-react-container',
        className || '',
        fillContainer ? 'plyr-fill-container' : 'plyr-aspect-container'
    ].filter(Boolean).join(' ');

    // Define basic container styles
    const containerStyles: CSSProperties = {
        position: 'relative',
        width: width,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...containerStyle,
    };

    // Height and aspect ratio processing
    if (height) {
        // If an explicit height is specified, we use it
        containerStyles.height = height;
    } else if (fillContainer) {
        // If we need to fill the container - use 100%
        containerStyles.height = '100%';
    } else {
        // Otherwise, we use aspect ratio with modern CSS property
        containerStyles.aspectRatio = aspectRatio.replace(':', '/');
        containerStyles.minHeight = '240px'; // Minimum height for small screens
    }

    return (
        <div
            ref={containerRef}
            className={containerClasses}
            style={containerStyles}
        />
    );
});

PlyrPlayer.displayName = 'PlyrPlayer';
/*

// Export with SSR disabled
export default dynamic(() => Promise.resolve(PlyrPlayer), { ssr: false });*/
