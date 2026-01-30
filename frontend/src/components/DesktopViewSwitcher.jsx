import { Monitor, Smartphone, X } from 'lucide-react';
import useDesktopView from '../hooks/useDesktopView';

/**
 * DesktopViewSwitcher — prompts mobile users to switch to desktop view.
 *
 * Behaviour:
 *  - On desktop/PC devices: renders nothing at all.
 *  - On mobile (first visit): shows a non-intrusive bottom banner.
 *  - After choosing: remembers preference in localStorage.
 *  - Always renders a small sticky toggle button so users can switch back.
 */
export default function DesktopViewSwitcher() {
  const {
    isMobile,
    isDesktopView,
    showBanner,
    switchToDesktop,
    switchToMobile,
    dismissBanner,
  } = useDesktopView();

  // Don't render anything on desktop devices
  if (!isMobile) return null;

  return (
    <>
      {/* ── Prompt Banner ── */}
      {showBanner && (
        <div
          className="dvs-banner"
          role="alert"
          aria-live="polite"
          aria-label="Desktop view suggestion"
        >
          <div className="dvs-banner-inner">
            <div className="dvs-banner-content">
              <Monitor size={20} className="dvs-banner-icon" aria-hidden="true" />
              <p className="dvs-banner-text">
                Switch to <strong>desktop view</strong> for the full experience
              </p>
            </div>

            <div className="dvs-banner-actions">
              <button
                onClick={switchToDesktop}
                className="dvs-btn-switch"
                aria-label="Switch to desktop view"
              >
                Switch
              </button>
              <button
                onClick={dismissBanner}
                className="dvs-btn-dismiss"
                aria-label="Dismiss desktop view suggestion"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Toggle Button (always visible on mobile) ── */}
      <button
        onClick={isDesktopView ? switchToMobile : switchToDesktop}
        className="dvs-toggle"
        aria-label={isDesktopView ? 'Switch to mobile view' : 'Switch to desktop view'}
        title={isDesktopView ? 'Switch to mobile view' : 'Switch to desktop view'}
      >
        {isDesktopView ? (
          <Smartphone size={18} aria-hidden="true" />
        ) : (
          <Monitor size={18} aria-hidden="true" />
        )}
      </button>
    </>
  );
}
