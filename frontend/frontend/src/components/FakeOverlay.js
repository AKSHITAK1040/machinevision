import React, { useEffect, useMemo, useState } from 'react';

// Fake architecture: overlay boxes that appear at specific timestamps.
export default function FakeOverlay({ player, width = 1280, height = 720 }) {
  const [time, setTime] = useState(0);

  const fakeDetections = useMemo(() => {
    return [
      {
        timeSec: 1.2,
        label: 'Shoes',
        score: 0.83,
        // normalized box
        box: { x: 0.18, y: 0.62, w: 0.26, h: 0.20 },
      },
      {
        timeSec: 3.4,
        label: 'Luxury Watch',
        score: 0.91,
        box: { x: 0.53, y: 0.40, w: 0.20, h: 0.22 },
      },
      {
        timeSec: 6.1,
        label: 'Black Jacket',
        score: 0.78,
        box: { x: 0.30, y: 0.45, w: 0.40, h: 0.38 },
      },
    ];
  }, []);

  useEffect(() => {
    if (!player) return;

    // Keep handler stable for proper cleanup.
    const handler = () => {
      try {
        const t = player?.currentTime?.();
        if (typeof t === 'number' && Number.isFinite(t)) setTime(t);
      } catch {
        // ignore (player may be tearing down)
      }
    };

    player.on?.('timeupdate', handler);

    return () => {
      try {
        player.off?.('timeupdate', handler);
      } catch {
        // ignore
      }
    };
  }, [player]);


  const active = useMemo(() => {
    // Show a detection for a short window around its time.
    const windowSec = 0.35;
    return fakeDetections.filter((d) => Math.abs(d.timeSec - time) <= windowSec);
  }, [fakeDetections, time]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {active.map((d, idx) => {
        const { x, y, w, h } = d.box;
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
              borderRadius: 10,
              border: '2px solid rgba(255,59,59,0.95)',
              background: 'rgba(255,59,59,0.10)',
              boxShadow: '0 0 0 2px rgba(255,59,59,0.20)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: -28,
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.75)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                color: '#fff',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.2,
              }}
            >
              {d.label} {(d.score * 100).toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

