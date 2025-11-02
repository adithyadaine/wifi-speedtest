/**
 * WiFi Speed Test Application
 * Tests download speed and latency (upload disabled due to accuracy limitations)
 */

// =================================
// Configuration Constants
// =================================

const CONFIG = {
    DOWNLOAD_TESTS: [
        {
            url: 'https://speed.cloudflare.com/__down?bytes=50000000', // 50 MB
            size: 50 * 1024 * 1024
        },
        {
            url: 'https://proof.ovh.net/files/100Mb.dat', // 100 MB (fallback)
            size: 100 * 1024 * 1024
        }
    ],
    // UPLOAD_SIZE is kept for potential future use or if upload is re-enabled,
    // but the upload test function itself is no longer called.
    UPLOAD_SIZE: 64 * 1024, // 64 KB (Max safe for crypto.getRandomValues)
    NUM_DOWNLOAD_STREAMS: 4 // Number of parallel connections for download test
};

// =================================
// DOM Element References
// =================================

const elements = {
    startButton: document.getElementById('startButton'),
    loading: document.getElementById('loading'),
    results: document.getElementById('results'),
    error: document.getElementById('error'),
    status: document.getElementById('status'),
    progress: document.getElementById('progress'),
    ping: document.getElementById('ping'),
    download: document.getElementById('download'),
    // Removed direct reference to 'upload' as it's not displayed
    
    // New elements for info section
    clientInfo: document.getElementById('clientInfo'),
    serverInfo: document.getElementById('serverInfo')
};

// =================================
// Speed Test Functions
// =================================

/**
 * Tests the ping/latency to a server
 * Uses multiple attempts for accuracy
 * @returns {Promise<number|null>} Average ping time in milliseconds or null if all attempts fail.
 */
async function testPing() {
    const attempts = 3;
    const pings = [];
    
    for (let i = 0; i < attempts; i++) {
        const start = performance.now();
        try {
            // Using Cloudflare's /cdn-cgi/trace for a reliable, CORS-friendly ping
            await fetch('https://www.cloudflare.com/cdn-cgi/trace?t=' + Date.now(), {
                method: 'GET',
                cache: 'no-cache'
            });
            const ping = performance.now() - start;
            pings.push(ping);
        } catch (error) {
            console.warn(`Ping attempt ${i + 1} failed:`, error);
        }
    }
    if (pings.length === 0) {
        return null;
    }
    return pings.reduce((a, b) => a + b, 0) / pings.length;
}

/**
 * Tests download speed using multiple parallel connections.
 * @param {Function} progressCallback - Callback to update progress (0-100%).
 * @returns {Promise<number|null>} Download speed in Mbps or null if all tests fail.
 */
async function testDownload(progressCallback) {
    for (const test of CONFIG.DOWNLOAD_TESTS) {
        try {
            const start = performance.now();
            const downloadPromises = [];
            let completedStreams = 0;

            // Start multiple download streams
            for (let i = 0; i < CONFIG.NUM_DOWNLOAD_STREAMS; i++) {
                downloadPromises.push((async () => {
                    // Append unique query params to prevent caching and differentiate streams
                    const response = await fetch(
                        test.url + `&t=${Date.now()}&p=${i}`, 
                        { cache: 'no-cache' }
                    );
                    if (!response.ok) {
                        throw new Error(`Stream ${i} failed with status ${response.status}`);
                    }
                    // Read the entire body to ensure all data is received for timing
                    await response.arrayBuffer(); 
                    
                    completedStreams++;
                    // Basic progress: update when a stream completes
                    progressCallback((completedStreams / CONFIG.NUM_DOWNLOAD_STREAMS) * 100);
                    
                    return test.size; // Return the expected size for calculation
                })());
            }

            const results = await Promise.allSettled(downloadPromises); // Wait for all streams to settle
            let totalReceivedBytes = 0;
            let successStreams = 0;

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    totalReceivedBytes += result.value;
                    successStreams++;
                } else {
                    console.warn('One download stream failed:', result.reason);
                }
            }
            
            if (successStreams === 0) {
                throw new Error('All download streams failed.');
            }

            const duration = (performance.now() - start) / 1000;
            const bitsLoaded = totalReceivedBytes * 8;
            const speedMbps = (bitsLoaded / duration) / (1024 * 1024);

            return speedMbps;

        } catch (error) {
            console.warn(`Parallel download test failed for ${test.url}, trying next server:`, error);
            continue; // Try the next download test URL if current one fails
        }
    }
    return null; // All download tests failed
}

