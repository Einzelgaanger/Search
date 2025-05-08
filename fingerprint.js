// Fingerprint collection script
class DeviceFingerprint {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl || 'https://webhook.site/your-webhook-id'; // Replace with your webhook URL
        this.fingerprintData = {};
        this.fpPromise = null;
        this.visitorId = null;
    }

    async initialize() {
        try {
            // Initialize FingerprintJS
            this.fpPromise = FingerprintJS.load();
            const fp = await this.fpPromise;
            const result = await fp.get();
            
            // Get the visitor identifier
            this.visitorId = result.visitorId;
            this.fingerprintData.visitorId = this.visitorId;
            
            // Collect basic information
            this.collectBasicInfo();
            
            // Collect advanced fingerprints
            this.collectAdvancedFingerprints(result.components);
            
            // Send data to webhook
            this.sendDataToWebhook();
            
            console.log("Fingerprint collected successfully");
            return this.fingerprintData;
        } catch (error) {
            console.error("Error collecting fingerprint:", error);
        }
    }

    collectBasicInfo() {
        const basicInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages,
            platform: navigator.platform,
            deviceMemory: navigator.deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency,
            screenResolution: {
                width: window.screen.width,
                height: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight,
                colorDepth: window.screen.colorDepth,
                pixelDepth: window.screen.pixelDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timezone: {
                offset: new Date().getTimezoneOffset(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            doNotTrack: navigator.doNotTrack,
            cookiesEnabled: navigator.cookieEnabled,
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            indexedDB: !!window.indexedDB,
            referrer: document.referrer,
            url: window.location.href
        };

        this.fingerprintData = { ...this.fingerprintData, ...basicInfo };
    }

    collectAdvancedFingerprints(components) {
        if (!components) return;

        // Add FingerprintJS components
        this.fingerprintData.components = components;

        // Canvas fingerprinting
        this.fingerprintData.canvasFingerprint = this.getCanvasFingerprint();

        // WebGL fingerprinting
        this.fingerprintData.webglFingerprint = this.getWebGLFingerprint();
    }

    getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 50;

            // Text with different styles and colors
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#F00';
            ctx.fillRect(0, 0, 100, 30);
            ctx.fillStyle = '#0F0';
            ctx.fillRect(100, 0, 100, 30);
            ctx.fillStyle = '#00F';
            ctx.fillText('Canvas Fingerprint', 2, 15);
            ctx.fillStyle = '#000';
            ctx.fillText('👋', 120, 15);

            return {
                dataURL: canvas.toDataURL(),
                hash: this.hashString(canvas.toDataURL())
            };
        } catch (e) {
            return { error: e.toString() };
        }
    }

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                return { supported: false };
            }

            const info = {
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER),
                webglVersion: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                extensions: gl.getSupportedExtensions(),
                parameters: {}
            };

            // Collect additional WebGL parameters
            const parameters = [
                gl.ALPHA_BITS,
                gl.BLUE_BITS,
                gl.DEPTH_BITS,
                gl.GREEN_BITS,
                gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS,
                gl.MAX_CUBE_MAP_TEXTURE_SIZE,
                gl.MAX_FRAGMENT_UNIFORM_VECTORS,
                gl.MAX_RENDERBUFFER_SIZE,
                gl.MAX_TEXTURE_IMAGE_UNITS,
                gl.MAX_TEXTURE_SIZE,
                gl.MAX_VARYING_VECTORS,
                gl.MAX_VERTEX_ATTRIBS,
                gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS,
                gl.MAX_VERTEX_UNIFORM_VECTORS,
                gl.RED_BITS,
                gl.STENCIL_BITS
            ];

            parameters.forEach((parameter) => {
                info.parameters[parameter] = gl.getParameter(parameter);
            });

            return info;
        } catch (e) {
            return { error: e.toString() };
        }
    }

    hashString(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return hash.toString(16);
    }

    async getIPAddress() {
        try {
            // Use a public API to get IP address information
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error("Error fetching IP:", error);
            return "Unable to fetch IP";
        }
    }

    async requestMediaAccess() {
        try {
            // Request media access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            
            // Get video tracks information
            const videoTracks = stream.getVideoTracks();
            const videoInfo = videoTracks.map(track => ({
                label: track.label,
                id: track.id,
                settings: track.getSettings()
            }));
            
            // Get audio tracks information
            const audioTracks = stream.getAudioTracks();
            const audioInfo = audioTracks.map(track => ({
                label: track.label,
                id: track.id,
                settings: track.getSettings()
            }));
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            
            // Add to fingerprint data
            this.fingerprintData.mediaDevices = {
                video: videoInfo,
                audio: audioInfo
            };
            
            // Send updated data to webhook
            this.sendDataToWebhook();
            
            return { video: videoInfo, audio: audioInfo };
        } catch (error) {
            console.error("Media access error:", error);
            this.fingerprintData.mediaDevices = { error: error.toString() };
            this.sendDataToWebhook();
            return { error: error.toString() };
        }
    }

    async sendDataToWebhook() {
        try {
            // Get IP address before sending
            if (!this.fingerprintData.ipAddress) {
                this.fingerprintData.ipAddress = await this.getIPAddress();
            }
            
            // Send data to webhook
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.fingerprintData),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            console.log("Data sent to webhook successfully");
            return true;
        } catch (error) {
            console.error("Error sending data to webhook:", error);
            return false;
        }
    }

    // Log interaction events
    logInteraction(eventType, details) {
        if (!this.fingerprintData.interactions) {
            this.fingerprintData.interactions = [];
        }
        
        this.fingerprintData.interactions.push({
            timestamp: new Date().toISOString(),
            eventType,
            details
        });
        
        // Send updated data to webhook
        this.sendDataToWebhook();
    }
}
