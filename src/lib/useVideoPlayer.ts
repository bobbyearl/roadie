import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export function useVideoPlayer(mode: string) {
  const [error, setError] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [videoKey, setVideoKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const attachHls = (video: HTMLVideoElement, src: string) => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (!src.includes('.m3u8')) {
      // Non-HLS source, use native
      video.src = src;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 2000,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 3,
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 3) {
                setStalled(true);
                hls.startLoad();
                setRetryCount((c) => c + 1);
              } else {
                setError(true);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError(true);
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setStalled(false);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  const retry = () => {
    setError(false);
    setStalled(false);
    setRetryCount(0);
    setVideoKey((k) => k + 1);
  };

  const handleError = () => {
    // For non-HLS sources, use simple retry
    if (retryCount < 3) {
      setStalled(true);
      setTimeout(() => {
        setStalled(false);
        setRetryCount((c) => c + 1);
        setVideoKey((k) => k + 1);
      }, Math.pow(2, retryCount) * 2000);
    } else {
      setError(true);
    }
  };

  return { videoRef, videoKey, error, stalled, retryCount, retry, handleError, setError, attachHls };
}
