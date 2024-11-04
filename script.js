var map = L.map('map').setView([0, 0], 2);
var markers = [];

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
	
async function getWeatherData(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка при запросе к API');
        return await response.json();
    } catch (error) {
        console.error('Ошибка:', error);
        return null;
    }
}

function getClothingRecommendation(temperature) {
    if (temperature < 0) return "Очень холодно! Наденьте теплую куртку, шапку, шарф и перчатки.";
    if (temperature < 10) return "Прохладно. Рекомендуется надеть пальто или куртку.";
    if (temperature < 20) return "Умеренно тепло. Подойдет легкая куртка или свитер.";
    if (temperature < 25) return "Тепло. Можно надеть футболку и легкие брюки или юбку.";
    return "Жарко! Наденьте легкую одежду и не забудьте про головной убор.";
}

function getWeatherIcon(weatherCode) {
    if (weatherCode <= 3) return "☀️"; 
    if (weatherCode <= 48) return "☁️";
    if (weatherCode <= 77) return "🌧️";
    if (weatherCode <= 82) return "🌨️";
    return "⛈️";
}

function formatWeatherData(data) {
    if (!data || !data.hourly) return 'Не удалось получить данные о погоде';

    const currentHour = new Date().getHours();
    const temp = data.hourly.temperature_2m[currentHour];
    const weatherCode = data.hourly.weathercode[currentHour];
    const icon = getWeatherIcon(weatherCode);
    const recommendation = getClothingRecommendation(temp);

    let forecast = `<h3>Текущая погода: ${icon} ${temp.toFixed(1)}°C</h3>`;
    forecast += `<p>${recommendation}</p>`;
    forecast += "<h4>Прогноз на 7 дней:</h4>";

    for (let i = 0; i < 7; i++) {
        const date = new Date(data.daily.time[i]).toLocaleDateString();
        const minTemp = data.daily.temperature_2m_min[i];
        const maxTemp = data.daily.temperature_2m_max[i];
        const dayIcon = getWeatherIcon(data.daily.weathercode[i]);
        forecast += `<p>${date}: ${dayIcon} ${minTemp.toFixed(1)}°C - ${maxTemp.toFixed(1)}°C</p>`;
    }

    return forecast;
}

function saveMarkersToLocalStorage() {
    const markersData = markers.map(marker => {
        const latLng = marker.getLatLng();
        return {
            lat: latLng.lat,
            lng: latLng.lng
        };
    });
    localStorage.setItem('savedMarkers', JSON.stringify(markersData));
}

async function loadMarkersFromLocalStorage() {
    const savedMarkers = localStorage.getItem('savedMarkers');
    if (savedMarkers) {
        const markersData = JSON.parse(savedMarkers);
        for (const markerData of markersData) {
            await addMarker(markerData.lat, markerData.lng);
        }
    }
}

async function addMarker(lat, lng) {
    const weatherData = await getWeatherData(lat, lng);
    let popupContent = `<h3>Координаты: ${lat}, ${lng}</h3>`;
    popupContent += formatWeatherData(weatherData);

    const marker = L.marker([lat, lng]).addTo(map)
        .bindPopup(popupContent)
        .openPopup();

    markers.push(marker);
    updateFavorites();
    saveMarkersToLocalStorage(); 
}

map.on('click', async function(e) {
    var lat = e.latlng.lat.toFixed(4);
    var lng = e.latlng.lng.toFixed(4);
    addMarker(lat, lng);
});

function updateFavorites() {
    const favoritesList = document.getElementById('favorites');
    favoritesList.innerHTML = '';
    markers.forEach((marker, index) => {
        const li = document.createElement('li');
        li.textContent = `Локация ${index + 1}: ${marker.getLatLng().lat.toFixed(4)}, ${marker.getLatLng().lng.toFixed(4)}`;
        li.onclick = () => {
            map.setView(marker.getLatLng(), 10);
            marker.openPopup();
        };
        favoritesList.appendChild(li);
    });
}

document.getElementById('citySearch').addEventListener('submit', async function(e) {
    e.preventDefault();
    const city = document.getElementById('cityInput').value;

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
        const data = await response.json();
		console.log(data);
		
        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            map.setView([lat, lon], 10);
            addMarker(lat, lon);
        } else {
            alert('Город не найден');
        }
    } catch (error) {
        console.error('Ошибка при поиске города:', error);
        alert('Произошла ошибка при поиске города');
    }
});

function clearAllMarkers() {
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
    updateFavorites();
    localStorage.removeItem('savedMarkers');
}

document.getElementById('clearMarkers').addEventListener('click', clearAllMarkers);

document.addEventListener('DOMContentLoaded', () => {
    loadMarkersFromLocalStorage();
});