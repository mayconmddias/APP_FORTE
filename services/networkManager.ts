import { supabase } from '../supabaseClient';

export interface NetworkStatus {
    online: boolean;
    quality?: 'good' | 'poor' | 'none';
}

class NetworkManager {
    private static instance: NetworkManager;
    private listeners: ((status: NetworkStatus) => void)[] = [];
    private currentStatus: NetworkStatus = { online: navigator.onLine };

    private constructor() {
        window.addEventListener('online', () => this.updateStatus());
        window.addEventListener('offline', () => this.updateStatus());
        this.updateStatus();
        // Periodically check real connection every 30 seconds
        setInterval(() => this.checkSupabaseConnection(), 30000);
    }

    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    async checkSupabaseConnection(): Promise<boolean> {
        if (!navigator.onLine) {
            this.emit({ online: false, quality: 'none' });
            return false;
        }

        try {
            // Small ping to Supabase just to check reachability
            const startTime = Date.now();
            const { error } = await supabase.from('crane_assets').select('id').limit(1);
            const duration = Date.now() - startTime;

            const isOnline = !error;
            const quality = duration < 500 ? 'good' : 'poor';

            this.emit({ online: isOnline, quality: isOnline ? quality : 'none' });
            return isOnline;
        } catch (e) {
            this.emit({ online: false, quality: 'none' });
            return false;
        }
    }

    private updateStatus() {
        this.checkSupabaseConnection();
    }

    private emit(status: NetworkStatus) {
        this.currentStatus = status;
        this.listeners.forEach(l => l(status));
    }

    subscribe(listener: (status: NetworkStatus) => void) {
        this.listeners.push(listener);
        listener(this.currentStatus);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    getStatus(): NetworkStatus {
        return this.currentStatus;
    }
}

export const networkManager = NetworkManager.getInstance();
