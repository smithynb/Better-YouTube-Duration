# Changelog

## Version 1.1.0 - SponsorBlock Compatibility

### 🎉 New Features
- **SponsorBlock Compatibility**: Full integration with SponsorBlock extension
  - Detects when SponsorBlock is modifying duration display
  - Applies playback speed adjustment to SponsorBlock's duration
  - Seamless integration - no duplicate parentheses
  - Automatic detection and real-time updates

### 🔧 Technical Improvements
- Enhanced DOM observation to detect SponsorBlock changes
- Better element detection with multiple selector fallbacks
- Improved debugging with debug mode function
- More robust error handling

### 📝 How SponsorBlock Integration Works
1. **Detection**: Extension detects if SponsorBlock has modified the duration display
2. **Parsing**: Extracts SponsorBlock's adjusted duration from its display format
3. **Calculation**: Applies playback speed division to SponsorBlock's duration
4. **Update**: Replaces SponsorBlock's display with speed-adjusted version
5. **Fallback**: Uses original implementation if no SponsorBlock detected

### 🎯 Examples
**Without SponsorBlock:**
- 1x speed: `10:30`
- 2x speed: `10:30 (5:15)`

**With SponsorBlock (1:45 of sponsors to skip):**
- 1x speed: `10:30 (8:45)` 
- 2x speed: `10:30 (4:22)` ← Speed adjustment applied to SponsorBlock duration

---

## Version 1.0.0 - Initial Release

### ✨ Core Features
- Smart duration display for YouTube videos
- Playback speed adjustment calculation
- YouTube navigation compatibility
- Non-intrusive design (only shows when speed ≠ 1x)
- Real-time updates on speed changes

### 🔧 Technical Implementation
- Manifest V3 browser extension
- Content script injection
- MutationObserver for dynamic content
- Event-driven updates
- Minimal permissions (activeTab only)
