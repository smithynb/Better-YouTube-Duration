# Quick Installation & Testing Guide

## Step 1: Load Extension in Chrome
1. Open Chrome/Chromium browser
2. Go to: `chrome://extensions/`
3. Turn ON "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select this folder: `f:\random projects\BetterYTDuration`

## Step 2: Test the Extension
1. Go to any YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
2. Play the video
3. Click the gear icon (⚙️) in the video player
4. Select "Playback speed"
5. Choose any speed other than "Normal" (like 1.25x or 2x)
6. Look at the duration display - it should show: `original_time (adjusted_time)`

## Expected Results:
- At 1x speed: `4:33` (normal)
- At 2x speed: `4:33 (2:16)` 
- At 0.5x speed: `4:33 (9:06)`

## Troubleshooting:

### Extension not showing up in chrome://extensions/
- Make sure you selected the correct folder containing manifest.json
- Check that all files are present (manifest.json, content.js)

### Extension loads but doesn't work:
- Open Developer Tools (F12) in YouTube
- Check Console tab for any JavaScript errors
- Make sure you're on a video page (not YouTube homepage)
- Try refreshing the page after changing speed

### Still not working:
- Try a different YouTube video
- Make sure YouTube player controls are visible
- The extension only works when speed ≠ 1x

## Debug Mode:
To see what's happening, add this to Chrome DevTools Console on YouTube:
```javascript
console.log('Video element:', document.querySelector('video'));
console.log('Duration element:', document.querySelector('.ytp-time-duration'));
```
