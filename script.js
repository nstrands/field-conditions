const OW_API_KEY = '350f845b626c8931bff0bcf7625f0a71';
const ASTRO_APP_ID = '52c535b9-e9ce-48af-809d-2178d8bb6bcf';
const ASTRO_APP_SECRET = 'Ybb32fdeb86069f2fd9c3a5776d06bd0e9763903e5a0317278ef5cc22e65881bc8a2a2b2bd23c9570517c7115f0e70b9c59ce89c24d92002d4adfaca6bc7a3c1fcc5906e20cbb55ca554ff5de828b98cd2d4880bdd4771a95d4c373513422ea840aec9722da75ab6aa78aa45870fdf70b';
const TIDES_API_KEY = 'Y78906f18-8300-4e2a-91e3-3fc3a24f0315';

async function fetchData() {
    const lat = document.getElementById('lat').value;
    const lon = document.getElementById('lon').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = "Loading data...";

    try {
        // Weather data
        const weatherResp = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${OW_API_KEY}`);
        const weather = await weatherResp.json();

        const forecastResp = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${OW_API_KEY}`);
        const forecast = await forecastResp.json();

        const highTemp = Math.max(...forecast.list.slice(0,8).map(f => f.main.temp_max));
        const lowTemp = Math.min(...forecast.list.slice(0,8).map(f => f.main.temp_min));

        // AQI data
        const aqiResp = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OW_API_KEY}`);
        const aqiData = await aqiResp.json();
        const aqi = aqiData.list[0].main.aqi;

        // Moon phase
        const moonPhaseResp = await fetch('https://api.astronomyapi.com/api/v2/studio/moon-phase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa(`${ASTRO_APP_ID}:${ASTRO_APP_SECRET}`)
            },
            body: JSON.stringify({
                observer: { latitude: Number(lat), longitude: Number(lon), date: new Date().toISOString().split('T')[0] }
            })
        });
        const moonPhase = await moonPhaseResp.json();

        // Moonrise and Moonset
        const moonRiseSetResp = await fetch('https://api.astronomyapi.com/api/v2/studio/moon-rise-set', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa(`${ASTRO_APP_ID}:${ASTRO_APP_SECRET}`)
            },
            body: JSON.stringify({
                observer: { latitude: Number(lat), longitude: Number(lon), date: new Date().toISOString().split('T')[0] }
            })
        });
        const moonRiseSet = await moonRiseSetResp.json();

        const moonrise = moonRiseSet.data.rise ? moonRiseSet.data.rise.time : 'No rise today';
        const moonset = moonRiseSet.data.set ? moonRiseSet.data.set.time : 'No set today';

        // Tide data
        const tidesResp = await fetch(`https://www.worldtides.info/api/v3?lat=${lat}&lon=${lon}&extremes&key=${TIDES_API_KEY}`);
        const tides = await tidesResp.json();
        const now = new Date();

        let closestHigh = null;
        let closestLow = null;

        tides.extremes.forEach(event => {
            const eventTime = new Date(event.date);
            if (event.type === 'High' && (!closestHigh || Math.abs(eventTime - now) < Math.abs(new Date(closestHigh.date) - now))) {
                closestHigh = event;
            }
            if (event.type === 'Low' && (!closestLow || Math.abs(eventTime - now) < Math.abs(new Date(closestLow.date) - now))) {
                closestLow = event;
            }
        });

        const highTideInfo = closestHigh ? `${new Date(closestHigh.date).toLocaleTimeString()} (${closestHigh.height.toFixed(2)}m)` : 'N/A';
        const lowTideInfo = closestLow ? `${new Date(closestLow.date).toLocaleTimeString()} (${closestLow.height.toFixed(2)}m)` : 'N/A';

        // Display Results
        resultsDiv.innerHTML = `
            📍 <strong>Location:</strong> (${lat}, ${lon})<br>
            🌤 <strong>Conditions:</strong> ${weather.weather[0].description}<br>
            🌡 <strong>Current:</strong> ${weather.main.temp}°F (H: ${highTemp}°F, L: ${lowTemp}°F)<br>
            💨 <strong>Wind:</strong> ${weather.wind.speed} mph (${weather.wind.deg}°)<br>
            💧 <strong>Humidity:</strong> ${weather.main.humidity}%<br>
            🌦 <strong>Precipitation:</strong> ${weather.rain ? weather.rain['1h'] + ' mm' : 'None'}<br>
            🌅 <strong>Sunrise:</strong> ${new Date(weather.sys.sunrise * 1000).toLocaleTimeString()}<br>
            🌇 <strong>Sunset:</strong> ${new Date(weather.sys.sunset * 1000).toLocaleTimeString()}<br>
            🌙 <strong>Moon Phase:</strong> ${moonPhase.data.phase.name}<br>
            🌔 <strong>Moonrise:</strong> ${moonrise}<br>
            🌖 <strong>Moonset:</strong> ${moonset}<br>
            🌊 <strong>Next High Tide:</strong> ${highTideInfo}<br>
            🌊 <strong>Next Low Tide:</strong> ${lowTideInfo}<br>
            🌬 <strong>AQI Level (1-5):</strong> ${aqi}
        `;
    } catch (error) {
        resultsDiv.innerHTML = `Error fetching data: ${error.message}`;
    }
}