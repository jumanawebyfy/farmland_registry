const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');

// ==================== GET ALL FARMERS ====================
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 100 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const farmers = await Farmer.find({})
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ registeredAt: -1 });

        const total = await Farmer.countDocuments();

        res.json({
            success: true,
            data: farmers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== NEARBY FARMERS ====================
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, km = 5 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const maxDistance = parseFloat(km);

        if (
            isNaN(latitude) ||
            isNaN(longitude) ||
            isNaN(maxDistance)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates or distance'
            });
        }

        const farmers = await Farmer.findNearby(
            latitude,
            longitude,
            maxDistance
        );

        res.json({
            success: true,
            data: farmers,
            count: farmers.length,
            location: {
                lat: latitude,
                lng: longitude
            },
            radius: maxDistance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== BOUNDING BOX SEARCH ====================
router.get('/bbox', async (req, res) => {
    try {
        const { minLng, minLat, maxLng, maxLat } = req.query;

        if (!minLng || !minLat || !maxLng || !maxLat) {
            return res.status(400).json({
                success: false,
                message: 'Bounding box coordinates are required'
            });
        }

        const farmers = await Farmer.find({
            'location.coordinates.0': {
                $gte: parseFloat(minLng),
                $lte: parseFloat(maxLng)
            },
            'location.coordinates.1': {
                $gte: parseFloat(minLat),
                $lte: parseFloat(maxLat)
            }
        });

        res.json({
            success: true,
            data: farmers,
            count: farmers.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== GET FARMER BY ID ====================
router.get('/:id', async (req, res) => {
    try {
        const farmer = await Farmer.findById(req.params.id);

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found'
            });
        }

        res.json({
            success: true,
            data: farmer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== CREATE FARMER ====================
router.post('/', async (req, res) => {
    try {
        const farmer = new Farmer(req.body);
        await farmer.save();

        res.status(201).json({
            success: true,
            data: farmer,
            message: 'Farmer registered successfully!'
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(
                e => e.message
            );

            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== UPDATE FARMER ====================
router.put('/:id', async (req, res) => {
    try {
        const { cropType, plotSize, name, phone } = req.body;

        const farmer = await Farmer.findById(req.params.id);

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found'
            });
        }

        if (cropType) farmer.cropType = cropType;
        if (plotSize) farmer.plotSize = plotSize;
        if (name) farmer.name = name;
        if (phone) farmer.phone = phone;

        farmer.updatedAt = new Date();

        await farmer.save();

        res.json({
            success: true,
            data: farmer,
            message: 'Farmer updated successfully!'
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(
                e => e.message
            );

            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== DELETE FARMER ====================
router.delete('/:id', async (req, res) => {
    try {
        const farmer = await Farmer.findByIdAndDelete(req.params.id);

        if (!farmer) {
            return res.status(404).json({
                success: false,
                message: 'Farmer not found'
            });
        }

        res.json({
            success: true,
            message: 'Farmer deleted successfully!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;