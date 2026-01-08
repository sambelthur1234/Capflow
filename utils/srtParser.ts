
import { Subtitle } from '../types';

function timeToSeconds(timeStr: string): number {
  const [hours, minutes, secondsAndMs] = timeStr.split(':');
  const [seconds, milliseconds] = secondsAndMs.split(',');
  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(seconds) +
    parseInt(milliseconds) / 1000
  );
}

export function parseSRT(srtContent: string): Subtitle[] {
  const blocks = srtContent.trim().split(/\n\s*\n/);
  const subtitles: Subtitle[] = [];

  blocks.forEach((block) => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const id = parseInt(lines[0]);
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      
      if (timeMatch) {
        const start = timeToSeconds(timeMatch[1]);
        const end = timeToSeconds(timeMatch[2]);
        const text = lines.slice(2).join('\n');
        
        subtitles.push({ id, start, end, text });
      }
    }
  });

  return subtitles;
}
