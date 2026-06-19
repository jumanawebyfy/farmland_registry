// ============================================================
// Farmer Land Registry - Frontend JavaScript
// ============================================================

// ============================================================
// Configuration
// ============================================================
const API_URL = 'http://localhost:3000/api/farmers';

// ============================================================
// DOM Elements
// ============================================================
const form = document.getElementById('registrationForm');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const cropInput = document.getElementById('crop');
const plotSizeInput = document.getElementById('plotSize');
const getLocationBtn = document.getElementById('getLocationBtn');
const locationStatus = document.getElementById('locationStatus');
const locationPreview = document.getElementById('locationPreview');
const locationCoords = document.getElementById('locationCoords');
const locationSource = document.getElementById('locationSource');
const clearLocationBtn = document.getElementById('clearLocationBtn');
const registerBtn = document.getElementById('registerBtn');
const formMessage = document.getElementById('formMessage');
const refreshMapBtn = document.getElementById('refreshMapBtn');
const nearbyBtn = document.getElementById('nearbyBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const mapStats = document.getElementById('mapStats');

// Manual location elements
const manualLatInput = document.getElementById('manualLat');
const manualLngInput = document.getElementById('manualLng');
const setManualLocationBtn = document.getElementById('setManualLocationBtn');
const manualLocationHelp = document.getElementById('manualLocationHelp');

// Place search elements
const placeSearchInput = document.getElementById('placeSearchInput');
const placeSearchBtn = document.getElementById('placeSearchBtn');

// ============================================================
// State
// ============================================================
let selectedLocation = null;
let selectedLocationSource = '';
let map = null;
let markers = [];
let currentPosition = null;
let defaultCenter = [10.5276, 76.2144]; // Kerala, India
let defaultZoom = 9;
let allFarmersData = [];
let skipViewportLoad = false; // ✅ NEW: Prevents viewport load during nearby search

// ============================================================
// Initialize Map
// ============================================================
function initMap() {
    map = L.map('map', {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    L.control.scale({
        position: 'bottomleft',
        metric: true,
        imperial: false
    }).addTo(map);

    map.on('load', loadFarmers);

    // ✅ FIX: Only load viewport if not skipped
    map.on('moveend', () => {
        if (!skipViewportLoad && map.getZoom() > 10) {
            loadFarmersInViewport();
        }
    });
}

// ============================================================
// Location Functions
// ============================================================

// Common function to set location (used by GPS, Manual, Place Search)
function setLocation(lat, lng, source) {
    selectedLocation = { lat, lng };
    selectedLocationSource = source;

    locationPreview.style.display = 'flex';
    locationCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    locationSource.textContent = `(from ${source})`;
    locationStatus.textContent = `✅ Location set (${source})`;
    locationStatus.style.color = '#27ae60';

    if (window._tempMarker) map.removeLayer(window._tempMarker);

    const iconHtml = source === 'GPS' ? '📍' : (source === 'Place' ? '🔍' : '📌');
    window._tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'temp-marker',
            html: iconHtml,
            iconSize: [30, 30]
        })
    }).addTo(map);

    map.setView([lat, lng], 14);

    manualLatInput.value = lat;
    manualLngInput.value = lng;
}

