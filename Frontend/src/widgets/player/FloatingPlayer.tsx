"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useVideoPlayerStore } from '@/store/videoPlayerStore';
import { PlyrPlayer } from './PlyrPlayer';
import { PlyrInstance, PlyrOptions } from './index';
import { useRouter } from 'next/navigation';
import {X, Maximize2, Minimize2, Maximize} from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export const FloatingPlayer: React.FC = () => {
  const router = useRouter();
  const {
    isFloating,
    videoId,
    source,
    options,
    currentTime,
    isPlaying,
    setFloating,
    clearVideo,
    setPlayerInstance,
    syncPlayerState
  } = useVideoPlayerStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState<'small' | 'medium'>('small');
  const [isVisible, setIsVisible] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const playerRef = useRef<HTMLDivElement>(null);
  
  const sizes = {
    small: { width: '320px', height: '180px' },
    medium: { width: '426px', height: '240px' }
  };
  
  // Animation effect when floating state changes
  useEffect(() => {
    if (isFloating) {
      // Small delay to ensure the component is mounted before animation starts
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isFloating]);
  
  // Handle player ready event
  const handlePlayerReady = (player: PlyrInstance) => {
    console.log("player", player)
    setPlayerInstance(player);
    
    // Set the current time if we have one
    if (currentTime > 0) {
      player.currentTime = currentTime;
    }
    
    // Resume playback if it was playing
    if (isPlaying) {
      player.play();
    }
    
    // Add event listeners
    player.on('timeupdate', () => {
      useVideoPlayerStore.getState().setCurrentTime(player.currentTime);
    });
    
    player.on('playing', () => {
      useVideoPlayerStore.getState().setIsPlaying(true);
    });
    
    player.on('pause', () => {
      useVideoPlayerStore.getState().setIsPlaying(false);
    });
  };
  
  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!playerRef.current) return;
    
    setIsDragging(true);
    
    // Store the initial mouse position and the player position
    dragRef.current = { 
      startX: e.clientX, 
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    
    e.preventDefault();
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate how far the mouse has moved from the starting position
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    // Update position based on the original position plus how far the mouse has moved
    const newX = dragRef.current.startPosX - deltaX;
    const newY = dragRef.current.startPosY - deltaY;
    
    // Prevent player from being dragged off-screen
    const maxX = window.innerWidth - parseInt(sizes[size].width);
    const maxY = window.innerHeight - parseInt(sizes[size].height);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Navigate to video page
  const handleMaximize = () => {
    if (!videoId) return;
    
    syncPlayerState();
    setFloating(false);
    router.push(`/video/${videoId}`);
  };
  
  // Toggle size
  const toggleSize = () => {
    setSize(prev => prev === 'small' ? 'medium' : 'small');
  };
  
  // Close player
  const handleClose = () => {
    clearVideo();
  };
  
  // Add and remove global event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  // Don't render if not floating or no source
  if (!isFloating || !source) return null;
  
  return (
    <div
      ref={playerRef}
      className={`fixed z-50 shadow-xl rounded-lg overflow-hidden transition-all duration-300 ${isVisible ? 'floating-player-enter' : 'floating-player-exit'}`}
      style={{
        width: sizes[size].width,
        height: sizes[size].height,
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        opacity: isDragging ? 0.7 : 1
      }}
    >
      <div 
        className="absolute top-0 left-0 w-full h-8 bg-background/80 backdrop-blur-sm z-10 cursor-move flex items-center px-2"
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1 text-xs truncate ml-1">
          {options.title || "Now playing"}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleSize}>
            {size === 'small' ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleMaximize}>
            <Maximize size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClose}>
            <X size={14} />
          </Button>
        </div>
      </div>
      
      <PlyrPlayer
        source={source}
        options={{
          ...options,
          controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
          hideControls: false,
          clickToPlay: true,
          resetOnEnd: false
        }}
        onReady={(e) => window.setTimeout(() => handlePlayerReady(e), 1000)}
        fillContainer={true}
      />
    </div>
  );
}; 