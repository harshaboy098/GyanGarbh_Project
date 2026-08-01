const express = require('express');
const mongoose = require('mongoose');
const Temple = require('../models/Temple');

const router = express.Router();

const toArray = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const toBoolean = (value) => value === true || value === 'true' || value === 'on' || value === 1 || value === '1';

router.get('/all', async (req, res) => {
    try {
        const temples = await Temple.find().sort({ isFeatured: -1, createdAt: -1 });
        res.json({ success: true, temples });
    } catch (err) {
        console.error('Error fetching temples:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/featured', async (req, res) => {
    try {
        const temples = await Temple.find({ isFeatured: true }).sort({ createdAt: -1 });
        res.json({ success: true, temples });
    } catch (err) {
        console.error('Error fetching featured temples:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Valid temple ID is required' });
        }

        const temple = await Temple.findById(req.params.id);
        if (!temple) {
            return res.status(404).json({ success: false, message: 'Temple not found' });
        }

        const relatedTemples = await Temple.find({ _id: { $ne: temple._id } })
            .sort({ isFeatured: -1, createdAt: -1 })
            .limit(3);

        res.json({ success: true, temple, relatedTemples });
    } catch (err) {
        console.error('Error fetching temple:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/add', async (req, res) => {
    try {
        const temple = new Temple({
            name: req.body.name,
            subtitle: req.body.subtitle,
            location: req.body.location,
            timings: req.body.timings,
            entryFee: req.body.entryFee,
            mainImage: req.body.mainImage,
            galleryImages: toArray(req.body.galleryImages),
            description: req.body.description,
            history: req.body.history,
            rulesAndGuidelines: toArray(req.body.rulesAndGuidelines),
            isFeatured: toBoolean(req.body.isFeatured)
        });

        await temple.save();
        res.status(201).json({ success: true, message: 'Temple added successfully', temple });
    } catch (err) {
        console.error('Error adding temple:', err);
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
