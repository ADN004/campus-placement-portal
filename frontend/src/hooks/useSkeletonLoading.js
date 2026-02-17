import { useState, useEffect } from 'react';

export default function useSkeletonLoading(dataLoading, delay = 900) {
  const [skeletonVisible, setSkeletonVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setSkeletonVisible(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const showSkeleton = skeletonVisible || dataLoading;

  // Lock scroll during skeleton
  useEffect(() => {
    if (showSkeleton) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSkeleton]);

  return showSkeleton;
}
