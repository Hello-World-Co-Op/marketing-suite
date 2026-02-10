import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { createLogger } from '../../utils/logger';

const log = createLogger('Video');

/**
 * Video Player Section for "Tale of Transformation"
 *
 * Instructions for adding the video file:
 * 1. Place your video file in: app/www/public/hello-world-dao.mp4
 * 2. The video player will automatically detect and play it
 * 3. Supported formats: MP4, WebM, OGG
 *
 * Features:
 * - Autoplay when scrolled into view (muted by default)
 * - Click to unmute and show controls
 */

const VIDEO_PATH = '/hello-world-dao.mp4';

export default function VideoSection() {
  const { t } = useTranslation('launch');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [hasVideoFile, setHasVideoFile] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Set up Intersection Observer for autoplay on scroll into view
  useEffect(() => {
    const videoElement = videoRef.current;
    const containerElement = containerRef.current;

    if (!videoElement || !containerElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isPlaying) {
            // Video came into view - autoplay it
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                })
                .catch((error) => {
                  // Autoplay was prevented - usually needs user interaction
                  log.debug('Autoplay prevented:', error);
                });
            }
          }
        });
      },
      {
        threshold: 0.5, // Play when 50% of video is visible
      }
    );

    observer.observe(containerElement);

    return () => {
      observer.disconnect();
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoError = () => {
    setHasVideoFile(false);
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      // Unmute and show controls on first click
      if (isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
      setShowControls(true);

      // Toggle play/pause
      if (!isPlaying) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center">
        {t('video.heading')}
      </h2>

      {/* Video Player */}
      <div
        ref={containerRef}
        className="relative w-full bg-slate-100 rounded-lg overflow-hidden shadow-lg"
      >
        {/* 16:9 aspect ratio container */}
        <div className="relative w-full pb-[56.25%]">
          {hasVideoFile ? (
            <>
              {/* HTML5 Video Player */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                onClick={handleVideoClick}
                onError={handleVideoError}
                controls={showControls}
                muted={isMuted}
                loop
                playsInline
                poster="/world.jpg"
                preload="metadata"
                aria-label="Hello World Co-op introduction video"
              >
                <source src={VIDEO_PATH} type="video/mp4" />
                <p className="p-8 text-center text-slate-600">
                  Your browser doesn't support video playback.
                  <a
                    href={VIDEO_PATH}
                    download
                    className="text-primary-600 hover:underline ml-1 inline-block touch-target"
                  >
                    Download the video
                  </a>
                </p>
              </video>

              {/* Mute indicator overlay (shown when playing and muted) */}
              {isPlaying && isMuted && !showControls && (
                <button
                  onClick={handleVideoClick}
                  className={cn(
                    'absolute bottom-4 right-4 flex items-center gap-2',
                    'bg-black/70 hover:bg-black/80 text-white px-4 py-2 rounded-full',
                    'transition-all shadow-lg',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
                  )}
                  aria-label="Click to unmute and show controls"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                  <span className="text-sm font-medium">Click to unmute</span>
                </button>
              )}

              {/* Play button overlay (hidden when playing or controls shown) */}
              {!isPlaying && !showControls && (
                <button
                  onClick={togglePlay}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    'bg-black/20 hover:bg-black/30 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-600'
                  )}
                  aria-label="Play video"
                >
                  <div className="bg-white/90 rounded-full p-6 shadow-xl hover:bg-white transition-colors">
                    <svg
                      className="w-16 h-16 text-primary-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              )}
            </>
          ) : (
            /* Placeholder for when video file is not available */
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100">
              <svg
                className="w-24 h-24 text-slate-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="text-slate-700 text-lg font-medium mb-2">{t('video.coming_soon')}</p>
              <p className="text-slate-500 text-sm max-w-md">{t('video.description')}</p>
              <p className="text-slate-400 text-xs mt-4 font-mono">
                Place video at: public/hello-world-dao.mp4
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="text-lg leading-relaxed text-center italic text-slate-700">
        {t('video.caption')}
      </p>
    </section>
  );
}