// Get Current Location (GPS)
function getCurrentLocation() {
    locationStatus.textContent = '📍 Getting location...';
    locationStatus.style.color = '#f39c12';

    if (!navigator.geolocation) {
        locationStatus.textContent = '❌ Geolocation not supported';
        locationStatus.style.color = '#e74c3c';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setLocation(lat, lng, 'GPS');
        },
        (error) => {
            console.error('Geolocation error:', error);
            let message = '';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message = '❌ Permission denied. Use manual entry or place search.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = '❌ Location unavailable. Use manual entry or place search.';
                    break;
                case error.TIMEOUT:
                    message = '❌ Location timeout. Use manual entry or place search.';
                    break;
                default:
                    message = '❌ Could not get location. Use manual entry or place search.';
            }
            locationStatus.textContent = message;
            locationStatus.style.color = '#e74c3c';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// Set Manual Location (from lat/lng inputs)
function setManualLocation() {
    const lat = parseFloat(manualLatInput.value);
    const lng = parseFloat(manualLngInput.value);

    if (isNaN(lat) || isNaN(lng)) {
        manualLocationHelp.textContent = '❌ Please enter valid numbers for latitude and longitude';
        manualLocationHelp.style.color = '#e74c3c';
        return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        manualLocationHelp.textContent = '❌ Latitude must be between -90 and 90, Longitude between -180 and 180';
        manualLocationHelp.style.color = '#e74c3c';
        return;
    }

    setLocation(lat, lng, 'Manual');
    manualLocationHelp.textContent = '✅ Manual location set!';
    manualLocationHelp.style.color = '#27ae60';
}

// Place Search (OSM Nominatim)
async function searchPlace() {
    const query = placeSearchInput.value.trim();
    if (!query) {
        manualLocationHelp.textContent = '❌ Please enter a place name';
        manualLocationHelp.style.color = '#e74c3c';
        return;
    }

    manualLocationHelp.textContent = '🔍 Searching...';
    manualLocationHelp.style.color = '#f39c12';
    placeSearchBtn.disabled = true;
    placeSearchBtn.textContent = '⏳ Searching...';

    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'FarmerRegistry/1.0' }
        });

        if (!response.ok) throw new Error('Search request failed');

        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            const displayName = data[0].display_name;

            manualLatInput.value = lat;
            manualLngInput.value = lng;

            setLocation(lat, lng, 'Place');

            manualLocationHelp.textContent = `✅ Found: ${displayName.substring(0, 60)}...`;
            manualLocationHelp.style.color = '#27ae60';
            locationStatus.textContent = '✅ Location from place search';
            locationStatus.style.color = '#27ae60';

            placeSearchInput.value = '';
        } else {
            manualLocationHelp.textContent = '❌ Place not found. Try a different name.';
            manualLocationHelp.style.color = '#e74c3c';
        }
    } catch (error) {
        console.error('Place search error:', error);
        manualLocationHelp.textContent = '❌ Error searching place. Check your internet connection.';
        manualLocationHelp.style.color = '#e74c3c';
    } finally {
        placeSearchBtn.disabled = false;
        placeSearchBtn.textContent = '🔍 Search';
    }
}

// Clear Location
function clearLocation() {
    selectedLocation = null;
    selectedLocationSource = '';
    locationStatus.textContent = 'Click to get location, search for a place, or enter coordinates';
    locationStatus.style.color = '#888';
    locationPreview.style.display = 'none';
    locationCoords.textContent = '';
    locationSource.textContent = '';
    manualLatInput.value = '';
    manualLngInput.value = '';
    placeSearchInput.value = '';
    manualLocationHelp.textContent = 'Enter coordinates or search for a place';
    manualLocationHelp.style.color = '#888';

    if (window._tempMarker) {
        map.removeLayer(window._tempMarker);
        window._tempMarker = null;
    }
}

// ============================================================
// Load Farmers
// ============================================================
async function loadFarmers() {
    console.log('🔄 loadFarmers() called...');
    mapStats.textContent = 'Loading farmers...';

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        console.log('📦 API response:', result);

        if (result.success && result.data) {
            allFarmersData = result.data;
            console.log(`✅ Loaded ${allFarmersData.length} farmers`);

            clearMarkers();
            addFarmersToMap(result.data);
            renderFarmerList(result.data);
            renderTable(result.data);

            const count = result.data.length;
            mapStats.textContent = `📍 ${count} farmer${count !== 1 ? 's' : ''} on map`;

            if (count > 0) {
                document.getElementById('tableSection').style.display = 'block';
            }
        } else {
            console.warn('⚠️ No farmers data or API error');
            allFarmersData = [];
            renderFarmerList([]);
            renderTable([]);
            mapStats.textContent = '❌ No farmers found';
        }
    } catch (error) {
        console.error('❌ Error loading farmers:', error);
        allFarmersData = [];
        renderFarmerList([]);
        renderTable([]);
        mapStats.textContent = '❌ Failed to connect to server';
    }
}

