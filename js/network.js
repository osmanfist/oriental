/**
 * Oriental v3.0 - Network Status Manager
 * Detects connection quality for adaptive loading
 */

class NetworkManager {
    constructor() {
        this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        this.isOnline = navigator.onLine;
        this.connectionType = this.connection?.type || 'unknown';
        this.effectiveType = this.connection?.effectiveType || '4g';
        this.downlink = this.connection?.downlink || 10;
        this.rtt = this.connection?.rtt || 50;
        this.saveData = this.connection?.saveData || false;
        this.listeners = [];
    }

    init() {
        window.addEventListener('online', () => this.updateStatus());
        window.addEventListener('offline', () => this.updateStatus());
        
        if (this.connection) {
            this.connection.addEventListener('change', () => this.updateStatus());
        }
        
        this.updateStatus();
        console.log(`📡 Network: ${this.getQuality()} quality (${this.effectiveType})`);
    }

    updateStatus() {
        this.isOnline = navigator.onLine;
        this.connectionType = this.connection?.type || 'unknown';
        this.effectiveType = this.connection?.effectiveType || '4g';
        this.downlink = this.connection?.downlink || 10;
        this.rtt = this.connection?.rtt || 50;
        this.saveData = this.connection?.saveData || false;

        this.notifyListeners();
    }

    getQuality() {
        if (!this.isOnline) return 'offline';
        if (this.effectiveType === 'slow-2g' || this.effectiveType === '2g') return 'poor';
        if (this.effectiveType === '3g') return 'moderate';
        return 'good';
    }

    shouldLoadImages() {
        return !this.saveData && this.getQuality() !== 'poor';
    }

    shouldSyncData() {
        return this.isOnline && this.getQuality() !== 'poor';
    }

    getSyncInterval() {
        switch (this.getQuality()) {
            case 'good': return 60000; // 1 minute
            case 'moderate': return 300000; // 5 minutes
            case 'poor': return 900000; // 15 minutes
            default: return null; // Don't sync
        }
    }

    getStatus() {
        return {
            isOnline: this.isOnline,
            quality: this.getQuality(),
            type: this.connectionType,
            effectiveType: this.effectiveType,
            downlink: this.downlink,
            rtt: this.rtt,
            saveData: this.saveData
        };
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    notifyListeners() {
        const status = this.getStatus();
        this.listeners.forEach(cb => cb(status));
    }
}

const networkManager = new NetworkManager();