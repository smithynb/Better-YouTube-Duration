// Better YouTube Duration - Content Script
// Shows adjusted video duration based on playback speed

(function() {
    'use strict';

    let currentVideo = null;
    let currentDurationElement = null;
    let observer = null;
    let speedObserver = null;
    let originalDuration = '';
    let sponsorFreeDuration = null; // Store calculated sponsor-free duration in seconds
    let lastPlaybackRate = 1; // Track the last playback rate to detect changes
    let hasModifiedSponsorBlock = false; // Track if we've modified SponsorBlock's display
    // New flags to ensure we only capture a clean baseline from SponsorBlock once
    let baselineCaptured = false; // Once true, do not overwrite sponsorFreeDuration until video changes
    let awaitingBaselineAt1x = false; // Set when we return to 1x; capture on next SB DOM change
    let debugMode = false; // Set to true for debugging
    // NEW: Track the exact text we last wrote into SponsorBlock so we can detect real SB-originated updates
    let lastAdjustedSponsorText = '';
    // Guard to ignore observer callbacks caused by our own DOM writes to SponsorBlock element
    let suppressSBObserver = false;

    function log(...args) {
        if (debugMode) {
            console.log('[BetterYTDuration]', ...args);
        }
    }

    // Function to format time from seconds to HH:MM:SS or MM:SS
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    // Function to parse time string (MM:SS or HH:MM:SS) to seconds
    function parseTimeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(part => parseInt(part, 10));
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1]; // MM:SS
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
        }
        return 0;
    }

    // Function to detect if SponsorBlock is active and has modified the duration
    function getSponsorBlockElement() {
        return document.getElementById('sponsorBlockDurationAfterSkips');
    }

    // Function to calculate sponsor-free duration from SponsorBlock's display
    function calculateSponsorFreeDuration() {
        const sponsorBlockElement = getSponsorBlockElement();
        
        if (!sponsorBlockElement || !sponsorBlockElement.textContent.trim()) {
            return null; // No SponsorBlock or no content
        }

        // SponsorBlock format is " (MM:SS)" or " (H:MM:SS)"
        const text = sponsorBlockElement.textContent.trim();
        const match = text.match(/^\s*\(([^)]+)\)\s*$/);
        
        if (match && match[1]) {
            const timeStr = match[1].trim();
            const seconds = parseTimeToSeconds(timeStr);
            log(`Calculated sponsor-free duration: ${timeStr} = ${seconds} seconds`);
            return seconds;
        }
        
        return null;
    }

    // Function to detect and store the baseline sponsor-free duration
    function detectSponsorFreeDuration() {
        if (!currentVideo || currentVideo.playbackRate !== 1) {
            return false; // Only detect at 1x speed for accuracy
        }

        // Only capture once per video, and only when we're awaiting a fresh SB update at 1x
        if (baselineCaptured || !awaitingBaselineAt1x) {
            log('Skipping detection - baseline already captured or not awaiting baseline');
            return false;
        }

        // Don't capture if we've already modified the display
        if (hasModifiedSponsorBlock) {
            log('Skipping detection - we have already modified SponsorBlock display');
            return false;
        }

        const calculated = calculateSponsorFreeDuration();
        if (calculated !== null && calculated > 0) {
            sponsorFreeDuration = calculated;
            baselineCaptured = true;
            awaitingBaselineAt1x = false;
            log(`Stored sponsor-free duration: ${formatTime(sponsorFreeDuration)} (baseline captured)`);
            return true;
        }
        
        return false;
    }

    // Function to update duration display
    function updateDurationDisplay() {
        if (!currentVideo || !currentDurationElement) {
            log('Missing video or duration element');
            return;
        }

        const playbackRate = currentVideo.playbackRate;
        log(`Updating duration display, speed: ${playbackRate}x (previous: ${lastPlaybackRate}x)`);
        
        const sponsorBlockElement = getSponsorBlockElement();
        const hasSponsorBlock = sponsorBlockElement && sponsorBlockElement.textContent.trim();
        
        // If at 1x speed, set awaiting flag on transition and let SB update before capturing
        if (playbackRate === 1) {
            if (lastPlaybackRate !== 1) {
                awaitingBaselineAt1x = true;
                log('Returned to 1x - awaiting SponsorBlock baseline update');
            }

            // We never capture baseline here; do it on SponsorBlock DOM change via observer

            // Reset modification flag at 1x so SB can write its own value
            hasModifiedSponsorBlock = false;
            // Also clear our last adjusted text so we can detect the next SB-originated write
            lastAdjustedSponsorText = '';

            // If SB is not present at all, clear stale baseline
            if (!hasSponsorBlock) {
                sponsorFreeDuration = null;
                baselineCaptured = false;
            }
            
            // Restore original duration display at 1x speed
            if (originalDuration) {
                currentDurationElement.textContent = originalDuration;
                log(`Restored original duration: ${originalDuration}`);
            }
            
            lastPlaybackRate = playbackRate;
            return;
        }

        // Store original duration if not already stored
        if (!originalDuration) {
            originalDuration = currentDurationElement.textContent.trim();
            log(`Stored original duration: ${originalDuration}`);
        }

        // If SponsorBlock is present but we don't have baseline yet, wait for 1x to capture
        if (hasSponsorBlock && !baselineCaptured) {
            log('SponsorBlock detected but no baseline captured yet - waiting for 1x speed');
            lastPlaybackRate = playbackRate;
            return;
        }

        let newText;
        
        if (hasSponsorBlock && sponsorFreeDuration !== null) {
            // SponsorBlock is active - use our stored sponsor-free duration
            log('SponsorBlock detected, using stored sponsor-free duration');
            
            const adjustedSponsorFreeDuration = sponsorFreeDuration / playbackRate;
            const adjustedTimeStr = formatTime(adjustedSponsorFreeDuration);
            
            // Only update SponsorBlock's element if the text actually changes to avoid mutation loops
            const newSBText = ` (${adjustedTimeStr})`;
            if (sponsorBlockElement.textContent !== newSBText) {
                // Suppress observer while we perform our own write to avoid feedback loop
                suppressSBObserver = true;
                sponsorBlockElement.textContent = newSBText;
                hasModifiedSponsorBlock = true; // Mark that we've modified the display
                // Track normalized content we wrote to avoid mistaking it for a new SB baseline
                lastAdjustedSponsorText = newSBText.trim();
                // Release suppression in next tick
                setTimeout(() => { suppressSBObserver = false; }, 0);
                log(`Updated SponsorBlock duration: ${formatTime(sponsorFreeDuration)} / ${playbackRate} = ${adjustedTimeStr}`);
            } else {
                log('SponsorBlock adjusted duration already displayed; skipping write');
            }
            
        } else {
            // No SponsorBlock - use original implementation
            log('No SponsorBlock detected, using original implementation');
            
            const videoDuration = currentVideo.duration;
            if (!videoDuration || isNaN(videoDuration)) {
                log('Video duration not available yet');
                return;
            }
            
            const adjustedDuration = videoDuration / playbackRate;
            const adjustedTimeStr = formatTime(adjustedDuration);
            
            // Update display with original duration and adjusted duration in parentheses
            newText = `${originalDuration} (${adjustedTimeStr})`;
        }
        
        if (newText) {
            currentDurationElement.textContent = newText;
            log(`Updated duration display: ${newText}`);
        }
        
        // Update last playback rate
        lastPlaybackRate = playbackRate;
    }

    // Function to find and monitor the duration element
    function findDurationElement() {
        // YouTube duration element selector (may need updates if YouTube changes their DOM)
        const durationSelectors = [
            '.ytp-time-duration',
            '.ytp-time-display .ytp-time-duration',
            '.html5-video-player .ytp-time-duration'
        ];

        for (const selector of durationSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                log(`Found duration element with selector: ${selector}`);
                currentDurationElement = element;
                // DO NOT CAPTURE ORIGINAL DURATION HERE. THIS IS THE FIX.
                // The `updateDurationDisplay` function will handle capturing it once.
                return element;
            }
        }
        log('Duration element not found');
        return null;
    }

    // Function to find and monitor the video element
    function findVideoElement() {
        const video = document.querySelector('video');
        if (video && video !== currentVideo) {
            log('Found video element');
            currentVideo = video;
            originalDuration = ''; // Reset original duration for new video
            sponsorFreeDuration = null; // Reset sponsor-free duration tracking
            baselineCaptured = false;
            awaitingBaselineAt1x = false;
            lastPlaybackRate = 1; // Reset playback rate tracking
            hasModifiedSponsorBlock = false; // Reset modification flag
            // Reset last adjusted SB text for new video
            lastAdjustedSponsorText = '';
            
            // Add event listeners for playback rate changes
            video.addEventListener('ratechange', () => {
                log('Rate change event triggered');
                if (video.playbackRate === 1) {
                    awaitingBaselineAt1x = true;
                    log('Rate change -> 1x: set awaitingBaselineAt1x');
                }
                updateDurationDisplay();
            });
            video.addEventListener('loadedmetadata', () => {
                log('Video metadata loaded');
                setTimeout(updateDurationDisplay, 500); // Small delay to ensure duration is loaded
            });
            
            return video;
        }
        return video;
    }

    // Function to initialize the extension
    function initialize() {
        log('Initializing extension...');
        const video = findVideoElement();
        const durationElement = findDurationElement();
        
        if (video && durationElement) {
            log('Both video and duration elements found, updating display');
            updateDurationDisplay();
        } else {
            log(`Missing elements - Video: ${!!video}, Duration: ${!!durationElement}`);
        }
    }

    // Mutation observer to detect DOM changes (for navigation and dynamic content)
    function startObserver() {
        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            let sponsorBlockChanged = false;
            
            mutations.forEach((mutation) => {
                // Check if new nodes were added that might contain video or duration elements
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.querySelector && (node.querySelector('video') || 
                            node.querySelector('.ytp-time-duration') ||
                            node.classList?.contains?.('ytp-time-duration'))) {
                            shouldCheck = true;
                        }
                        
                        // Check if SponsorBlock elements were added
                        if ((node.id === 'sponsorBlockDurationAfterSkips') || 
                            (node.querySelector && node.querySelector('#sponsorBlockDurationAfterSkips'))) {
                            sponsorBlockChanged = true;
                            log('SponsorBlock duration element detected');
                        }
                    }
                });

                // Check if SponsorBlock duration element was modified
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const t = mutation.target;
                    if ((t?.id === 'sponsorBlockDurationAfterSkips') ||
                        (t?.parentElement?.id === 'sponsorBlockDurationAfterSkips')) {
                        sponsorBlockChanged = true;
                        log('SponsorBlock duration element modified');
                    }
                }
            });

            if (shouldCheck) {
                setTimeout(initialize, 100); // Small delay to ensure elements are fully loaded
            }
            
            if (sponsorBlockChanged) {
                // If this change was triggered by our own write, ignore it entirely
                if (suppressSBObserver) {
                    log('Ignoring SponsorBlock mutation from our own write');
                    return;
                }

                const el = getSponsorBlockElement();
                if (!el) return;
                const currentText = el.textContent?.trim() || '';
                const isOurWrite = currentText && currentText === lastAdjustedSponsorText;

                // Never capture/refresh baseline at non-1x; avoids capturing our adjusted value
                if (currentVideo && currentVideo.playbackRate !== 1) {
                    // If SB changed on its own and we already have a baseline, just refresh UI
                    if (!isOurWrite && sponsorFreeDuration != null) {
                        setTimeout(updateDurationDisplay, 50);
                    }
                    return;
                }

                // At 1x, if SB updated with new content not written by us, try to capture baseline
                if (!isOurWrite) {
                    // Ensure we only capture when we were awaiting a clean 1x baseline and haven't modified SB
                    const captured = detectSponsorFreeDuration();
                    if (!captured) {
                        // Fallback: if detection was skipped due to flags, still try to parse once at 1x
                        const seconds = calculateSponsorFreeDuration();
                        if (seconds && seconds > 0 && !hasModifiedSponsorBlock) {
                            sponsorFreeDuration = seconds;
                            baselineCaptured = true;
                            awaitingBaselineAt1x = false;
                            log(`Captured SponsorBlock baseline at 1x: ${formatTime(sponsorFreeDuration)}`);
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true // Watch for text changes in SponsorBlock element
        });
    }

    // Initialize when DOM is ready
    function start() {
        initialize();
        startObserver();
        
        // Also check periodically in case we miss some events
        setInterval(() => {
            if (!currentVideo || !currentDurationElement) {
                initialize();
            }
        }, 2000);
    }

    // Start the extension
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    // Enable debug mode by running this in console: window.enableYTDurationDebug()
    window.enableYTDurationDebug = function() {
        debugMode = true;
        log('Debug mode enabled');
        initialize(); // Re-run initialization with debug output
    };

    // Handle YouTube's single-page application navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            // Reset state for new page
            currentVideo = null;
            currentDurationElement = null;
            originalDuration = '';
            sponsorFreeDuration = null; // Reset sponsor-free duration tracking
            baselineCaptured = false;
            awaitingBaselineAt1x = false;
            lastPlaybackRate = 1; // Reset playback rate tracking
            hasModifiedSponsorBlock = false; // Reset modification flag
            lastAdjustedSponsorText = '';
            setTimeout(initialize, 1000); // Wait for new page to load
        }
    }).observe(document, { subtree: true, childList: true });

})();
