document.addEventListener("DOMContentLoaded", () => {
    const userNearestStop = document.getElementById('userNearestStop');
    const userLocationArea = document.getElementById('userLocationArea');
    
    // Fetch nearest stop based on geolocation
    async function fetchNearestStop(latitude, longitude) {
        try {
            const response = await fetch(`http://busstopsearch-a6hdaph8acgpdyhj.swedencentral-01.azurewebsites.net/nearest-stop?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const stop = await response.json();

            userNearestStop.innerHTML = stop.stop_name;
            userLocationArea.innerHTML = stop.stop_area;

            selectedStopId = stop.stop_id;
            // Custom event for nearest stop bus fetch
            document.dispatchEvent(new CustomEvent('userStopSelected', { detail: selectedStopId }));
        } catch (error) {
            console.error(`Error fetching data from http://localhost:3000/nearest-stop:`, error);
            userNearestStop.innerHTML = 'Error fetching nearest stop';
            userLocationArea.innerHTML = 'Please try again later';
        }
    }

    // Function to handle geolocation success
    function handleGeolocationSuccess(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        console.log('Geolocation success:', latitude, longitude);

        // Fetch nearest stop after geolocation is allowed
        fetchNearestStop(latitude, longitude);
    }

    // Function to handle geolocation error
    function handleGeolocationError(error) {
        console.error('Geolocation error:', error);
        userNearestStop.innerHTML = 'Geolocation unavailable';
        userLocationArea.innerHTML = 'Geolocation unavailable';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                console.error("Permission denied.");
                break;
            case error.POSITION_UNAVAILABLE:
                console.error("Position unavailable.");
                break;
            case error.TIMEOUT:
                console.error("Timeout.");
                break;
            default:
                console.error("An unknown error occurred.");
                break;
        }
    }

    // Check if geolocation is available
    if ("geolocation" in navigator) {
        const geoOptions = {
            timeout: 7000,  // Set timeout to 7 seconds
            maximumAge: 0,  // Fetch fresh location data
        };
    
        const geoTimeout = setTimeout(() => {
            console.error("Geolocation request timed out.");
        }, geoOptions.timeout);
    
        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(geoTimeout);
                handleGeolocationSuccess(position);
            },
            (error) => {
                clearTimeout(geoTimeout);
                handleGeolocationError(error);
            },
            geoOptions
        );
    } else {
        console.log("Geolocation is not available.");
        userNearestStop.innerHTML = 'Geolocation unavailable';
        userLocationArea.innerHTML = 'Geolocation unavailable';
    }
});
