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
        const isNavigatorOnline = navigator.onLine;

        if (!isNavigatorOnline) {
            this.emit({ online: false, quality: 'none' });
            return false;
        }

        try {
            // Small ping to Supabase just to check reachability
            const startTime = Date.now();
            const { error } = await supabase.from('crane_assets').select('id').limit(1);
            const duration = Date.now() - startTime;

            const hasServerAccess = !error;
            const quality = hasServerAccess ? (duration < 1000 ? 'good' : 'poor') : 'none';

            // IMPORTANT: We trust navigator.onLine for "online" status, 
            // but we use Supabase to determine quality/reachability.
            this.emit({ online: true, quality });
            return true;
        } catch (e) {
            // Even if ping fails, if navigator says we are online, we stay "online" but with "none" quality
            this.emit({ online: true, quality: 'none' });
            return true;
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
