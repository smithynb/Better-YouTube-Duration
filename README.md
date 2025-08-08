# Better YouTube Duration

Chromium browser extension that displays the real video duration adjusted for playback speed in YouTube's HTML5 player. 

## How it Works
At playback speed **other than 1x**: 
- Shows real duration of the video (Total Duration / Speed) in parentheses 

When SponsorBlock is installed and has segments to skip **WITH speed other than 1x**:
- Divides duration without sponsor segment by playback speed

## Installation

### For Development/Testing:

1. Clone or download this repository
2. Open Chrome/Chromium and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension folder
5. The extension will be installed and active on YouTube

### Manual Installation:

1. Download the latest release
2. Extract the files to a folder
3. Follow the development installation steps above

## Usage

1. Navigate to any YouTube video
2. Change the playback speed using YouTube's speed controls (click the gear icon → Playback speed)
3. The duration will automatically update to show both original and adjusted times

## Technical Details

### How It Works:
- **Content Script**: Injects into YouTube pages to monitor video elements
- **DOM Observation**: Uses MutationObserver to detect YouTube's dynamic content changes
- **Event Listening**: Monitors `ratechange` events on video elements
- **Duration Calculation**: Calculates adjusted duration as `original_duration / playback_rate`
- **SponsorBlock Integration**: Detects SponsorBlock's duration modifications and applies speed adjustment to them rather than making its own duration label

## Known Problems

1. Does not fully work with SponsorBlock.