// =================================
// UI Helper Functions
// =================================

/**
 * Updates the visual progress bar width.
 * @param {number} percentage - Percentage from 0 to 100.
 */
function updateProgress(percentage) {
    elements.progress.style.width = `${percentage}%`;
}

/**
 * Updates the status message displayed below the progress bar.
 * @param {string} message - The status message.
 */
function updateStatus(message) {
    elements.status.textContent = message;
}

/**
 * Sets the UI to the loading state.
 */
function showLoading() {
    elements.results.style.display = 'none';
    elements.error.style.display = 'none';
    elements.loading.style.display = 'block';
    elements.startButton.disabled = true;
    elements.startButton.textContent = 'Testing...';
    updateProgress(0);
}

/**
 * Hides the loading state and re-enables the start button.
 */
function hideLoading() {
    elements.loading.style.display = 'none';
    elements.startButton.disabled = false;
    elements.startButton.textContent = 'Start Test';
}

/**
 * Displays the test results.
 * @param {Object} results - Object containing ping, download, and upload results.
 */
function showResults(results) {
    elements.ping.textContent = results.ping ? results.ping.toFixed(0) : 'N/A';
    elements.download.textContent = results.download ? results.download.toFixed(2) : 'N/A';
    // Upload is intentionally 'N/A' as the test is disabled
    // If the HTML element was present, its content would be set by this line:
    // elements.upload.textContent = results.upload ? results.upload.toFixed(2) : 'N/A';
    
    // Ensure fade-in animation restarts
    elements.results.classList.remove('fade-in'); 

    setTimeout(() => {
        hideLoading();
        elements.results.style.display = 'block';
        elements.results.classList.add('fade-in'); 
    }, 300);
}

/**
 * Displays an error message to the user.
 * @param {string} message - The error message.
 */
function showError(message) {
    hideLoading();
    elements.error.textContent = `${message}. Please check your internet connection and try again.`;
    elements.error.style.display = 'block';
}

// =================================
// Main Test Function
// =================================

/**
 * Orchestrates the entire speed test process.
 */
async function runSpeedTest() {
    showLoading();
    
    const results = {
        ping: null,
        download: null,
        upload: null // Explicitly null as upload test is disabled
    };
    
    try {
        // Step 1: Test Ping
        updateStatus('Testing latency...');
        updateProgress(10);
        
        results.ping = await testPing();
        
        if (results.ping === null) {
            console.warn('Ping test failed, continuing with other tests...');
        }
        
        // Step 2: Test Download
        updateStatus('Testing download speed...');
        updateProgress(20);
        
        // Extract and display the hostname of the primary download test server
        try {
            const downloadTestUrl = new URL(CONFIG.DOWNLOAD_TESTS[0].url);
            elements.serverInfo.textContent = downloadTestUrl.hostname;
        } catch (e) {
            console.error('Failed to parse download test URL for server info:', e);
            elements.serverInfo.textContent = "Unknown";
        }

        results.download = await testDownload((progress) => {
            updateProgress(20 + (progress * 0.5));
        });
        
        if (results.download === null) {
            throw new Error('Download test failed - unable to reach test servers or all streams failed.');
        }
        
        // Step 3: Upload test is explicitly disabled due to browser accuracy limitations
        results.upload = null; 
        console.warn('Upload test is currently disabled due to browser accuracy limitations.');
        
        // Show results (even if some tests failed or were skipped)
        updateProgress(100);
        showResults(results);
        
    } catch (error) {
        console.error('Test error:', error);
        showError(error.message);
    }
}

// =================================
// Event Listeners
// =================================

document.addEventListener('DOMContentLoaded', () => {
    elements.startButton.addEventListener('click', runSpeedTest);
    
    // Display client info (User Agent) when the page loads
    elements.clientInfo.textContent = navigator.userAgent;
    
    // Set initial server info until a test is run
    elements.serverInfo.textContent = "Not yet tested";
    
    console.log('Speed Test App loaded');
    console.log('Browser:', navigator.userAgent);
    console.log('Online:', navigator.onLine);
});

// Provides feedback if the user's browser goes offline
window.addEventListener('offline', () => {
    showError('No internet connection detected');
});