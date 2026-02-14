import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('.ic-assets.json5 routing configuration', () => {
  it('should exist in the public directory', () => {
    const configPath = path.resolve(__dirname, '../../public/.ic-assets.json5');
    expect(fs.existsSync(configPath)).toBe(true);
  });

  it('should contain RSS feed routing rule with application/rss+xml content type', () => {
    const configPath = path.resolve(__dirname, '../../public/.ic-assets.json5');
    const configContent = fs.readFileSync(configPath, 'utf-8');

    // Check for RSS feed rule
    expect(configContent).toContain('blog/rss.xml');
    expect(configContent).toContain('application/rss+xml');
    expect(configContent).toContain('allow_raw_access');
  });

  it('should contain sitemap routing rule with application/xml content type', () => {
    const configPath = path.resolve(__dirname, '../../public/.ic-assets.json5');
    const configContent = fs.readFileSync(configPath, 'utf-8');

    // Check for sitemap rule
    expect(configContent).toContain('sitemap.xml');
    expect(configContent).toContain('application/xml');
    expect(configContent).toContain('allow_raw_access');
  });
});
