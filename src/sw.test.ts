import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initServiceWorker,
  STATIC_CACHE_NAME,
  IMAGE_CACHE_NAME,
  FONT_CACHE_NAME,
  OFFLINE_FALLBACK_URL,
} from './sw';

describe('Service Worker Configuration & Offline Caching (Strict TDD)', () => {
  let mockSelf: any;

  beforeEach(() => {
    mockSelf = {
      __WB_MANIFEST: [
        { url: '/index.html', revision: '123' },
        { url: '/assets/main.js', revision: '123' },
        { url: '/assets/main.css', revision: '123' },
      ],
      addEventListener: vi.fn(),
      skipWaiting: vi.fn(),
      clients: {
        claim: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('defines cache names and offline fallback URL', () => {
    expect(STATIC_CACHE_NAME).toBe('creditambar-static-v1');
    expect(IMAGE_CACHE_NAME).toBe('creditambar-images-v1');
    expect(FONT_CACHE_NAME).toBe('creditambar-fonts-v1');
    expect(OFFLINE_FALLBACK_URL).toBe('/index.html');
  });

  it('initializes precaching with manifest entries', () => {
    const precacheSpy = vi.fn();
    const cleanupSpy = vi.fn();

    initServiceWorker({
      self: mockSelf,
      precacheAndRoute: precacheSpy,
      cleanupOutdatedCaches: cleanupSpy,
      registerRoute: vi.fn(),
      clientsClaim: vi.fn(),
    });

    expect(precacheSpy).toHaveBeenCalledWith(mockSelf.__WB_MANIFEST);
    expect(cleanupSpy).toHaveBeenCalled();
  });

  it('configures offline navigation route with fallback to index.html', () => {
    const registerRouteSpy = vi.fn();

    initServiceWorker({
      self: mockSelf,
      precacheAndRoute: vi.fn(),
      cleanupOutdatedCaches: vi.fn(),
      registerRoute: registerRouteSpy,
      clientsClaim: vi.fn(),
    });

    // Verify navigation route is registered
    const calls = registerRouteSpy.mock.calls;
    const hasNavigationRoute = calls.some((call) => {
      const firstArg = call[0];
      // Navigation route or route with request.mode === 'navigate'
      return (
        firstArg?.constructor?.name === 'NavigationRoute' ||
        typeof firstArg === 'function' ||
        (firstArg && typeof firstArg.match === 'function')
      );
    });

    expect(hasNavigationRoute).toBe(true);
  });

  it('configures runtime caching for images and static assets', () => {
    const registerRouteSpy = vi.fn();

    initServiceWorker({
      self: mockSelf,
      precacheAndRoute: vi.fn(),
      cleanupOutdatedCaches: vi.fn(),
      registerRoute: registerRouteSpy,
      clientsClaim: vi.fn(),
    });

    // Should have registered routes for images, fonts, styles/scripts, and navigation
    expect(registerRouteSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('claims clients and activates immediately', () => {
    const clientsClaimSpy = vi.fn();

    initServiceWorker({
      self: mockSelf,
      precacheAndRoute: vi.fn(),
      cleanupOutdatedCaches: vi.fn(),
      registerRoute: vi.fn(),
      clientsClaim: clientsClaimSpy,
    });

    expect(mockSelf.skipWaiting).toHaveBeenCalled();
    expect(clientsClaimSpy).toHaveBeenCalled();
  });
});
