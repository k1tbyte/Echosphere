import { create } from 'zustand';
import { PlyrSource, PlyrOptions, PlyrInstance } from '@/widgets/player';

interface VideoPlayerState {
  // Player state
  isFloating: boolean;
  videoId: string | null;
  source: PlyrSource | null;
  options: PlyrOptions;
  currentTime: number;
  isPlaying: boolean;
  
  // Player instance ref (not stored in state, just for reference)
  playerInstance: PlyrInstance | null;
  
  // Actions
  setFloating: (isFloating: boolean) => void;
  setVideoData: (videoId: string, source: PlyrSource, options?: PlyrOptions) => void;
  clearVideo: () => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlayerInstance: (player: PlyrInstance | null) => void;
  syncPlayerState: () => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>((set, get) => ({
  // Initial state
  isFloating: false,
  videoId: null,
  source: null,
  options: {},
  currentTime: 0,
  isPlaying: false,
  playerInstance: null,
  
  // Actions
  setFloating: (isFloating) => set({ isFloating }),
  
  setVideoData: (videoId, source, options = {}) => set({ 
    videoId, 
    source, 
    options: {
      ...get().options,
      ...options
    }
  }),
  
  clearVideo: () => set({ 
    videoId: null,
    source: null,
    currentTime: 0,
    isPlaying: false,
    isFloating: false
  }),
  
  setCurrentTime: (time) => set({ currentTime: time }),
  
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  setPlayerInstance: (player) => {
    // This won't trigger a re-render since we're not using set()
    // It's just to keep a reference to the player instance
    const state = get();
    state.playerInstance = player;
  },
  
  syncPlayerState: () => {
    const { playerInstance } = get();
    
    if (playerInstance) {
      set({
        currentTime: playerInstance.currentTime,
        isPlaying: !playerInstance.paused
      });
    }
  }
})); 