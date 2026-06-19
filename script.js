// Weather API endpoints
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const suggestionBox = document.getElementById('suggestions');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('errorMessage');
const currentWeatherDiv = document.getElementById('currentWeather');
const forecastSection = document.getElementById('forecastSection');
const weeklySection = document.getElementById('weeklySection');
const welcomeMessage = document.getElementById('welcomeMessage');

// Weather icons mapping
const weatherIcons = {
    0: '☀️',      // Clear sky
    1: '🌤️',     // Mainly clear
    2: '⛅',      // Partly cloudy
    3: '☁️',      // Overcast
    45: '🌫️',    // Foggy
    48: '🌫️',    // Foggy
    51: '🌧️',    // Drizzle
    53: '🌧️',    // Drizzle
    55: '🌧️',    // Drizzle
    61: '🌧️',    // Rain
    63: '🌧️',    // Rain
    65: '⛈️',    // Heavy rain
    71: '❄️',    // Snow
    73: '❄️',    // Snow
    75: '❄️',    // Heavy snow
    77: '❄️',    // Snow
    80: '🌧️',    // Rain showers
    81: '⛈️',    // Heavy rain showers
    82: '⛈️',    // Violent rain showers
    85: '❄️',    // Snow showers
    86: '❄️',    // Heavy snow showers
    95: '⛈️',    // Thunderstorm
    96: '⛈️',    // Thunderstorm with hail
    97: '⛈️'     // Thunderstorm with hail
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchWeather();
    });
    searchInput.addEventListener('input', debounce(showSuggestions, 300));
});

// Debounce function
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Show suggestions
async function showSuggestions() {
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        suggestionBox.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(
            `${GEOCODING_API}?name=${query}&count=5&language=en&format=json`
        );
        const data = await response.json();

        suggestionBox.innerHTML = '';

        if (data.results && data.results.length > 0) {
            data.results.forEach(result => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                const country = result.country ? `, ${result.country}` : '';
                const admin = result.admin1 ? `, ${result.admin1}` : '';
                item.textContent = `${result.name}${admin}${country}`;
                item.onclick = () => {
                    searchInput.value = result.name;
                    suggestionBox.innerHTML = '';
                    fetchWeather(result.latitude, result.longitude, result.name);
                };
                suggestionBox.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

// Search weather
async function searchWeather() {
    const city = searchInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    try {
        const response = await fetch(
            `${GEOCODING_API}?name=${city}&count=1&language=en&format=json`
        );
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            showError('City not found. Please try another search.');
            return;
        }

        const result = data.results[0];
        suggestionBox.innerHTML = '';
        fetchWeather(result.latitude, result.longitude, result.name);
    } catch (error) {
        showError('Error searching for city. Please try again.');
        console.error('Error:', error);
    }
}

// Get location weather
function getLocationWeather() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            fetchWeather(
                position.coords.latitude,
                position.coords.longitude,
                'Your Location'
            );
        },
        () => {
            showError('Unable to access your location. Please enable location services.');
            showLoading(false);
        }
    );
}

// Fetch weather data
async function fetchWeather(latitude, longitude, cityName) {
    showLoading(true);
    hideError();

    try {
        const response = await fetch(
            `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl,visibility&hourly=temperature_2m,weather_code,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`
        );
        const data = await response.json();

        // Get reverse geocoding for more info
        try {
            const geoResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const geoData = await geoResponse.json();
            if (geoData.address && geoData.address.country) {
                searchInput.value = `${cityName}, ${geoData.address.country}`;
            }
        } catch (e) {
            searchInput.value = cityName;
        }

        displayWeather(data, cityName);
        showLoading(false);
    } catch (error) {
        showError('Error fetching weather data. Please try again.');
        console.error('Error:', error);
        showLoading(false);
    }
}

