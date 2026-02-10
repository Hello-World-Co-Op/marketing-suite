import { useState, useEffect, useMemo, useCallback } from 'react';
import { SEO } from '../components/SEO';
import { HeroSection } from '../components/HeroSection';
import {
  IntroSection,
  VideoSection,
  EcosystemSection,
  OtterCampSection,
  MarketplaceSection,
  RabbitWholeSection,
  ThinkTankSection,
  CampusesSection,
  ClosingSection,
} from '../components/LaunchContent';
import { ExpandableForm } from '../components/ExpandableForm';
import { VerificationCodeForm } from '../components/VerificationCodeForm';
import { LanguageSelector } from '../components/LanguageSelector';
import { useUserService } from '../hooks/useUserService';
import { showSuccess, showError } from '../utils/toast';
import { throttle } from '../utils/throttle';
import { transformToIndividualRequest } from '../utils/formTransformers';
import { trackFormSubmit, trackEmailVerification, identifyUser } from '../utils/analytics';
import type { InterestFormData } from '../utils/validation';

/**
 * Launch Page - Main entry point for Hello World Co-op
 * Features expandable form that appears below CTA buttons
 * Single shared form instance to prevent data loss
 */
export default function LaunchPage() {
  const { submitIndividual, verifyCode, resendVerificationCode } = useUserService();
  const [activeFormSection, setActiveFormSection] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [formData, setFormData] = useState<Partial<InterestFormData>>({});
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Throttle scroll handler to improve performance
  const handleScroll = useMemo(
    () =>
      throttle(() => {
        const scrollPosition = window.scrollY;
        const viewportHeight = window.innerHeight;

        // Calculate scroll progress for sunrise effect (0 = night, 1 = day)
        // Transition happens over 1.5 viewport heights
        const sunriseProgress = Math.min(scrollPosition / (viewportHeight * 1.5), 1);
        setScrollProgress(sunriseProgress);
      }, 100), // Throttle to max once per 100ms
    []
  );

  const handleToggleForm = (sectionId: string) => {
    // Toggle form: if same section clicked, close it; otherwise open at new section
    setActiveFormSection((prev) => (prev === sectionId ? null : sectionId));
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleFormChange = useCallback((data: Partial<InterestFormData>) => {
    // Update form data state to persist across section changes
    setFormData(data);
  }, []);

  const handleFormClear = useCallback(() => {
    // Clear form data when user clicks X button
    setFormData({});
  }, []);

  const handleFormSubmit = async (data: InterestFormData) => {
    try {
      // Transform form data to canister request format (with encryption)
      const { individual } = await transformToIndividualRequest(data);

      // Submit to user-service canister
      const result = await submitIndividual(individual);

      if (result.success) {
        // Track successful form submission
        trackFormSubmit('waitlist_signup', true);

        // Show verification form instead of success message
        setPendingVerificationEmail(data.email);
        setFormData({}); // Clear form data
      } else {
        // Track failed submission
        trackFormSubmit('waitlist_signup', false, result.message);
        showError(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Track error
      trackFormSubmit('waitlist_signup', false, errorMessage);
      console.error('Failed to submit form:', error);
      showError('An error occurred. Please try again later.');
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!pendingVerificationEmail) {
      throw new Error('No email pending verification');
    }

    const result = await verifyCode(pendingVerificationEmail, code);

    if (result.success) {
      // Track successful verification
      trackEmailVerification(true);
      // Identify user for future tracking
      identifyUser(pendingVerificationEmail);

      showSuccess('Email verified successfully! Welcome to Hello World Co-op!');
      setPendingVerificationEmail(null);
      setActiveFormSection(null);
    } else {
      // Track failed verification
      trackEmailVerification(false, result.message);
      throw new Error(result.message);
    }
  };

  const handleResendCode = async () => {
    if (!pendingVerificationEmail) {
      throw new Error('No email pending verification');
    }

    const result = await resendVerificationCode(pendingVerificationEmail);

    if (result.success) {
      showSuccess('Verification code resent! Check your email.');
    } else {
      throw new Error(result.message);
    }
  };

  const handleCancelVerification = () => {
    setPendingVerificationEmail(null);
    setActiveFormSection(null);
  };

  // Generate sunrise gradient based on scroll progress
  const getSunriseGradient = (progress: number) => {
    // Night (0) -> Deep blue twilight -> Pinkish red sunrise -> Brief yellow -> Sky blue day (1)

    if (progress < 0.25) {
      // Night to early twilight (deep blue)
      const t = progress / 0.25;
      return `linear-gradient(to bottom,
        rgb(0, 0, 0),
        rgb(${Math.round(10 * t)}, ${Math.round(15 * t)}, ${Math.round(35 * t)}))`;
    } else if (progress < 0.65) {
      // Twilight to sunrise (deep blue -> purple -> pinkish red)
      // Extended range for more time in pink/red tones
      const t = (progress - 0.25) / 0.4;
      const r = Math.round(10 + (220 - 10) * t);
      const g = Math.round(15 + (60 - 15) * t);
      const b = Math.round(35 + (80 - 35) * t);
      return `linear-gradient(to bottom,
        rgb(${Math.round(10 + (120 - 10) * t)}, ${Math.round(15 + (40 - 15) * t)}, ${Math.round(35 + (90 - 35) * t)}),
        rgb(${r}, ${g}, ${b}))`;
    } else if (progress < 0.75) {
      // Brief bright yellow/orange phase (shortened)
      const t = (progress - 0.65) / 0.1;
      const topR = Math.round(220 + (255 - 220) * t);
      const topG = Math.round(60 + (140 - 60) * t);
      const topB = Math.round(80 + (40 - 80) * t);
      const bottomR = Math.round(220 + (255 - 220) * t);
      const bottomG = Math.round(100 + (180 - 100) * t);
      const bottomB = Math.round(80 + (60 - 80) * t);
      return `linear-gradient(to bottom,
        rgb(${topR}, ${topG}, ${topB}),
        rgb(${bottomR}, ${bottomG}, ${bottomB}))`;
    } else {
      // Yellow to sky blue (blue comes in stronger)
      const t = (progress - 0.75) / 0.25;
      // From yellow to deep sky blue
      const topR = Math.round(255 - (255 - 70) * t);
      const topG = Math.round(140 + (130 - 140) * t);
      const topB = Math.round(40 + (220 - 40) * t);
      // Bottom fades to lighter sky blue
      const bottomR = Math.round(255 - (255 - 180) * t);
      const bottomG = Math.round(180 + (215 - 180) * t);
      const bottomB = Math.round(60 + (255 - 60) * t);
      return `linear-gradient(to bottom,
        rgb(${topR}, ${topG}, ${topB}),
        rgb(${bottomR}, ${bottomG}, ${bottomB}))`;
    }
  };

  /**
   * Renders a content section with its associated expandable form or verification form
   */
  const renderSectionWithForm = (
    sectionId: string,
    SectionComponent: React.ComponentType<{
      onJoinWaitlist?: () => void;
      isFormOpen?: boolean;
    }>
  ) => (
    <div>
      <SectionComponent
        onJoinWaitlist={() => handleToggleForm(sectionId)}
        isFormOpen={activeFormSection === sectionId}
      />
      {pendingVerificationEmail && activeFormSection === sectionId ? (
        <div
          className="overflow-hidden transition-all duration-500 ease-in-out"
          style={{
            maxHeight: '2000px',
            opacity: 1,
          }}
        >
          <div className="mt-8 p-8 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-primary-200">
            <VerificationCodeForm
              email={pendingVerificationEmail}
              onVerify={handleVerifyCode}
              onResend={handleResendCode}
              onCancel={handleCancelVerification}
            />
          </div>
        </div>
      ) : (
        <ExpandableForm
          isOpen={activeFormSection === sectionId}
          onSubmit={handleFormSubmit}
          onClose={() => setActiveFormSection(null)}
          onClear={handleFormClear}
          defaultValues={formData}
          onFormChange={handleFormChange}
        />
      )}
    </div>
  );

  return (
    <div className="min-h-screen relative">
      <SEO
        title="Hello World Co-Op | Building a Regenerative Future"
        description="Join Hello World Co-Op DAO — a community-driven cooperative building regenerative solutions through decentralized governance, crowdfunding, education, and a sustainable marketplace on the Internet Computer."
        url="https://www.helloworlddao.com/"
      />

      {/* Sunrise Background - Fixed behind everything */}
      <div
        className="fixed inset-0 -z-10 transition-all duration-300"
        style={{ background: getSunriseGradient(scrollProgress) }}
      />

      {/* Language Selector - Fixed top-right corner */}
      <nav aria-label="Language selection" className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </nav>

      {/* Hero Section - Full Height */}
      <header role="banner">
        <HeroSection />
      </header>

      {/* Main Content Section */}
      <main id="content" className="min-h-screen" role="main">
        <div className="container mx-auto px-4 py-16">
          {/* Content Card - Golden ratio sizing: 61.8% of viewport width (1/phi) on tablet+ */}
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 md:p-12">
            <div className="w-full md:max-w-[61.8vw] mx-auto space-y-16">
              {renderSectionWithForm('intro', IntroSection)}

              <VideoSection />
              <EcosystemSection />

              {renderSectionWithForm('otter-camp', OtterCampSection)}

              <MarketplaceSection />
              <RabbitWholeSection />

              {renderSectionWithForm('think-tank', ThinkTankSection)}
              {renderSectionWithForm('campuses', CampusesSection)}
              {renderSectionWithForm('closing', ClosingSection)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
