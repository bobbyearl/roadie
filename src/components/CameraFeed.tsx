import { useEffect, useRef, useState } from 'react'
import { type Camera } from '../lib/cameras'
import { X } from 'lucide-react'
import './CameraFeed.css'

interface CameraFeedProps {
  camera: Camera
  mode: string
  onRemove: () => void
  setDetailCam: (c: Camera) => void
}

export function CameraFeed({ camera, mode, onRemove, setDetailCam }: CameraFeedProps) {
  const [error, setError] = useState(false)
  const [stalled, setStalled] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [videoKey, setVideoKey] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTimeRef = useRef(-1)

  useEffect(() => {
    if (mode !== 'video' || error) return
    lastTimeRef.current = -1
    checkInterval.current = setInterval(() => {
      const video = videoRef.current
      if (!video) return
      if ((video.currentTime === lastTimeRef.current && video.currentTime > 0) || (video.currentTime === 0 && lastTimeRef.current === -1)) {
        setStalled(true)
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 2000
          retryTimer.current = setTimeout(() => {
            setStalled(false)
            setRetryCount((c) => c + 1)
            lastTimeRef.current = 0
            if (videoRef.current) {
              videoRef.current.load()
              videoRef.current.play()
            }
          }, delay)
        }
      } else {
        if (video.currentTime > 0) {
          setStalled(false)
        }
      }
      lastTimeRef.current = video.currentTime === 0 && lastTimeRef.current === -1 ? -1 : video.currentTime
    }, 5000)
    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current)
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [mode, error, retryCount])

  const retry = () => { setError(false); setStalled(false); setRetryCount(0); setVideoKey((k) => k + 1); lastTimeRef.current = -1 }

  const handleError = () => {
    if (retryCount < 3) {
      setStalled(true)
      const delay = Math.pow(2, retryCount) * 2000
      retryTimer.current = setTimeout(() => {
        setStalled(false)
        setRetryCount((c) => c + 1)
        setVideoKey((k) => k + 1)
        lastTimeRef.current = -1
      }, delay)
    } else {
      setError(true)
    }
  }

  return (
    <div className="feed-item">
      <div className="feed-header">
        <span className="feed-title">{camera.description}</span>
      </div>
      <div className="feed-media">
        {error ? (
          <div className="feed-error">
            <p className="feed-error-text">Feed unavailable</p>
            <button className="feed-error-retry" onClick={retry}>Retry</button>
          </div>
        ) : mode === 'video' ? (
          <>
            <video key={videoKey} ref={videoRef} src={camera.video_url} autoPlay muted playsInline controls onError={handleError} />
            {stalled && (
              <div className="feed-stalled-overlay">
                <span className="feed-stalled">unstable feed{retryCount > 0 ? ` (retry ${retryCount}/3)` : ''}</span>
              </div>
            )}
          </>
        ) : (
          <img src={camera.image_url} alt={camera.description} onError={() => setError(true)} />
        )}
      </div>
      <div className="feed-footer">
        <button className="feed-footer-btn" onClick={() => setDetailCam(camera)}>Detail</button>
        <button className="feed-footer-btn" onClick={onRemove}>Remove</button>
      </div>
    </div>
  )
}
