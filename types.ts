
export interface Subtitle {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface CaptionStyle {
  fontSize: number;
  color: string;
  backgroundColor: string;
  outlineColor: string;
  outlineWidth: number;
  position: 'top' | 'middle' | 'bottom';
  fontFamily: string;
  fontWeight: string;
  opacity: number;
  textShadow: string;
  verticalOffset: number; // percentage from top/bottom
}

export interface VideoState {
  file: File | null;
  url: string | null;
  subtitles: Subtitle[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}
