import React from 'react';

export default function DetectionSidebar({ detections = [] }) {
  return (
    <aside
      style={{
        width: 320,
        maxWidth: '40vw',
        background: '#0d0d10',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: 16,
        color: '#eaeaea',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>AI Detections</h3>
        <div style={{ fontSize: 12, color: '#ff3b3b', fontWeight: 700 }}>FAKE</div>
      </div>

      <div style={{ marginTop: 12, color: '#bdbdbd', fontSize: 13 }}>
        Placeholder UI for YOLO overlays & timestamped detections.
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {detections.length === 0 ? (
          <div style={{ color: '#9e9e9e', fontSize: 13 }}>
            No detections yet.
          </div>
        ) : (
          detections.map((d, idx) => (
            <div
              key={idx}
              style={{
                borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                padding: 10,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 13 }}>{d.label}</div>
              <div style={{ color: '#cfcfcf', fontSize: 12, marginTop: 4 }}>
                t={d.timeSec.toFixed(1)}s • score={d.score.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

