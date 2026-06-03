import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoStateContext } from '../context/VideoStateContext';

export default function UploadBox() {
  const navigate = useNavigate();
  const { setSelectedFile, videoUrl } = useContext(VideoStateContext);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const canProceed = useMemo(() => Boolean(videoUrl), [videoUrl]);

  const onPickFile = (file) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file.');
      return;
    }
    setSelectedFile(file);
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    onPickFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    onPickFile(file);
  };

  return (
    <div
      style={{
        width: 'min(900px, 95vw)',
        display: 'grid',
        gap: 16,
      }}
    >
      <h1 style={{ color: '#fff', margin: 0 }}>Upload Video</h1>
      <p style={{ color: '#cfcfcf', margin: 0 }}>
        Drop a video here to preview and start local playback.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? '#ff3b3b' : 'gray'}`,
          background: dragOver ? 'rgba(255,59,59,0.08)' : 'transparent',
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <input
          type="file"
          accept="video/*"
          onChange={onFileInputChange}
          style={{ color: '#fff' }}
        />
        <div style={{ color: '#d0d0d0' }}>or drag & drop a video file</div>
      </div>

      {error && <div style={{ color: '#ff7575' }}>{error}</div>}

      {videoUrl && (
        <div style={{
          borderRadius: 16,
          overflow: 'hidden',
          background: '#0b0b0b',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <video
            src={videoUrl}
            controls
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      )}

      <button
        disabled={!canProceed}
        onClick={() => {
          if (canProceed) navigate('/watch');
        }}
        style={{
          marginTop: 8,
          width: '100%',
          maxWidth: 360,
          justifySelf: 'center',
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.15)',
          background: canProceed ? '#ff3b3b' : '#333',
          color: '#fff',
          fontWeight: 700,
          cursor: canProceed ? 'pointer' : 'not-allowed',
        }}
      >
        Go to Watch
      </button>
    </div>
  );
}