// Load farmers in current viewport (optimization)
async function loadFarmersInViewport() {
    // ✅ Skip if flagged
    if (skipViewportLoad) {
        console.log('⏭️ Viewport load skipped (nearby search active)');
        return;
    }

    const bounds = map.getBounds();
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLng = bounds.getWest();
    const maxLng = bounds.getEast();

    try {
        const url = `${API_URL}/bbox?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn('Viewport API returned status:', response.status);
            return;
        }

        const result = await response.json();

        if (result && result.success && result.data) {
            clearMarkers();
            addFarmersToMap(result.data);
            const count = result.data.length;
            mapStats.textContent = `📍 ${count} farmer${count !== 1 ? 's' : ''} in view`;
        } else {
            console.warn('Invalid response from viewport API:', result);
        }
    } catch (error) {
        console.warn('Viewport load error (non-critical):', error.message);
    }
}

// ============================================================
// FIND NEARBY FARMERS - ✅ FIXED
// ============================================================
async function findNearbyFarmers(lat, lng, km = 5) {
    mapStats.textContent = `🔍 Searching within ${km}km...`;

    try {
        const url = `${API_URL}/nearby?lat=${lat}&lng=${lng}&km=${km}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            // Clear old markers and circle
            clearMarkers();

            // Add nearby farmers to map
            addFarmersToMap(result.data);

            // ✅ Update sidebar with nearby results (not viewport)
            renderFarmerList(result.data);

            const count = result.data.length;
            mapStats.textContent = `📍 ${count} farmer${count !== 1 ? 's' : ''} within ${km}km`;

            // Draw circle showing search radius
            const circle = L.circle([lat, lng], {
                radius: km * 1000,
                color: '#2d7d46',
                fillColor: '#2d7d46',
                fillOpacity: 0.1,
                weight: 2
            }).addTo(map);
            window._searchCircle = circle;

            // ✅ FIX: Prevent viewport load from overwriting results
            skipViewportLoad = true;

            // Center map on search location
            map.setView([lat, lng], Math.max(map.getZoom(), 11));

            // ✅ Reset flag after map finishes moving
            map.once('moveend', () => {
                skipViewportLoad = false;
                console.log('✅ Viewport load re-enabled');
            });

        } else {
            mapStats.textContent = '❌ No farmers found nearby';
            renderFarmerList([]);
        }
    } catch (error) {
        console.error('Error finding nearby farmers:', error);
        mapStats.textContent = '❌ Failed to find nearby farmers';
    }
}

// ============================================================
// Register a new farmer
// ============================================================
async function registerFarmer(farmerData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(farmerData)
        });

        const result = await response.json();

        if (result.success) {
            showFormMessage('success', '✅ Farmer registered successfully!');
            form.reset();
            clearLocation();
            loadFarmers();
            return true;
        } else {
            const errors = result.errors ? result.errors.join(', ') : result.message;
            showFormMessage('error', `❌ Registration failed: ${errors}`);
            return false;
        }
    } catch (error) {
        console.error('Error registering farmer:', error);
        showFormMessage('error', '❌ Failed to connect to server');
        return false;
    }
}

// ============================================================
// Map Helpers
// ============================================================
function clearMarkers() {
    markers.forEach(marker => {
        if (map) map.removeLayer(marker);
    });
    markers = [];

    if (window._searchCircle) {
        map.removeLayer(window._searchCircle);
        window._searchCircle = null;
    }
}

