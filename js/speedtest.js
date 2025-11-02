/**
 * WiFi Speed Test Application
 * Tests download speed, upload speed, and latency
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
    UPLOAD_SIZE: 64 * 1024, // 64 KB
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
    upload: document.getElementById('upload')
};

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
 * Tests download speed using multiple parallel connections
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
                    const response = await fetch(
                        test.url + `&t=${Date.now()}&p=${i}`, // Unique param for each stream
                        { cache: 'no-cache' }
                    );
                    if (!response.ok) {
                        throw new Error(`Stream ${i} failed with status ${response.status}`);
                    }
                    // We don't need to read the full body for byte length as we know the total size per stream
                    await response.arrayBuffer(); // Just read to completion
                    
                    completedStreams++;
                    // Basic progress: update when a stream completes
                    progressCallback((completedStreams / CONFIG.NUM_DOWNLOAD_STREAMS) * 100);
                    
                    return test.size; // Return the expected size for calculation
                })());
            }

            const results = await Promise.allSettled(downloadPromises); // Wait for all streams
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
            // Calculate speed based on successfully received bytes
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

/**
 * Tests upload speed using generated random data (within crypto limits)
 */
async function testUpload(progressCallback) {
    const data = new Uint8Array(CONFIG.UPLOAD_SIZE);
    crypto.getRandomValues(data);
    
    const uploadEndpoints = [
        'https://httpbin.org/post',
        'https://postman-echo.com/post'
    ];
    
    for (const endpoint of uploadEndpoints) {
        try {
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
                console.warn(`Upload endpoint returned ${response.status} for ${endpoint}`);
                continue;
            }
            
            const duration = (performance.now() - start) / 1000;
            const bitsLoaded = CONFIG.UPLOAD_SIZE * 8;
            const speedMbps = (bitsLoaded / duration) / (1024 * 1024);
            
            progressCallback(100);
            return speedMbps;
            
        } catch (error) {
            console.warn(`Upload test failed for ${endpoint}, trying next endpoint:`, error);
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
        
        results.download = await testDownload((progress) => {
            // Adjust progress based on number of streams
            updateProgress(20 + (progress * 0.5));
        });
        
        if (results.download === null) {
            throw new Error('Download test failed - unable to reach test servers or all streams failed.');
        }
        
        // Step 3: Test Upload
        updateStatus('Testing upload speed...');
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
    
    console.log('Speed Test App loaded');
    console.log('Browser:', navigator.userAgent);
    console.log('Online:', navigator.onLine);
});

window.addEventListener('offline', () => {
    showError('No internet connection detected');
});