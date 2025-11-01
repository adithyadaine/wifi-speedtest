/**
 * WiFi Speed Test Application
 * Tests download speed, upload speed, and latency
 */

// =================================
// Configuration Constants
// =================================

const CONFIG = {
    // Use test files from CORS-friendly servers
    DOWNLOAD_TESTS: [
        {
            url: 'https://speed.cloudflare.com/__down?bytes=10000000',
            size: 10 * 1024 * 1024
        },
        {
            url: 'https://proof.ovh.net/files/10Mb.dat',
            size: 10 * 1024 * 1024
        }
    ],
    UPLOAD_SIZE: 500 * 1024, // 500KB
    MAX_RANDOM_BYTES: 65536   // Browser crypto limit
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
    upload: document.getElementById('upload')
};

// =================================
// Helper Functions
// =================================

/**
 * Generates random data in chunks to avoid crypto API limits
 * @param {number} totalSize - Total size in bytes
 * @returns {Uint8Array} Random data
 */
function generateRandomData(totalSize) {
    const chunks = Math.ceil(totalSize / CONFIG.MAX_RANDOM_BYTES);
    const result = new Uint8Array(totalSize);
    
    for (let i = 0; i < chunks; i++) {
        const chunkSize = Math.min(
            CONFIG.MAX_RANDOM_BYTES,
            totalSize - (i * CONFIG.MAX_RANDOM_BYTES)
        );
        const chunk = new Uint8Array(chunkSize);
        crypto.getRandomValues(chunk);
        result.set(chunk, i * CONFIG.MAX_RANDOM_BYTES);
    }
    
    return result;
}

// =================================
// Speed Test Functions
// =================================

/**
 * Tests the ping/latency to a server
 * Uses multiple attempts for accuracy
 */
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

/**
 * Tests download speed
 */
async function testDownload(progressCallback) {
    for (const test of CONFIG.DOWNLOAD_TESTS) {
        try {
            const start = performance.now();
            const response = await fetch(test.url + '&t=' + Date.now(), {
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                console.warn(`Server returned ${response.status}, trying next...`);
                continue;
            }
            
            const reader = response.body.getReader();
            let receivedLength = 0;
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                receivedLength += value.length;
                const progress = (receivedLength / test.size) * 100;
                progressCallback(Math.min(progress, 100));
            }
            
            const duration = (performance.now() - start) / 1000;
            const bitsLoaded = receivedLength * 8;
            const speedMbps = (bitsLoaded / duration) / (1024 * 1024);
            
            return speedMbps;
            
        } catch (error) {
            console.warn('Download test failed, trying next server:', error);
            continue;
        }
    }
    
    return null;
}

/**
 * Tests upload speed using generated random data
 */
async function testUpload(progressCallback) {
    const uploadEndpoints = [
        'https://httpbin.org/post',
        'https://postman-echo.com/post'
    ];
    
    try {
        // Generate random data in chunks
        updateStatus('Preparing upload test...');
        const data = generateRandomData(CONFIG.UPLOAD_SIZE);
        
        for (const endpoint of uploadEndpoints) {
            try {
                updateStatus('Testing upload speed...');
                const start = performance.now();
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: data,
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    }
                });
                
                if (!response.ok) {
                    console.warn(`Upload endpoint returned ${response.status}`);
                    continue;
                }
                
                const duration = (performance.now() - start) / 1000;
                const bitsLoaded = CONFIG.UPLOAD_SIZE * 8;
                const speedMbps = (bitsLoaded / duration) / (1024 * 1024);
                
                progressCallback(100);
                return speedMbps;
                
            } catch (error) {
                console.warn('Upload test failed, trying next endpoint:', error);
                continue;
            }
        }
        
    } catch (error) {
        console.error('Upload test preparation failed:', error);
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
    elements.upload.textContent = results.upload ? results.upload.toFixed(2) : 'N/A';
    
    setTimeout(() => {
        hideLoading();
        elements.results.classList.add('fade-in');
        elements.results.style.display = 'block';
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
        
        results.download = await testDownload((progress) => {
            updateProgress(20 + (progress * 0.5));
        });
        
        if (results.download === null) {
            throw new Error('Download test failed - unable to reach test servers');
        }
        
        // Step 3: Test Upload
        updateProgress(70);
        
        results.upload = await testUpload((progress) => {
            updateProgress(70 + (progress * 0.3));
        });
        
        if (results.upload === null) {
            console.warn('Upload test failed, showing partial results...');
        }
        
        // Show results (even if some tests failed)
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
    
    // Log browser info for debugging
    console.log('Speed Test App loaded');
    console.log('Browser:', navigator.userAgent);
    console.log('Online:', navigator.onLine);
});

// Handle offline detection
window.addEventListener('offline', () => {
    showError('No internet connection detected');
});