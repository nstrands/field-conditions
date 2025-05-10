// API Keys should be removed from here and handled by the backend.
// const OW_API_KEY = 'YOUR_OW_API_KEY'; // REMOVE
// const ASTRO_APP_ID = 'YOUR_ASTRO_APP_ID'; // REMOVE
// const ASTRO_APP_SECRET = 'YOUR_ASTRO_APP_SECRET'; // REMOVE
// const TIDES_API_KEY = 'YOUR_TIDES_API_KEY'; // REMOVE

// Replace with your actual Render backend URL or http://localhost:5000 for local testing
const BACKEND_URL = 'hhttps://field-conditions-backend.onrender.com/'; // Or 'http://localhost:5000'

async function fetchData() {
    const lat = document.getElementById('lat').value;
    const lon = document.getElementById('lon').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = "Loading data...";

    if (!lat || !lon) {
        resultsDiv.innerHTML = "Please enter both latitude and longitude.";
        return;
    }

    try {
        // Weather data from backend
        const weatherResp = await fetch(`${BACKEND_URL}/weather?lat=${lat}&lon=${lon}`);
        if (!weatherResp.ok) throw new Error(`Weather data fetch failed: ${weatherResp.statusText}`);
        const weather = await weatherResp.json();

        const forecastResp = await fetch(`${BACKEND_URL}/forecast?lat=${lat}&lon=${lon}`);
        if (!forecastResp.ok) throw new Error(`Forecast data fetch failed: ${forecastResp.statusText}`);
        const forecast = await forecastResp.json();

        // Ensure forecast.list exists and is an array before processing
        const highTemp = forecast.list && forecast.list.length > 0 ? Math.max(...forecast.list.slice(0,8).map(f => f.main.temp_max)) : 'N/A';
        const lowTemp = forecast.list && forecast.list.length > 0 ? Math.min(...forecast.list.slice(0,8).map(f => f.main.temp_min)) : 'N/A';

        // AQI data from backend
        const aqiResp = await fetch(`${BACKEND_URL}/air-pollution?lat=${lat}&lon=${lon}`);
        if (!aqiResp.ok) throw new Error(`AQI data fetch failed: ${aqiResp.statusText}`);
        const aqiData = await aqiResp.json();
        const aqi = aqiData.list && aqiData.list.length > 0 ? aqiData.list[0].main.aqi : 'N/A';

        const currentDate = new Date().toISOString().split('T')[0];

        // Moon phase from backend
        const moonPhaseResp = await fetch(`${BACKEND_URL}/moon-phase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                observer: { latitude: Number(lat), longitude: Number(lon), date: currentDate }
            })
        });
        if (!moonPhaseResp.ok) throw new Error(`Moon phase data fetch failed: ${moonPhaseResp.statusText} - ${await moonPhaseResp.text()}`);
        const moonPhase = await moonPhaseResp.json();

        // Moonrise and Moonset from backend
        const moonRiseSetResp = await fetch(`${BACKEND_URL}/moon-rise-set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                observer: { latitude: Number(lat), longitude: Number(lon), date: currentDate }
            })
        });
        if (!moonRiseSetResp.ok) throw new Error(`Moon rise/set data fetch failed: ${moonRiseSetResp.statusText} - ${await moonRiseSetResp.text()}`);
        const moonRiseSet = await moonRiseSetResp.json();
        
        // Safely access moon rise/set data
        const moonrise = moonRiseSet.data && moonRiseSet.data.rise ? moonRiseSet.data.rise.time : 'No rise data';
        const moonset = moonRiseSet.data && moonRiseSet.data.set ? moonRiseSet.data.set.time : 'No set data';


        // Tide data from backend
        // The 'extremes' parameter is a valueless parameter, common to include it like this in query strings
        const tidesResp = await fetch(`${BACKEND_URL}/tides?lat=${lat}&lon=${lon}&extremes`);
        if (!tidesResp.ok) throw new Error(`Tides data fetch failed: ${tidesResp.statusText}`);
        const tides = await tidesResp.json();
        const now = new Date();

        let closestHigh = null;
        let closestLow = null;

        if (tides.extremes && Array.isArray(tides.extremes)) {
            tides.extremes.forEach(event => {
                const eventTime = new Date(event.date); // WorldTides API returns date in UTC
                if (event.type === 'High' && (!closestHigh || Math.abs(eventTime - now) < Math.abs(new Date(closestHigh.date) - now))) {
                    closestHigh = event;
                }
                if (event.type === 'Low' && (!closestLow || Math.abs(eventTime - now) < Math.abs(new Date(closestLow.date) - now))) {
                    closestLow = event;
                }
            });
        }

        const highTideInfo = closestHigh ? `${new Date(closestHigh.date).toLocaleTimeString()} (${closestHigh.height !== undefined ? closestHigh.height.toFixed(2) : 'N/A'}m)` : 'N/A';
        const lowTideInfo = closestLow ? `${new Date(closestLow.date).toLocaleTimeString()} (${closestLow.height !== undefined ? closestLow.height.toFixed(2) : 'N/A'}m)` : 'N/A';

        // Display Results
        resultsDiv.innerHTML = `
            📍 <strong>Location:</strong> (${lat}, ${lon})<br>
            🌤 <strong>Conditions:</strong> ${weather.weather && weather.weather[0] ? weather.weather[0].description : 'N/A'}<br>
            🌡 <strong>Current:</strong> ${weather.main ? weather.main.temp : 'N/A'}°F (H: ${highTemp}°F, L: ${lowTemp}°F)<br>
            💨 <strong>Wind:</strong> ${weather.wind ? weather.wind.speed : 'N/A'} mph (${weather.wind ? weather.wind.deg : 'N/A'}°)<br>
            💧 <strong>Humidity:</strong> ${weather.main ? weather.main.humidity : 'N/A'}%<br>
            🌦 <strong>Precipitation:</strong> ${weather.rain && weather.rain['1h'] ? weather.rain['1h'] + ' mm' : 'None'}<br>
            🌅 <strong>Sunrise:</strong> ${weather.sys && weather.sys.sunrise ? new Date(weather.sys.sunrise * 1000).toLocaleTimeString() : 'N/A'}<br>
            🌇 <strong>Sunset:</strong> ${weather.sys && weather.sys.sunset ? new Date(weather.sys.sunset * 1000).toLocaleTimeString() : 'N/A'}<br>
            🌙 <strong>Moon Phase:</strong> ${moonPhase.data && moonPhase.data.phase && moonPhase.data.phase.name ? moonPhase.data.phase.name : 'N/A'}<br>
            🌔 <strong>Moonrise:</strong> ${moonrise}<br>
            🌖 <strong>Moonset:</strong> ${moonset}<br>
            🌊 <strong>Next High Tide:</strong> ${highTideInfo}<br>
            🌊 <strong>Next Low Tide:</strong> ${lowTideInfo}<br>
            🌬 <strong>AQI Level (1-5):</strong> ${aqi}
        `;
    } catch (error) {
        console.error("Detailed error:", error); // Log the full error to the console
        resultsDiv.innerHTML = `Error fetching data: ${error.message}. Check console for more details.`;
    }
}