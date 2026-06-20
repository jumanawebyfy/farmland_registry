# 🌾 Farmer Land Registry

A full-stack web application for registering and managing farmers with their land plots on an interactive map. Built with Node.js, Express, MongoDB, and Leaflet.js.

The link to the website:
https://github.com/jumanawebyfy/farmland_registry.git

## ✨ Features

### 🔐 Core Features
- **Register Farmers** - Add farmers with name, crop type, plot size, and location
- **Interactive Map** - View all registered farmers as markers on a Leaflet map
- **Location Input** - Three ways to set location:
  - 📍 **GPS** - Get current location using browser Geolocation API
  - 🔍 **Place Search** - Search for any place name using OSM Nominatim
  - 📌 **Manual Coordinates** - Enter latitude and longitude manually

### 📊 Management Features
- **Sidebar List** - View all farmers with quick actions (Focus, Edit, Delete)
- **Search** - Filter farmers by name, crop type, or location
- **Table View** - See all farmer data in a structured table format
- **Export CSV** - Download farmer data as CSV file
- **Find Nearby** - Search for farmers within a specified radius from map center
- **Edit/Delete** - Update crop types or remove farmers

### 🗺️ Map Features
- **OSM Base Tiles** - Free and open map tiles
- **Interactive Markers** - Click markers to see farmer details
- **Popup Actions** - Focus, Edit, Delete directly from popup
- **Search Radius** - Visual circle overlay for nearby searches
- **Viewport Optimization** - Only loads farmers visible in current view

### ⏱️ Additional Features
- **Keyboard Shortcuts** - Ctrl+R to refresh, Escape to clear location
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - No page reloads needed

## 🛠️ Technologies Used

| Technology | Purpose |
|------------|---------|
| **Node.js** | Backend runtime environment |
| **Express.js** | REST API framework |
| **MongoDB** | NoSQL database with geospatial support |
| **Mongoose** | ODM for MongoDB schema modeling |
| **Leaflet.js** | Interactive map library |
| **OpenStreetMap** | Free map tiles |
| **OSM Nominatim** | Geocoding (place name → coordinates) |
| **HTML5, CSS3** | Frontend structure and styling |
| **Vanilla JavaScript** | All frontend logic |
| **GeoJSON** | Geospatial data format |

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (v4.0 or higher) installed locally
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for map tiles and geocoding)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/farmer-registry.git
cd farmer-registry
