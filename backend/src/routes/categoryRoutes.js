const express = require('express');
const knex = require('knex')(require('../../knexfile').development);
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming admin for category management

const router = express.Router();

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
    const { name, description, theme_settings } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
    }
    try {
        const [newCategoryId] = await knex('categories').insert({ name, description, theme_settings }).returning('id');
        const newCategory = await knex('categories').where({ id: newCategoryId.id || newCategoryId }).first();
        res.status(201).json(newCategory);
    } catch (error) {
        console.error(error);
        if (error.routine === '_bt_check_unique') { // Check for unique constraint violation
             return res.status(400).json({ message: 'Category name already exists.' });
        }
        res.status(500).json({ message: 'Error creating category', error: error.message });
    }
});

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
router.get('/', async (req, res) => {
    try {
        const categories = await knex('categories').select('*');
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
});

// @desc    Get a single category by ID
// @route   GET /api/categories/:id
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const category = await knex('categories').where({ id: req.params.id }).first();
        if (category) {
            res.json(category);
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching category', error: error.message });
    }
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    const { name, description, theme_settings } = req.body;
    try {
        const updatedCount = await knex('categories').where({ id: req.params.id }).update({
            name,
            description,
            theme_settings,
            updated_at: knex.fn.now()
        });
        if (updatedCount > 0) {
            const updatedCategory = await knex('categories').where({ id: req.params.id }).first();
            res.json(updatedCategory);
        } else {
            res.status(404).json({ message: 'Category not found or no new data to update' });
        }
    } catch (error) {
        console.error(error);
        if (error.routine === '_bt_check_unique') {
             return res.status(400).json({ message: 'Category name already exists.' });
        }
        res.status(500).json({ message: 'Error updating category', error: error.message });
    }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        // Note: Consider what happens to topics in this category. Default is SET NULL.
        const deletedCount = await knex('categories').where({ id: req.params.id }).del();
        if (deletedCount > 0) {
            res.json({ message: 'Category deleted successfully' });
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting category', error: error.message });
    }
});

module.exports = router;
