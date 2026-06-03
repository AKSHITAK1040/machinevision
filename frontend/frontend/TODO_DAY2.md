# Day 2 TODO

- [ ] Create shared client-only video state context (Upload → Watch)
  - [ ] Add `src/context/VideoStateContext.js`
- [ ] Create UI components
  - [ ] Add `src/components/UploadBox.js` (file select + preview)
  - [ ] Add `src/components/VideoPlayer.js` (Video.js + fallback)
  - [ ] Add `src/components/DetectionSidebar.js` (AI sidebar placeholder UI)
  - [ ] Add `src/components/FakeOverlay.js` (fake overlay architecture)
- [ ] Wire pages
  - [ ] Update `src/app/upload/page.js` to render `UploadBox` + navigate-to-watch CTA
  - [ ] Update `src/app/watch/page.js` to render `VideoPlayer` + `DetectionSidebar` + `FakeOverlay`
- [ ] Ensure routing works in CRA
  - [ ] Update `src/index.js` (add BrowserRouter and Routes for /, /upload, /watch)
  - [ ] Ensure Navbar links work (react-router-dom)
- [ ] Run verification
  - [ ] `npm start` and confirm upload preview + navigation + playback
  - [ ] `npm run build`

