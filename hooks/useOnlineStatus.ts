import { useState, useEffect } from 'react';
import { networkManager, NetworkStatus } from '../services/networkManager';

export const useOnlineStatus = () => {
    const [status, setStatus] = useState<NetworkStatus>(networkManager.getStatus());

    useEffect(() => {
        const unsubscribe = networkManager.subscribe((newStatus) => {
            setStatus(newStatus);
        });
        return unsubscribe;
    }, []);

    return status;
};
