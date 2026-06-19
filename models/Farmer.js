const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Farmer name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters']
    },
    phone: {
        type: String,
        trim: true,
        match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    cropType: {
        type: String,
        required: [true, 'Crop type is required'],
        trim: true
    },
    plotSize: {
        type: Number,
        min: [0.1, 'Plot size must be at least 0.1 acres'],
        max: [1000, 'Plot size cannot exceed 1000 acres']
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude] - GeoJSON order!
            required: [true, 'Location coordinates are required'],
            validate: {
                validator: function(coords) {
                    return coords.length === 2 &&
                           coords[0] >= -180 && coords[0] <= 180 &&
                           coords[1] >= -90 && coords[1] <= 90;
                },
                message: 'Invalid coordinates. Longitude must be -180 to 180, Latitude -90 to 90'
            }
        }
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Create 2dsphere geospatial index for location-based queries
farmerSchema.index({ location: '2dsphere' });

// Virtual property to get coordinates in Leaflet format [lat, lng]
farmerSchema.virtual('leafletCoordinates').get(function() {
    if (this.location && this.location.coordinates) {
        const [lng, lat] = this.location.coordinates;
        return [lat, lng];
    }
    return null;
});

// Method to update crop type
farmerSchema.methods.updateCrop = function(newCrop) {
    this.cropType = newCrop;
    this.updatedAt = new Date();
    return this.save();
};

// Static method to find farmers near a location
farmerSchema.statics.findNearby = function(lat, lng, maxDistanceKm = 5) {
    return this.find({
        location: {
            $nearSphere: {
                $geometry: {
                    type: 'Point',
                    coordinates: [lng, lat] // GeoJSON order!
                },
                $maxDistance: maxDistanceKm * 1000 // Convert km to meters
            }
        }
    });
};

module.exports = mongoose.model('Farmer', farmerSchema);