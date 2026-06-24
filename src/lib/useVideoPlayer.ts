import { useEffect, useRef, useState } from 'react';

export function useVideoPlayer(mode: string) {
  const [error, setError] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [videoKey, setVideoKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef = useRef(-1);

  useEffect(() => {
    if (mode !== 'video' || error) {
      return;
    }
    lastTimeRef.current = -1;
    checkInterval.current = setInterval(() => {
      const video = videoRef.current;
      if (!video) {return;}
      if (
        (video.currentTime === lastTimeRef.current && video.currentTime > 0) ||
        (video.currentTime === 0 && lastTimeRef.current === -1)
      ) {
        setStalled(true);
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 2000;
          retryTimer.current = setTimeout(() => {
            setStalled(false);
            setRetryCount((c) => c + 1);
            lastTimeRef.current = 0;
            if (videoRef.current) {
              videoRef.current.load();
              videoRef.current.play();
            }
          }, delay);
        }
      } else {
        if (video.currentTime > 0) {setStalled(false);}
      }
      lastTimeRef.current = video.currentTime === 0 && lastTimeRef.current === -1 ? -1 : video.currentTime;
    }, 5000);
    return () => {
      if (checkInterval.current) {clearInterval(checkInterval.current);}
      if (retryTimer.current) {clearTimeout(retryTimer.current);}
    };
  }, [mode, error, retryCount]);

  const retry = () => {
    setError(false);
    setStalled(false);
    setRetryCount(0);
    setVideoKey((k) => k + 1);
    lastTimeRef.current = -1;
  };

  const handleError = () => {
    if (retryCount < 3) {
      setStalled(true);
      const delay = Math.pow(2, retryCount) * 2000;
      retryTimer.current = setTimeout(() => {
        setStalled(false);
        setRetryCount((c) => c + 1);
        setVideoKey((k) => k + 1);
        lastTimeRef.current = -1;
      }, delay);
    } else {
      setError(true);
    }
  };

  return { videoRef, videoKey, error, stalled, retryCount, retry, handleError, setError };
}
