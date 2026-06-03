import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./app/page";
import UploadPage from "./app/upload/page";
import WatchPage from "./app/watch/page";
import VideoStateProvider from "./context/VideoStateContext";

export default function App() {
  return (
    <VideoStateProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* Home already renders Navbar; upload/watch handle it too. */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/watch" element={<WatchPage />} />
          {/* fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </VideoStateProvider>
  );
}



