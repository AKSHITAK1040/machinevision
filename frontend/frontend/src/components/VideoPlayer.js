import React, { useEffect, useMemo, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export default function VideoPlayer({ src, onReady }) {
  const videoNodeRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);

  const isReady = useMemo(() => Boolean(ready), [ready]);

  useEffect(() => {
    // Initialize once.
    if (!videoNodeRef.current || playerRef.current) return;

    const player = videojs(videoNodeRef.current, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      sources: src ? [{ src, type: 'video/mp4' }] : [],
    });

    playerRef.current = player;

    const handleReady = () => {
      setReady(true);
      onReady?.(player);
    };

    player.ready(handleReady);

    return () => {
      try {
        player.dispose();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
  }, [onReady, src]);


  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (src) {
      // Update source.
      player.src({ src, type: 'video/mp4' });
      player.load();
      player.play?.().catch(() => {
        // autoplay may be blocked
      });
    }
  }, [src]);


  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ borderRadius: 18, overflow: 'hidden', background: '#0b0b0b' }}>
        <video
          ref={videoNodeRef}
          className="video-js vjs-big-play-centered"
          style={{ width: '100%', aspectRatio: '16 / 9' }}
          controls
        />
      </div>

      {!isReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            color: '#fff',
          }}
        >
          Loading video...
        </div>
      )}
    </div>
  );
}

