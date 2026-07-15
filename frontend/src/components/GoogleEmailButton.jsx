import { useEffect, useRef, useState } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * "Choose Google Account" — email autofill for registration.
 *
 * Renders the official Google Identity Services button (Google's branding
 * policy does not allow custom-styled buttons for the ID-token flow).
 * Clicking it opens the native Google account chooser (FedCM where the
 * browser supports it). The selected account's credential is verified
 * SERVER-SIDE (/api/auth/google-email) before anything is autofilled —
 * the client never trusts the token by itself.
 *
 * Graceful fallback: if no client ID is configured, the GIS script fails to
 * load (ad blockers, offline), or initialization throws, the component
 * renders nothing and manual email entry continues to work untouched.
 */

let gisScriptPromise = null;

const loadGisScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisScriptPromise) {
    gisScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisScriptPromise = null; // allow a retry on next mount
        reject(new Error('Google Identity Services failed to load'));
      };
      document.head.appendChild(script);
    });
  }
  return gisScriptPromise;
};

export default function GoogleEmailButton({ clientId, onEmail }) {
  const containerRef = useRef(null);
  const onEmailRef = useRef(onEmail);
  const [status, setStatus] = useState('loading'); // loading | ready | unavailable
  const [verifying, setVerifying] = useState(false);

  // Keep the latest callback without re-initializing GIS
  useEffect(() => {
    onEmailRef.current = onEmail;
  }, [onEmail]);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;

    const handleCredential = async (response) => {
      if (!response?.credential) return;
      setVerifying(true);
      try {
        const result = await authAPI.verifyGoogleEmail(response.credential);
        const { email, name } = result.data.data;
        onEmailRef.current?.({ email, name });
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            'Could not verify the Google account — please type your email manually'
        );
      } finally {
        setVerifying(false);
      }
    };

    loadGisScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredential,
            context: 'signup',
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: true,
            use_fedcm_for_button: true,
          });
          window.google.accounts.id.renderButton(containerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
          });
          setStatus('ready');
        } catch (initError) {
          setStatus('unavailable');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Not configured or blocked → render nothing; manual entry is unaffected
  if (!clientId || status === 'unavailable') return null;

  return (
    <div className="mt-2">
      <div
        ref={containerRef}
        aria-label="Choose a Google account to fill in your email address"
      />
      {verifying && (
        <p className="text-xs text-gray-500 mt-1" role="status" aria-live="polite">
          Verifying Google account…
        </p>
      )}
    </div>
  );
}
