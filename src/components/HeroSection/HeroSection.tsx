import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface HeroSectionProps {
  onLearnMore?: () => void;
}

/**
 * Hero section for landing page
 * Features console-style typing animation for "Hello World" text above Earth image
 */
export default function HeroSection({ onLearnMore }: HeroSectionProps) {
  const { t } = useTranslation('common');
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fullText = 'Hello World';

  useEffect(() => {
    // Only start typing animation after globe image has loaded
    if (!imageLoaded) return;

    if (displayedText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(fullText.slice(0, displayedText.length + 1));
      }, 250);
      return () => clearTimeout(timeout);
    } else {
      setTypingComplete(true);
    }
  }, [displayedText, imageLoaded]);

  useEffect(() => {
    // Blinking cursor
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  const handleLearnMore = () => {
    if (onLearnMore) {
      onLearnMore();
    } else {
      const contentSection = document.getElementById('content');
      contentSection?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      {/* Console-style Hello World Text */}
      <div className="mb-13" style={{ marginBottom: '3.25rem', minHeight: '4rem' }}>
        {imageLoaded && (
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold text-green-400 text-left">
            <span className="inline-block">{'> '}</span>
            <span className="inline-block min-w-[12ch]">
              {displayedText}
              {showCursor && <span className="inline-block animate-pulse">_</span>}
            </span>
          </h1>
        )}
      </div>

      {/* World Image */}
      <div style={{ marginBottom: '2rem' }}>
        <img
          src="/world.jpg"
          alt={`Earth from space representing ${t('full_name')}'s global community`}
          className="w-80 h-80 md:w-[25rem] md:h-[25rem] lg:w-[30rem] lg:h-[30rem] rounded-full object-cover shadow-2xl"
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Co-op subtitle */}
      {typingComplete && (
        <div style={{ marginBottom: '2rem' }}>
          <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
            {t('org_type')}
          </p>
        </div>
      )}

      {/* Learn More Button */}
      <div className="min-h-[44px]">
        {typingComplete && (
          <button
            onClick={handleLearnMore}
            aria-label={`Learn more about ${t('full_name')}`}
            className="
              px-8 py-3
              bg-white text-black
              rounded-lg
              font-semibold
              hover:bg-gray-100
              focus-visible:outline-white
              transition-all
              touch-target
              animate-fade-in
            "
            style={{ animation: 'fadeIn 0.5s ease-in' }}
          >
            {t('hero.scroll_hint')}
          </button>
        )}
      </div>
    </section>
  );
}
