import { useState, useEffect } from 'react';

/**
 * Skeleton loading gate hook.
 * Shows skeleton for a minimum of `minMs` milliseconds,
 * then waits for `dataLoading` to be false before revealing content.
 */
export default function useSkeleton(dataLoading, minMs = 900) {
  const [timerDone, setTimerDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimerDone(true), minMs);
    return () => clearTimeout(timer);
  }, [minMs]);

  const showSkeleton = !timerDone || dataLoading;

  useEffect(() => {
    document.body.style.overflow = showSkeleton ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSkeleton]);

  return { showSkeleton };
}