function addFarmersToMap(farmers) {
    const cropEmojis = {
        'paddy': '🌾',
        'wheat': '🌾',
        'corn': '🌽',
        'vegetables': '🥬',
        'fruits': '🍎',
        'sugarcane': '🍃',
        'cotton': '🌿',
        'coffee': '☕',
        'tea': '🍵',
        'spices': '🌶️',
        'other': '🌱'
    };

    farmers.forEach(farmer => {
        const [lng, lat] = farmer.location.coordinates;
        const cropEmoji = cropEmojis[farmer.cropType] || '🌱';

        const marker = L.marker([lat, lng], {
            riseOnHover: true
        }).bindPopup(`
            <div style="min-width:150px;">
                <h3 style="color:#2d7d46;margin:0 0 8px 0;">${escapeHtml(farmer.name)}</h3>
                <p style="margin:4px 0;">
                    <strong>${cropEmoji} Crop:</strong> ${escapeHtml(farmer.cropType)}
                </p>
                ${farmer.plotSize ? `<p style="margin:4px 0;"><strong>📐 Size:</strong> ${farmer.plotSize} acres</p>` : ''}
                ${farmer.phone ? `<p style="margin:4px 0;"><strong>📞 Phone:</strong> ${escapeHtml(farmer.phone)}</p>` : ''}
                <p style="margin:4px 0;font-size:0.8rem;color:#888;">
                    Registered: ${new Date(farmer.registeredAt).toLocaleDateString()}
                </p>
                <div style="margin-top:8px;">
                    <button onclick="focusFarmer('${farmer._id}')" style="padding:4px 12px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">📍 Focus</button>
                    <button onclick="editFarmer('${farmer._id}')" style="padding:4px 12px;background:#2d7d46;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:4px;">✏️ Edit</button>
                    <button onclick="deleteFarmer('${farmer._id}')" style="padding:4px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:4px;">🗑️ Delete</button>
                </div>
            </div>
        `);

        marker._id = farmer._id;
        marker.addTo(map);
        markers.push(marker);
    });
}

