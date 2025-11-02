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
    
    // Info/Theme elements
    clientInfo: document.getElementById('clientInfo'),
    serverInfo: document.getElementById('serverInfo'),
    infoSection: document.getElementById('infoSection'),
    toggleInfoButton: document.getElementById('toggleInfoButton'),
    themeToggleButton: document.getElementById('themeToggleButton')
};

// =================================
// Theme Management
// =================================

const THEME_KEY = 'speedtest-theme';

/**
 * Applies the specified theme to the document.
 * @param {'light'|'dark'|'system'} theme - The theme to apply.
 */
function applyTheme(theme) {
    const root = document.documentElement;
    const body = document.body;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    body.classList.remove('light-theme', 'dark-theme'); // Clear previous
    
    if (theme === 'dark' || (theme === 'system' && systemPrefersDark)) {
        body.classList.add('dark-theme');
        elements.themeToggleButton.innerHTML = 
            `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`; // Sun icon
    } else {
        body.classList.add('light-theme');
        elements.themeToggleButton.innerHTML = 
            `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`; // Moon icon
    }
    localStorage.setItem(THEME_KEY, theme);
}

/**
 * Toggles the theme between light and dark.
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem(THEME_KEY) || 'system';
    if (currentTheme === 'light') {
        applyTheme('dark');
    } else { // currentTheme is 'dark' or 'system'
        applyTheme('light');
    }
}

// =================================
// Speed Test Functions
// =================================

async function testPing() {
    const attempts = 3;
    const pings = [];
    
    for (let i = 0; i < attempts; i++) {
        const start = performance.now();
        try {
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

async function testDownload(progressCallback) {
    for (const test of CONFIG.DOWNLOAD_TESTS) {
        try {
            const start = performance.now();
            const downloadPromises = [];
            let completedStreams = 0;

            for (let i = 0; i < CONFIG.NUM_DOWNLOAD_STREAMS; i++) {
                downloadPromises.push((async () => {
                    const response = await fetch(
                        test.url + `&t=${Date.now()}&p=${i}`, 
                        { cache: 'no-cache' }
                    );
                    if (!response.ok) {
                        throw new Error(`Stream ${i} failed with status ${response.status}`);
                    }
                    await response.arrayBuffer(); 
                    
                    completedStreams++;
                    progressCallback((completedStreams / CONFIG.NUM_DOWNLOAD_STREAMS) * 100);
                    
                    return test.size; 
                })());
            }

            const results = await Promise.allSettled(downloadPromises); 
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
            continue;
        }
    }
    return null;
}

// =================================
// UI Helper Functions
// =================================

function updateProgress(percentage) {
    elements.progress.style.width = `${percentage}%`;
}

function updateStatus(message) {
    elements.status.textContent = message;
}

function showLoading() {
    elements.results.style.display = 'none';
    elements.error.style.display = 'none';
    elements.infoSection.style.display = 'none'; // Hide info when loading
    elements.loading.style.display = 'block';
    elements.startButton.disabled = true;
    elements.startButton.textContent = 'Testing...';
    updateProgress(0);
}

function hideLoading() {
    elements.loading.style.display = 'none';
    elements.startButton.disabled = false;
    elements.startButton.textContent = 'Start Test';
}

function showResults(results) {
    elements.ping.textContent = results.ping ? results.ping.toFixed(0) : 'N/A';
    elements.download.textContent = results.download ? results.download.toFixed(2) : 'N/A';
    
    // Ensure fade-in animation restarts
    elements.results.classList.remove('fade-in'); 

    setTimeout(() => {
        hideLoading();
        elements.results.style.display = 'block';
        elements.results.classList.add('fade-in'); 
    }, 300);
}

function showError(message) {
    hideLoading();
    elements.error.textContent = `${message}. Please check your internet connection and try again.`;
    elements.error.style.display = 'block';
}

// =================================
// Main Test Function
// =================================

async function runSpeedTest() {
    showLoading();
    
    const results = {
        ping: null,
        download: null,
        upload: null 
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
// Event Listeners and Initializers
// =================================

document.addEventListener('DOMContentLoaded', () => {
    elements.startButton.addEventListener('click', runSpeedTest);
    
    // Toggle Info Section
    elements.toggleInfoButton.addEventListener('click', () => {
        elements.infoSection.classList.toggle('show');
    });

    // Theme Toggle
    elements.themeToggleButton.addEventListener('click', toggleTheme);
    
    // Initialize theme on load
    const savedTheme = localStorage.getItem(THEME_KEY);
    applyTheme(savedTheme || 'system'); // Use saved theme or system default
    
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

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem(THEME_KEY) === 'system') {
        applyTheme('system'); // Re-apply system theme
    }
});