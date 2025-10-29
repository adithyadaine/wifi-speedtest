/**
 * WiFi Speed Test Application
 * Tests download speed, upload speed, and latency
 */

// =================================
// Configuration Constants
// =================================

const CONFIG = {
    DOWNLOAD_SIZE: 10 * 1024 * 1024, // 10 MB
    UPLOAD_SIZE: 1 * 1024 * 1024,    // 1 MB
    TEST_SERVERS: [
        'https://speed.cloudflare.com/__down?bytes=',
        'https://bouygues.testdebit.info/10M.iso'
    ],
    UPLOAD_ENDPOINT: 'https://httpbin.org/post'
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

async function testPing(url) {
    const start = performance.now();
    
    try {
        await fetch(url, {
            method: 'HEAD',
            cache: 'no-cache'
        });
        
        return performance.now() - start;
    } catch (error) {
        console.error('Ping test failed:', error);
        return null;
    }
}

async function testDownload(url, progressCallback) {
    const start = performance.now();
    
    try {
        const response = await fetch(url, { cache: 'no-cache' });
        const reader = response.body.getReader();
        let receivedLength = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            receivedLength += value.length;
            const progress = (receivedLength / CONFIG.DOWNLOAD_SIZE) * 100;
            progressCallback(Math.min(progress, 100));
        }
        
        const duration = (performance.now() - start) / 1000;
        const bitsLoaded = receivedLength * 8;
        const speedMbps = (bitsLoaded / duration) / (1024 * 1024);
        
        return speedMbps;
    } catch (error) {
        console.error('Download test failed:', error);
        return null;
    }
}

async function testUpload(progressCallback) {
    const data = new Uint8Array(CONFIG.UPLOAD_SIZE);
    crypto.getRandomValues(data);
    
    const start = performance.now();
    
    try {
        await fetch(CONFIG.UPLOAD_ENDPOINT, {
            method: 'POST',
            body: data,
            cache: 'no-cache'
        });
        
        const duration = (performance.now() - start) / 1000;
        const bitsLoaded = CONFIG.UPLOAD_SIZE * 8;
        const speedMbps = (bitsLoaded / duration) / (1024 * 1024);
        
        progressCallback(100);
        return speedMbps;
    } catch (error) {
        console.error('Upload test failed:', error);
        return null;
    }
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
    elements.ping.textContent = results.ping.toFixed(0);
    elements.download.textContent = results.download.toFixed(2);
    elements.upload.textContent = results.upload.toFixed(2);
    
    setTimeout(() => {
        hideLoading();
        elements.results.classList.add('fade-in');
        elements.results.style.display = 'block';
    }, 300);
}

function showError(message) {
    hideLoading();
    elements.error.textContent = `${message}. Please try again.`;
    elements.error.style.display = 'block';
}

// =================================
// Main Test Function
// =================================

async function runSpeedTest() {
    showLoading();
    
    try {
        updateStatus('Testing latency...');
        updateProgress(10);
        
        const testUrl = CONFIG.TEST_SERVERS[0] + CONFIG.DOWNLOAD_SIZE;
        const ping = await testPing(testUrl);
        
        if (ping === null) {
            throw new Error('Ping test failed');
        }
        
        updateStatus('Testing download speed...');
        
        const downloadSpeed = await testDownload(testUrl, (progress) => {
            updateProgress(10 + (progress * 0.6));
        });
        
        if (downloadSpeed === null) {
            throw new Error('Download test failed');
        }
        
        updateStatus('Testing upload speed...');
        updateProgress(70);
        
        const uploadSpeed = await testUpload((progress) => {
            updateProgress(70 + (progress * 0.3));
        });
        
        if (uploadSpeed === null) {
            throw new Error('Upload test failed');
        }
        
        updateProgress(100);
        showResults({
            ping: ping,
            download: downloadSpeed,
            upload: uploadSpeed
        });
        
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
});