import React, { createContext, useEffect, useMemo, useState } from 'react';

export const VideoStateContext = createContext(null);

export default function VideoStateProvider({ children }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const value = useMemo(() => {
    return {
      selectedFile,
      videoUrl,
      setSelectedFile: (file) => {
        setSelectedFile(file);
        if (file) {
          const url = URL.createObjectURL(file);
          setVideoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } else {
          setVideoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      },
      clearVideo: () => {
        setSelectedFile(null);
        setVideoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      },
    };
  }, [selectedFile, videoUrl]);

  return <VideoStateContext.Provider value={value}>{children}</VideoStateContext.Provider>;
}

