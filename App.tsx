
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Subtitle, CaptionStyle, VideoState } from './types';
import { parseSRT } from './utils/srtParser';
import { geminiService } from './services/geminiService';

// --- Sub-components ---

const Header = () => (
  <header className="py-6 px-8 flex justify-between items-center border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="font-bold text-white">C</span>
      </div>
      <h1 className="text-xl font-bold tracking-tight text-white uppercase font-bebas">Capflow AI</h1>
    </div>
    <nav className="flex items-center gap-6">
      <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Docs</a>
      <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Templates</a>
      <button className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-200 transition-all">
        Studio v1.1
      </button>
    </nav>
  </header>
);

const EmptyState = ({ onVideoUpload, onSrtUpload }: { 
  onVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onSrtUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <div className="flex flex-col items-center justify-center h-[70vh] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div className="text-center max-w-2xl">
      <h2 className="text-5xl font-bebas mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
        Cinematic Captions in Seconds
      </h2>
      <p className="text-gray-400 text-lg">
        Upload your video and subtitles to begin styling. Powered by Gemini for visual-aware caption placement.
      </p>
    </div>
    
    <div className="flex flex-wrap justify-center gap-6">
      <label className="group relative flex flex-col items-center gap-4 p-8 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
        <input type="file" accept="video/*" onChange={onVideoUpload} className="hidden" />
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-white">Upload Video</p>
          <p className="text-xs text-gray-500">MP4, WebM, MOV</p>
        </div>
      </label>

      <label className="group relative flex flex-col items-center gap-4 p-8 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all">
        <input type="file" accept=".srt" onChange={onSrtUpload} className="hidden" />
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-white">Upload Subtitles</p>
          <p className="text-xs text-gray-500">SRT files only</p>
        </div>
      </label>
    </div>
  </div>
);

const CaptionOverlay = ({ 
  text, 
  style 
}: { 
  text: string, 
  style: CaptionStyle 
}) => {
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    right: '0',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 20,
    ...(style.position === 'top' ? { top: `${style.verticalOffset}%` } : 
       style.position === 'bottom' ? { bottom: `${style.verticalOffset}%` } : 
       { top: '50%', transform: 'translateY(-50%)' })
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${style.fontSize}px`,
    color: style.color,
    backgroundColor: style.backgroundColor,
    fontWeight: style.fontWeight as any,
    padding: '0.2em 0.6em',
    borderRadius: '0.2em',
    textAlign: 'center',
    fontFamily: style.fontFamily,
    maxWidth: '85%',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    opacity: style.opacity,
    textShadow: `0 0 ${style.outlineWidth}px ${style.outlineColor}`,
    lineHeight: '1.2'
  };

  return (
    <div style={containerStyle}>
      <div style={textStyle}>
        {text}
      </div>
    </div>
  );
};

export default function App() {
  const [video, setVideo] = useState<VideoState>({
    file: null,
    url: null,
    subtitles: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0
  });

  const [style, setStyle] = useState<CaptionStyle>({
    fontSize: 24,
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    outlineColor: '#000000',
    outlineWidth: 4,
    position: 'bottom',
    fontFamily: 'Inter',
    fontWeight: '600',
    opacity: 1,
    textShadow: 'none',
    verticalOffset: 10
  });

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRecordingRef = useRef(false);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideo(prev => ({ ...prev, file, url }));
    }
  };

  const handleSrtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      const parsed = parseSRT(text);
      setVideo(prev => ({ ...prev, subtitles: parsed }));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setVideo(prev => ({
        ...prev,
        currentTime: time,
        duration: videoRef.current!.duration
      }));
      if (isRecordingRef.current) {
        setRecordingProgress((time / videoRef.current.duration) * 100);
      }
    }
  };

  const currentSubtitle = video.subtitles.find(
    s => video.currentTime >= s.start && video.currentTime <= s.end
  );

  const suggestAiStyles = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsAiLoading(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg');
        
        const suggestion = await geminiService.suggestStyle(base64);
        if (suggestion) {
          const baseSize = (suggestion.fontSize / 100) * (videoRef.current.clientHeight || 500);
          setStyle(prev => ({
            ...prev,
            color: suggestion.color || '#ffffff',
            backgroundColor: suggestion.backgroundColor || 'rgba(0,0,0,0.5)',
            fontWeight: suggestion.fontWeight || 'bold',
            fontSize: baseSize > 12 ? baseSize : 24,
            verticalOffset: suggestion.verticalOffset || 10
          }));
        }
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoRef.current || !canvasRef.current || isRecording) return;

    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Determine supported MIME types
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    if (!mimeType) {
      alert("Your browser doesn't support video recording.");
      return;
    }

    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingProgress(0);

    // Prepare Video State
    v.pause();
    v.currentTime = 0;
    v.muted = false; // Ensure audio is captured if present

    // Ensure video is ready at start
    await new Promise((resolve) => {
      v.onseeked = resolve;
    });

    // Match canvas to native video resolution
    c.width = v.videoWidth;
    c.height = v.videoHeight;

    // Setup Streams
    const canvasStream = c.captureStream(30);
    // @ts-ignore
    const videoStream = v.captureStream ? v.captureStream() : (v as any).mozCaptureStream ? (v as any).mozCaptureStream() : null;
    
    let combinedStream = canvasStream;
    if (videoStream && videoStream.getAudioTracks().length > 0) {
      combinedStream = new MediaStream([
        canvasStream.getVideoTracks()[0],
        videoStream.getAudioTracks()[0]
      ]);
    }

    const recorder = new MediaRecorder(combinedStream, { 
      mimeType,
      videoBitsPerSecond: 8000000 // High quality
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capflow-cinematic-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      isRecordingRef.current = false;
    };

    const drawLoop = () => {
      if (!isRecordingRef.current) return;

      // Draw Video Frame
      ctx.drawImage(v, 0, 0, c.width, c.height);

      // Compositing the subtitle manually on canvas
      const time = v.currentTime;
      const sub = video.subtitles.find(s => time >= s.start && time <= s.end);
      
      if (sub) {
        ctx.save();
        // Scale font relative to width but bound it for extreme resolutions
        const baseFontSize = (style.fontSize / 1000) * c.width; 
        const fontSize = Math.max(12, baseFontSize);
        
        ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}, Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = sub.text.split('\n');
        const lineHeight = fontSize * 1.25;
        const paddingX = fontSize * 0.6;
        const paddingY = fontSize * 0.2;
        
        let totalHeight = lines.length * lineHeight;
        let yCenter: number;

        if (style.position === 'top') {
          yCenter = (style.verticalOffset / 100) * c.height + (totalHeight / 2);
        } else if (style.position === 'bottom') {
          yCenter = c.height - (style.verticalOffset / 100) * c.height - (totalHeight / 2);
        } else {
          yCenter = c.height / 2;
        }

        lines.forEach((line, i) => {
          const metrics = ctx.measureText(line);
          const textWidth = metrics.width;
          const currentY = yCenter - (totalHeight / 2) + (i * lineHeight) + (lineHeight / 2);

          // Draw background box
          ctx.fillStyle = style.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(
            c.width / 2 - textWidth / 2 - paddingX,
            currentY - lineHeight / 2,
            textWidth + paddingX * 2,
            lineHeight,
            fontSize * 0.15
          );
          ctx.fill();

          // Draw outline
          if (style.outlineWidth > 0) {
            ctx.strokeStyle = style.outlineColor;
            ctx.lineWidth = style.outlineWidth;
            ctx.strokeText(line, c.width / 2, currentY);
          }

          // Draw text
          ctx.fillStyle = style.color;
          ctx.globalAlpha = style.opacity;
          ctx.fillText(line, c.width / 2, currentY);
          ctx.globalAlpha = 1.0;
        });
        ctx.restore();
      }

      if (v.ended || v.paused && v.currentTime >= v.duration - 0.1) {
        if (recorder.state === 'recording') recorder.stop();
      } else {
        requestAnimationFrame(drawLoop);
      }
    };

    recorder.start();
    v.play();
    drawLoop();
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <Header />
      
      {/* Recording Overlay */}
      {isRecording && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-10 animate-in fade-in duration-500">
          <div className="max-w-md w-full text-center space-y-10">
            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80" cy="80" r="74"
                  stroke="currentColor" strokeWidth="6"
                  fill="transparent" className="text-white/5"
                />
                <circle
                  cx="80" cy="80" r="74"
                  stroke="currentColor" strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={465}
                  strokeDashoffset={465 - (465 * recordingProgress) / 100}
                  className="text-blue-500 transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bebas text-5xl text-white">{Math.round(recordingProgress)}%</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Processing</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-4xl font-bebas tracking-widest text-white">Rendering Magic</h2>
              <p className="text-gray-400 text-sm leading-relaxed px-6">
                Your cinematic masterpiece is being composited frame-by-frame. 
                <span className="block mt-1 font-semibold text-blue-400">Keep this tab active for best results.</span>
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: `${i*0.1}s`}} />
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 lg:p-10">
        {!video.url ? (
          <EmptyState onVideoUpload={handleVideoUpload} onSrtUpload={handleSrtUpload} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Main Editor Section */}
            <div className="lg:col-span-8 space-y-6">
              <div className="relative group aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/5">
                <video
                  ref={videoRef}
                  src={video.url}
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  controls
                  crossOrigin="anonymous"
                />
                
                {currentSubtitle && (
                  <CaptionOverlay text={currentSubtitle.text} style={style} />
                )}
                
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Subtitle List */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bebas text-2xl tracking-wide">Transcript</h3>
                    <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-mono text-gray-400">{video.subtitles.length} lines</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={suggestAiStyles}
                      disabled={isAiLoading}
                      className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-full text-xs font-bold hover:bg-blue-600/30 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isAiLoading ? 'Analyzing...' : '✨ AI Vision Style'}
                    </button>
                    <label className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 cursor-pointer transition-all">
                      Import SRT
                      <input type="file" accept=".srt" onChange={handleSrtUpload} className="hidden" />
                    </label>
                  </div>
                </div>
                
                <div className="max-h-[340px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {video.subtitles.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">Upload an SRT file to begin editing.</p>
                    </div>
                  ) : (
                    video.subtitles.map((sub) => (
                      <div 
                        key={sub.id}
                        onClick={() => { if(videoRef.current) videoRef.current.currentTime = sub.start }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group/item ${
                          video.currentTime >= sub.start && video.currentTime <= sub.end
                          ? 'bg-blue-600/20 border-blue-500/50 text-white ring-1 ring-blue-500/20'
                          : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            video.currentTime >= sub.start && video.currentTime <= sub.end
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/10 text-gray-500'
                          }`}>
                            {sub.start.toFixed(2)}s
                          </span>
                          <svg className={`w-4 h-4 transition-opacity ${video.currentTime >= sub.start && video.currentTime <= sub.end ? 'opacity-100' : 'opacity-0'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium leading-relaxed">{sub.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sticky top-28 shadow-xl">
                <h3 className="font-bebas text-2xl mb-8 tracking-wider">Style Designer</h3>
                
                <div className="space-y-8">
                  {/* Typography Selector */}
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Font Family</label>
                    <div className="grid grid-cols-2 gap-2">
                       {['Inter', 'Bebas Neue', 'Monospace', 'Serif'].map(font => (
                         <button
                           key={font}
                           onClick={() => setStyle({...style, fontFamily: font === 'Serif' ? 'Georgia' : font})}
                           className={`py-2 px-3 rounded-xl text-xs transition-all border ${
                             style.fontFamily.includes(font.split(' ')[0]) 
                             ? 'bg-white text-black font-bold' 
                             : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                           }`}
                         >
                           {font}
                         </button>
                       ))}
                    </div>
                  </div>

                  {/* Size and Weight Sliders */}
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Scale</label>
                        <span className="text-[10px] font-mono text-blue-400">{style.fontSize}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="12" max="100" 
                        value={style.fontSize}
                        onChange={e => setStyle({...style, fontSize: parseInt(e.target.value)})}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Weight</label>
                      <div className="grid grid-cols-4 gap-1">
                        {['300', '400', '600', '800'].map(w => (
                          <button
                            key={w}
                            onClick={() => setStyle({...style, fontWeight: w})}
                            className={`py-2 rounded-lg text-[10px] transition-all ${
                              style.fontWeight === w ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-500'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Aesthetic Colors */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Text</label>
                      <div className="relative group">
                        <input 
                          type="color" 
                          value={style.color}
                          onChange={e => setStyle({...style, color: e.target.value})}
                          className="w-full h-12 bg-black/40 rounded-2xl cursor-pointer border border-white/10 p-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Box</label>
                      <input 
                        type="color" 
                        value={style.backgroundColor.startsWith('rgba') ? '#000000' : style.backgroundColor}
                        onChange={e => setStyle({...style, backgroundColor: e.target.value})}
                        className="w-full h-12 bg-black/40 rounded-2xl cursor-pointer border border-white/10 p-1"
                      />
                    </div>
                  </div>

                  {/* Positioning */}
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Positioning</label>
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10">
                      {(['top', 'middle', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setStyle({...style, position: pos})}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all ${
                            style.position === pos 
                            ? 'bg-white text-black shadow-lg' 
                            : 'text-gray-500 hover:text-white'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-mono text-gray-600">
                          <span>Offset</span>
                          <span>{style.verticalOffset}%</span>
                       </div>
                       <input 
                        type="range" 
                        min="2" max="45" 
                        value={style.verticalOffset}
                        onChange={e => setStyle({...style, verticalOffset: parseInt(e.target.value)})}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  </div>

                  {/* Primary Action */}
                  <div className="pt-4">
                    <button 
                      onClick={handleDownload}
                      disabled={isRecording}
                      className={`w-full py-5 rounded-2xl font-bold text-sm tracking-[0.2em] uppercase transition-all shadow-2xl relative overflow-hidden group ${
                        isRecording 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <span className="relative z-10">{isRecording ? 'Processing...' : 'Export Cinematic'}</span>
                      {!isRecording && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      )}
                    </button>
                    <p className="text-[9px] text-gray-600 text-center mt-3 uppercase tracking-widest font-medium">Render in Browser • Pro Quality</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-white/5 bg-black text-center">
        <div className="flex justify-center gap-8 mb-4">
           <span className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">Privacy First</span>
           <span className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">No Servers</span>
           <span className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">GPU Powered</span>
        </div>
        <p className="text-gray-500 text-[10px] font-medium tracking-tighter uppercase opacity-50">
          Capflow AI &copy; 2024. Engineered for creators.
        </p>
      </footer>
    </div>
  );
}
