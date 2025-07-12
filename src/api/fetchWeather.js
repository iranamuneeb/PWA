import axios from "axios";

const URL = "https://api.weatherapi.com/v1/current.json";
const API_KEY = "b0a7bad410d5400c8c3145734251107";

export const fetchWeather = async (cityName) => {
    // Check if online
    if (!navigator.onLine) {
        // Import backgroundSync dynamically to avoid circular dependency
        const { default: backgroundSyncManager } = await import('./backgroundSync');
        
        // Queue the request for when we come back online
        const requestId = backgroundSyncManager.queueSearch(cityName);
        
        // Throw a specific error that indicates the request was queued
        const error = new Error(`Search for "${cityName}" has been queued for when you're back online.`);
        error.isQueued = true;
        error.requestId = requestId;
        throw error;
    }

    try {
        const { data } = await axios.get(URL, {
            params: {
                q: cityName,
                key: API_KEY
            }
        });
        return data;
    } catch (error) {
        // If request fails due to network issues while appearing online
        if (error.code === 'NETWORK_ERROR' || !error.response) {
            const { default: backgroundSyncManager } = await import('./backgroundSync');
            const requestId = backgroundSyncManager.queueSearch(cityName);
            
            const queueError = new Error(`Network error. Search for "${cityName}" has been queued.`);
            queueError.isQueued = true;
            queueError.requestId = requestId;
            throw queueError;
        }
        
        // Re-throw other errors (like city not found)
        throw error;
    }
}

// New function to fetch weather by coordinates
export const fetchWeatherByCoordinates = async (latitude, longitude) => {
    // Check if online
    if (!navigator.onLine) {
        const { default: backgroundSyncManager } = await import('./backgroundSync');
        
        // Queue the request for when we come back online
        const locationString = `${latitude},${longitude}`;
        const requestId = backgroundSyncManager.queueSearch(locationString);
        
        const error = new Error(`Location weather search has been queued for when you're back online.`);
        error.isQueued = true;
        error.requestId = requestId;
        throw error;
    }

    try {
        const { data } = await axios.get(URL, {
            params: {
                q: `${latitude},${longitude}`,
                key: API_KEY
            }
        });
        return data;
    } catch (error) {
        // If request fails due to network issues while appearing online
        if (error.code === 'NETWORK_ERROR' || !error.response) {
            const { default: backgroundSyncManager } = await import('./backgroundSync');
            const locationString = `${latitude},${longitude}`;
            const requestId = backgroundSyncManager.queueSearch(locationString);
            
            const queueError = new Error(`Network error. Location weather search has been queued.`);
            queueError.isQueued = true;
            queueError.requestId = requestId;
            throw queueError;
        }
        
        // Re-throw other errors
        throw error;
    }
}