// Display weather data
function displayWeather(data, cityName) {
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    // Update current weather
    document.getElementById('cityName').textContent = cityName;
    document.getElementById('weatherDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const temp = Math.round(current.temperature_2m);
    document.getElementById('temperature').textContent = temp;
    
    const weatherIcon = weatherIcons[current.weather_code] || '🌡️';
    document.getElementById('weatherIcon').textContent = weatherIcon;
    document.getElementById('weatherIcon').style.fontSize = '100px';

    const description = getWeatherDescription(current.weather_code);
    document.getElementById('weatherDesc').textContent = description;
    document.getElementById('feelsLike').textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;

    document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    document.getElementById('pressure').textContent = `${current.pressure_msl} mb`;
    
    const visibility = current.visibility ? (current.visibility / 1000).toFixed(1) + ' km' : 'N/A';
    document.getElementById('visibility').textContent = visibility;

    document.getElementById('maxTemp').textContent = `${Math.round(daily.temperature_2m_max[0])}°C`;
    document.getElementById('minTemp').textContent = `${Math.round(daily.temperature_2m_min[0])}°C`;

    // Display sections
    welcomeMessage.style.display = 'none';
    currentWeatherDiv.style.display = 'block';

    // Display hourly forecast
    displayHourlyForecast(hourly);

    // Display weekly forecast
    displayWeeklyForecast(daily);
}

// Display hourly forecast
function displayHourlyForecast(hourly) {
    const hourlyDiv = document.getElementById('hourlyForecast');
    hourlyDiv.innerHTML = '';

    const now = new Date();
    const currentHour = now.getHours();

    for (let i = 0; i < 24; i++) {
        const time = new Date(now);
        time.setHours(time.getHours() + i);

        const timeString = time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const temp = Math.round(hourly.temperature_2m[i]);
        const weatherCode = hourly.weather_code[i];
        const icon = weatherIcons[weatherCode] || '🌡️';

        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item';
        hourlyItem.innerHTML = `
            <div class="hourly-time">${timeString}</div>
            <div class="hourly-icon">${icon}</div>
            <div class="hourly-temp">${temp}°</div>
        `;
        hourlyDiv.appendChild(hourlyItem);
    }

    forecastSection.style.display = 'block';
}

// Display weekly forecast
function displayWeeklyForecast(daily) {
    const weeklyDiv = document.getElementById('weeklyForecast');
    weeklyDiv.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        const dateString = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const weatherCode = daily.weather_code[i];
        const icon = weatherIcons[weatherCode] || '🌡️';
        const description = getWeatherDescription(weatherCode);
        const precipitation = daily.precipitation_sum[i];

        const dailyCard = document.createElement('div');
        dailyCard.className = 'daily-card';
        dailyCard.innerHTML = `
            <div class="daily-date">${dateString}</div>
            <div class="daily-icon">${icon}</div>
            <div class="daily-desc">${description}</div>
            <div class="daily-temps">
                <span class="daily-max">${maxTemp}°</span>
                <span class="daily-min">${minTemp}°</span>
            </div>
            ${precipitation > 0 ? `<div style="color: #4ECDC4; font-size: 0.8rem; margin-top: 0.5rem;">💧 ${precipitation.toFixed(1)}mm</div>` : ''}
        `;
        weeklyDiv.appendChild(dailyCard);
    }

    weeklySection.style.display = 'block';
}

// Get weather description from weather code
function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear Sky',
        1: 'Mainly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy',
        51: 'Light Drizzle',
        53: 'Moderate Drizzle',
        55: 'Heavy Drizzle',
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        71: 'Slight Snow',
        73: 'Moderate Snow',
        75: 'Heavy Snow',
        77: 'Snow Grains',
        80: 'Slight Rain Showers',
        81: 'Moderate Rain Showers',
        82: 'Violent Rain Showers',
        85: 'Slight Snow Showers',
        86: 'Heavy Snow Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with Hail',
        97: 'Thunderstorm with Hail'
    };
    return descriptions[code] || 'Unknown';
}

// Show loading state
function showLoading(show) {
    loadingDiv.style.display = show ? 'block' : 'none';
}

// Show error message
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    currentWeatherDiv.style.display = 'none';
    forecastSection.style.display = 'none';
    weeklySection.style.display = 'none';
}

// Hide error message
function hideError() {
    errorDiv.style.display = 'none';
}
