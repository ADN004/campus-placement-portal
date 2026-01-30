import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'desktop-view-preference';
const BANNER_DISMISSED_KEY = 'desktop-view-banner-dismissed';
const DESKTOP_WIDTH = 1280;

/**
 * Detects if the current device is a mobile or tablet device.
 * Uses both user-agent sniffing and screen-size heuristics.
 * Excludes desktop/PC devices so the banner is never shown to them.
 */
function detectMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || navigator.vendor || window.opera || '';

  // Check for common mobile/tablet user-agent strings
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle|PlayBook|BB10|Windows Phone|Fennec|CriOS|FxiOS/i;

  if (mobileRegex.test(ua)) {
    return true;
  }

  // iPadOS 13+ reports as Mac, detect via touch + non-mouse pointer
  if (
    /Macintosh/i.test(ua) &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  ) {
    return true;
  }

  // Heuristic: small physical screen likely means mobile
  // Only treat as mobile if screen width is small AND touch is supported
  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  if (hasTouch && window.screen && window.screen.width <= 1024) {
    return true;
  }

  return false;
}

/**
 * Safely read from localStorage.
 * Returns null if localStorage is unavailable (e.g. private browsing).
 */
function safeGetStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely write to localStorage.
 * Silently fails if localStorage is unavailable.
 */
function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore — private browsing or quota exceeded
  }
}

/**
 * Sets the viewport meta tag to force a specific width.
 */
function setViewport(width) {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }

  if (width === 'device') {
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
  } else {
    meta.setAttribute('content', `width=${width}, initial-scale=0.25`);
  }
}

/**
 * Custom hook to manage desktop/mobile view switching.
 *
 * Returns:
 *   isMobile        — true if device is mobile/tablet
 *   isDesktopView   — true if desktop view is currently active
 *   showBanner      — true if the prompt banner should be shown
 *   switchToDesktop  — function to switch to desktop view
 *   switchToMobile   — function to switch back to mobile view
 *   dismissBanner    — function to dismiss the banner without choosing
 */
export default function useDesktopView() {
  const [isMobile, setIsMobile] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Detect device and apply saved preference on mount
  useEffect(() => {
    const mobile = detectMobileDevice();
    setIsMobile(mobile);

    if (!mobile) {
      // Desktop device — ensure normal viewport, no banner
      setViewport('device');
      setShowBanner(false);
      return;
    }

    // Mobile device — check stored preference
    const preference = safeGetStorage(STORAGE_KEY);
    const bannerDismissed = safeGetStorage(BANNER_DISMISSED_KEY);

    if (preference === 'desktop') {
      setIsDesktopView(true);
      setViewport(DESKTOP_WIDTH);
      setShowBanner(false);
    } else if (preference === 'mobile') {
      setIsDesktopView(false);
      setViewport('device');
      setShowBanner(false);
    } else {
      // No preference saved yet
      setViewport('device');
      // Show banner unless user already dismissed it this session
      setShowBanner(bannerDismissed !== 'true');
    }
  }, []);

  const switchToDesktop = useCallback(() => {
    setIsDesktopView(true);
    setShowBanner(false);
    setViewport(DESKTOP_WIDTH);
    safeSetStorage(STORAGE_KEY, 'desktop');
    safeSetStorage(BANNER_DISMISSED_KEY, 'true');
  }, []);

  const switchToMobile = useCallback(() => {
    setIsDesktopView(false);
    setShowBanner(false);
    setViewport('device');
    safeSetStorage(STORAGE_KEY, 'mobile');
  }, []);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    safeSetStorage(BANNER_DISMISSED_KEY, 'true');
  }, []);

  return {
    isMobile,
    isDesktopView,
    showBanner,
    switchToDesktop,
    switchToMobile,
    dismissBanner,
  };
}
