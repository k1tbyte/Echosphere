"use client";

import React, { useRef, useEffect, useState, CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import "plyr/dist/plyr.css";
import "./styles.css"
import { PlyrPlayerProps } from './types';
import { usePlyrInstance } from './hooks/usePlyrInstance';

export const PlyrPlayer: React.FC<PlyrPlayerProps> = ({
                                                          source,
                                                          options = {},
                                                          onReady,
                                                          onPlay,
                                                          onPause,
                                                          onEnded,
                                                          onTimeUpdate,
                                                          onSeeking,
                                                          onSeeked,
                                                          onProgress,
                                                          onRateChange,
                                                          onQualityChange,
                                                          onCaptionsEnabled,
                                                          onCaptionsDisabled,
                                                          onLanguageChange,
                                                          onControlsHidden,
                                                          onControlsShown,
                                                          onEnterFullscreen,
                                                          onExitFullscreen,
                                                          onEnterpip,
                                                          onLeavepip,
                                                          className,
                                                          width = '100%',
                                                          height,
                                                          aspectRatio = "16:9",
                                                          containerStyle = {},
                                                          fillContainer = false,
                                                      }) => {
    const containerRef = useRef<HTMLDivElement>(null!);
    const [isClient, setIsClient] = useState(false);

    const { isLoaded } = usePlyrInstance({
        containerRef,
        source,
        options,
        aspectRatio,
        className,
        onReady,
        onPlay,
        onPause,
        onEnded,
        onTimeUpdate,
        onSeeking,
        onSeeked,
        onProgress,
        onRateChange,
        onQualityChange,
        onCaptionsEnabled,
        onCaptionsDisabled,
        onLanguageChange,
        onControlsHidden,
        onControlsShown,
        onEnterFullscreen,
        onExitFullscreen,
        onEnterpip,
        onLeavepip,
    });

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
        >
            {!isClient && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#1a1a1a',
                    color: '#e5e5e5',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}>
                    <div>Loading player...</div>
                </div>
            )}
        </div>
    );
};

// Export with SSR disabled
export default dynamic(() => Promise.resolve(PlyrPlayer), { ssr: false });