// ============================================================
// Sidebar - Farmer List
// ============================================================
function renderFarmerList(farmers) {
    const listContainer = document.getElementById('farmerList');
    const countContainer = document.getElementById('farmerCount');

    console.log('Rendering farmer list with:', farmers.length, 'farmers');

    if (!farmers || farmers.length === 0) {
        listContainer.innerHTML = `
            <div class="no-results" style="text-align:center;padding:30px 0;color:#888;">
                🌾 No farmers registered yet<br>
                <span style="font-size:0.85rem;">Register a farmer above!</span>
            </div>
        `;
        countContainer.textContent = '0 farmers';
        return;
    }

    countContainer.textContent = `${farmers.length} farmer${farmers.length !== 1 ? 's' : ''}`;

    const cropEmojis = {
        'paddy': '🌾',
        'wheat': '🌾',
        'corn': '🌽',
        'vegetables': '🥬',
        'fruits': '🍎',
        'sugarcane': '🍃',
        'cotton': '🌿',
        'coffee': '☕',
        'tea': '🍵',
        'spices': '🌶️',
        'other': '🌱'
    };

    let html = '';
    farmers.forEach((farmer) => {
        const [lng, lat] = farmer.location.coordinates;
        const cropEmoji = cropEmojis[farmer.cropType] || '🌱';

        html += `
            <div class="farmer-item" data-id="${farmer._id}" data-lat="${lat}" data-lng="${lng}">
                <div class="farmer-name">${escapeHtml(farmer.name)}</div>
                <div class="farmer-crop">${cropEmoji} ${escapeHtml(farmer.cropType)}${farmer.plotSize ? ` • ${farmer.plotSize} acres` : ''}</div>
                <div class="farmer-location">📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
                <div class="farmer-actions" style="margin-top:6px;display:flex;gap:4px;">
                    <button class="btn-focus" onclick="event.stopPropagation();focusFarmer('${farmer._id}')" style="padding:2px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:#3498db;color:white;">📍 Focus</button>
                    <button class="btn-edit" onclick="event.stopPropagation();editFarmer('${farmer._id}')" style="padding:2px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:#2d7d46;color:white;">✏️</button>
                    <button class="btn-delete" onclick="event.stopPropagation();deleteFarmer('${farmer._id}')" style="padding:2px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:#e74c3c;color:white;">🗑️</button>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    document.querySelectorAll('.farmer-item').forEach(item => {
        item.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            const id = this.dataset.id;

            document.querySelectorAll('.farmer-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');

            focusFarmer(id);
        });
    });
}

// ============================================================
// Focus Farmer
// ============================================================
function focusFarmer(id) {
    const farmer = allFarmersData.find(f => f._id === id);
    if (!farmer) {
        console.warn('Farmer not found:', id);
        return;
    }

    const [lng, lat] = farmer.location.coordinates;

    map.setView([lat, lng], 15);

    document.querySelectorAll('.farmer-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id === id);
    });

    const marker = markers.find(m => m._id === id);
    if (marker) {
        marker.openPopup();
    }
}

// ============================================================
// Search Functionality
// ============================================================
let searchTimeout = null;

function setupSearch() {
    const searchInput = document.getElementById('farmerSearch');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();

        if (clearBtn) {
            clearBtn.style.display = query ? 'block' : 'none';
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            this.style.display = 'none';
            performSearch('');
            searchInput.focus();
        });
    }
}

function performSearch(query) {
    if (!allFarmersData || allFarmersData.length === 0) {
        renderFarmerList([]);
        return;
    }

    if (!query) {
        renderFarmerList(allFarmersData);
        return;
    }

    const lowerQuery = query.toLowerCase();

    const filtered = allFarmersData.filter(farmer => {
        if (farmer.name.toLowerCase().includes(lowerQuery)) return true;
        if (farmer.cropType.toLowerCase().includes(lowerQuery)) return true;

        const [lng, lat] = farmer.location.coordinates;
        const locationStr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (locationStr.includes(lowerQuery)) return true;

        if (farmer.phone && farmer.phone.includes(query)) return true;

        return false;
    });

    renderFarmerList(filtered);

    const countContainer = document.getElementById('farmerCount');
    if (countContainer) {
        countContainer.textContent = `${filtered.length} of ${allFarmersData.length} farmer${allFarmersData.length !== 1 ? 's' : ''}`;
    }
}

// ============================================================
// Table View
// ============================================================
function renderTable(farmers) {
    const tableBody = document.getElementById('tableBody');

    if (!tableBody) return;

    if (!farmers || farmers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="loading-text">No farmers registered</td></tr>';
        return;
    }

    let html = '';
    farmers.forEach((farmer, index) => {
        const [lng, lat] = farmer.location.coordinates;

        html += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(farmer.name)}</strong></td>
                <td>${escapeHtml(farmer.cropType)}</td>
                <td>${farmer.plotSize || '-'}</td>
                <td>${farmer.phone || '-'}</td>
                <td>${lat.toFixed(4)}, ${lng.toFixed(4)}</td>
                <td>${new Date(farmer.registeredAt).toLocaleDateString()}</td>
                <td>
                    <div class="actions-cell" style="display:flex;gap:4px;">
                        <button onclick="focusFarmer('${farmer._id}')" style="padding:2px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:#3498db;color:white;">📍</button>
                        <button onclick="editFarmer('${farmer._id}')" style="padding:2px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:#2d7d46;color:white;">✏️</button>
                        <button onclick="deleteFarmer('${farmer._id}')" style="padding:2px 10px;font-size:0.7rem;border:none;border-radius:4px;cursor:pointer;background:#e74c3c;color:white;">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

function toggleTableView() {
    const tableSection = document.getElementById('tableSection');
    if (!tableSection) return;

    const isVisible = tableSection.style.display !== 'none';

    if (isVisible) {
        tableSection.style.display = 'none';
    } else {
        tableSection.style.display = 'block';
        renderTable(allFarmersData);
        tableSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function exportCSV() {
    if (!allFarmersData || allFarmersData.length === 0) {
        alert('No farmers to export!');
        return;
    }

    let csv = 'Name,Crop,Plot Size (acres),Phone,Latitude,Longitude,Registered Date\n';

    allFarmersData.forEach(farmer => {
        const [lng, lat] = farmer.location.coordinates;
        csv += `"${farmer.name}","${farmer.cropType}",${farmer.plotSize || ''},"${farmer.phone || ''}",${lat},${lng},"${new Date(farmer.registeredAt).toLocaleDateString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ============================================================
// Farmer Actions (Edit/Delete)
// ============================================================
window.editFarmer = async function(id) {
    const newCrop = prompt('Enter new crop type:');
    if (newCrop === null) return;
    if (!newCrop.trim()) {
        alert('Crop type cannot be empty');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cropType: newCrop.trim() })
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Crop updated successfully!');
            loadFarmers();
        } else {
            alert(`❌ Update failed: ${result.message}`);
        }
    } catch (error) {
        console.error('Error updating farmer:', error);
        alert('❌ Failed to update farmer');
    }
};

window.deleteFarmer = async function(id) {
    if (!confirm('Are you sure you want to delete this farmer?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Farmer deleted successfully!');
            loadFarmers();
        } else {
            alert(`❌ Delete failed: ${result.message}`);
        }
    } catch (error) {
        console.error('Error deleting farmer:', error);
        alert('❌ Failed to delete farmer');
    }
};

