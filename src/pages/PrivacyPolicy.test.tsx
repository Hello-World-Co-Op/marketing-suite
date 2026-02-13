import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import PrivacyPolicy from './PrivacyPolicy';

function renderPrivacyPolicy() {
  return render(
    <HelmetProvider>
      <PrivacyPolicy />
    </HelmetProvider>,
  );
}

describe('PrivacyPolicy', () => {
  it('renders the page title', () => {
    renderPrivacyPolicy();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders the introduction section', () => {
    renderPrivacyPolicy();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    // Multiple elements mention Hello World Co-Op DAO; just verify at least one exists
    const mentions = screen.getAllByText(/Hello World Co-Op DAO/);
    expect(mentions.length).toBeGreaterThan(0);
  });

  it('renders the data collection section', () => {
    renderPrivacyPolicy();
    expect(screen.getByText('What Data We Collect')).toBeInTheDocument();
  });

  it('renders the GDPR rights section', () => {
    renderPrivacyPolicy();
    expect(screen.getByText(/Your Rights \(GDPR Articles 15-20\)/)).toBeInTheDocument();
  });

  it('renders the contact section with email links', () => {
    renderPrivacyPolicy();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();

    // There are multiple privacy email links on the page; just check at least one exists
    const emailLinks = screen.getAllByRole('link', { name: /privacy@helloworlddao\.com/ });
    expect(emailLinks.length).toBeGreaterThan(0);
    expect(emailLinks[0]).toHaveAttribute('href', 'mailto:privacy@helloworlddao.com');
  });

  it('renders the back button', () => {
    renderPrivacyPolicy();

    // Use getByText with arrow character to find the unique back button
    const backButton = screen.getByRole('button', { name: /Back/ });
    expect(backButton).toBeInTheDocument();
  });

  it('has proper semantic structure with header, main, and footer', () => {
    const { container } = renderPrivacyPolicy();

    expect(container.querySelector('header')).toBeInTheDocument();
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(container.querySelector('footer')).toBeInTheDocument();
  });

  it('renders the footer with copyright', () => {
    renderPrivacyPolicy();

    const currentYear = new Date().getFullYear().toString();
    const yearElements = screen.getAllByText(new RegExp(currentYear));
    expect(yearElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
  });

  it('renders third-party KYC provider information', () => {
    renderPrivacyPolicy();
    expect(screen.getByText('Third-Party KYC Provider')).toBeInTheDocument();

    const personaLink = screen.getByRole('link', { name: /Persona/ });
    expect(personaLink).toHaveAttribute('href', 'https://withpersona.com/legal/privacy-policy');
    expect(personaLink).toHaveAttribute('target', '_blank');
    expect(personaLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