// ============================================================
// Form Handling
// ============================================================
function showFormMessage(type, message) {
    formMessage.className = `form-message ${type}`;
    formMessage.textContent = message;
    formMessage.style.display = 'block';

    clearTimeout(formMessage._timeout);
    formMessage._timeout = setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

// ============================================================
// Event Listeners Setup
// ============================================================
function setupEventListeners() {
    // GPS Location
    getLocationBtn.addEventListener('click', getCurrentLocation);

    // Manual Location
    setManualLocationBtn.addEventListener('click', setManualLocation);

    // Place Search
    placeSearchBtn.addEventListener('click', searchPlace);
    placeSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchPlace();
    });

    // Clear Location
    clearLocationBtn.addEventListener('click', clearLocation);

    // Refresh Map
    refreshMapBtn.addEventListener('click', loadFarmers);

    // Nearby Search
    nearbyBtn.addEventListener('click', () => {
        const center = map.getCenter();
        const km = prompt('Enter search radius in kilometers:', '5');
        if (km === null) return;

        const distance = parseFloat(km);
        if (isNaN(distance) || distance <= 0) {
            alert('Please enter a valid number');
            return;
        }

        findNearbyFarmers(center.lat, center.lng, distance);
    });

    // Reset View
    resetViewBtn.addEventListener('click', () => {
        skipViewportLoad = false; // ✅ Reset flag on manual reset
        map.setView(defaultCenter, defaultZoom);
        clearMarkers();
        loadFarmers();
    });

    // Table View buttons
    document.getElementById('showTableBtn').addEventListener('click', toggleTableView);
    document.getElementById('closeTableBtn').addEventListener('click', toggleTableView);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const crop = cropInput.value;

        if (!name) {
            showFormMessage('error', '❌ Please enter farmer name');
            nameInput.focus();
            return;
        }

        if (!crop) {
            showFormMessage('error', '❌ Please select a crop type');
            cropInput.focus();
            return;
        }

        if (!selectedLocation) {
            showFormMessage('error', '❌ Please set a location (GPS, Place Search, or Manual Coordinates)');
            return;
        }

        const farmerData = {
            name: name,
            phone: phoneInput.value.trim(),
            cropType: crop,
            plotSize: plotSizeInput.value ? parseFloat(plotSizeInput.value) : undefined,
            location: {
                type: 'Point',
                coordinates: [selectedLocation.lng, selectedLocation.lat]
            }
        };

        registerBtn.disabled = true;
        registerBtn.textContent = '⏳ Registering...';

        const success = await registerFarmer(farmerData);

        registerBtn.disabled = false;
        registerBtn.textContent = '🌾 Register Farmer';

        if (success) {
            nameInput.value = '';
            phoneInput.value = '';
            cropInput.value = '';
            plotSizeInput.value = '';
            clearLocation();
        }
    });
}

// ============================================================
// Helpers
// ============================================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// Keyboard Shortcuts
// ============================================================
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadFarmers();
    }
    if (e.key === 'Escape') {
        clearLocation();
    }
});

// ============================================================
// Initialize App
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌾 DOM ready, initializing app...');

    if (typeof L === 'undefined') {
        console.error('❌ Leaflet not loaded!');
        mapStats.textContent = '❌ Map library failed to load';
        return;
    }

    initMap();
    setupSearch();
    setupEventListeners();

    setTimeout(function() {
        console.log('📡 Loading farmers on page load...');
        loadFarmers();
    }, 300);

    console.log('✅ App initialized successfully!');
});

// ============================================================
// Console Helpers
// ============================================================
console.log('🌾 Farmer Land Registry - Console Helpers:');
console.log('  - loadFarmers()      : Refresh the map and list');
console.log('  - renderFarmerList() : Render sidebar list');
console.log('  - renderTable()      : Render table view');
console.log('  - exportCSV()        : Export farmers to CSV');
console.log('  - allFarmersData     : All farmers data');
console.log('  - searchPlace()      : Search for a place by name');
console.log('  - setLocation(lat,lng,source) : Set location manually');