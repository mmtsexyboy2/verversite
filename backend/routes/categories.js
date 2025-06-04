const express = require('express');
const router = express.Router();
const knex = require('../db/knex'); // Knex instance
const { verifyToken, isAdmin } = require('../middleware/auth-middleware');

// POST /api/categories - Create a new category (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  const { name, description, theme_config } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'Category name is required and must be a non-empty string.' });
  }

  try {
    const [newCategory] = await knex('categories')
      .insert({
        name: name.trim(),
        description,
        theme_config: theme_config || null, // Ensure null if not provided
      })
      .returning('*'); // Return all columns of the newly created category

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.routine === '_bt_check_unique' || (error.constraint && error.constraint.includes('_unique'))) { // Check for unique constraint violation (PostgreSQL specific error.routine)
      return res.status(409).json({ message: `Category name "${name}" already exists.` });
    }
    res.status(500).json({ message: 'Error creating category.' });
  }
});

// GET /api/categories - Get all categories (Public)
router.get('/', async (req, res) => {
  try {
    const categories = await knex('categories').select('*').orderBy('name', 'asc');
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories.' });
  }
});

// GET /api/categories/:id - Get a specific category by ID (Public)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ message: 'Invalid category ID format.' });
  }

  try {
    const category = await knex('categories').where({ id: parseInt(id, 10) }).first();

    if (category) {
      res.status(200).json(category);
    } else {
      res.status(404).json({ message: 'Category not found.' });
    }
  } catch (error) {
    console.error('Error fetching category by ID:', error);
    res.status(500).json({ message: 'Error fetching category.' });
  }
});

// PUT /api/categories/:id - Update a category (Admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, theme_config } = req.body;

  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ message: 'Invalid category ID format.' });
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return res.status(400).json({ message: 'Category name must be a non-empty string if provided.' });
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description;
  if (theme_config !== undefined) updateData.theme_config = theme_config;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: 'No fields provided for update.' });
  }
  updateData.updated_at = knex.fn.now();


  try {
    const [updatedCategory] = await knex('categories')
      .where({ id: parseInt(id, 10) })
      .update(updateData)
      .returning('*');

    if (updatedCategory) {
      res.status(200).json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Category not found or no changes made.' });
    }
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.routine === '_bt_check_unique' || (error.constraint && error.constraint.includes('_unique'))) {
      return res.status(409).json({ message: `Category name "${name}" already exists.` });
    }
    res.status(500).json({ message: 'Error updating category.' });
  }
});

// DELETE /api/categories/:id - Delete a category (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ message: 'Invalid category ID format.' });
  }

  try {
    // Check if category exists before attempting to delete
    const categoryExists = await knex('categories').where({ id: parseInt(id, 10) }).first();
    if (!categoryExists) {
        return res.status(404).json({ message: 'Category not found.' });
    }

    // If category_id in topics table is set to ON DELETE SET NULL, this will work.
    // If it's ON DELETE RESTRICT, this will fail if topics are associated.
    // For now, we proceed with deletion. A more robust solution might involve checking for linked topics.
    const deletedCount = await knex('categories').where({ id: parseInt(id, 10) }).del();

    if (deletedCount > 0) {
      res.status(204).send(); // No content, successful deletion
    } else {
      // This case should be caught by the existence check above, but as a fallback:
      res.status(404).json({ message: 'Category not found (already deleted or never existed).' });
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    // Handle foreign key constraint errors if ON DELETE RESTRICT is used and topics are linked
    if (error.routine === 'ri_ReportViolation' && error.constraint && error.constraint.startsWith('topics_category_id_fkey')) {
        return res.status(409).json({ message: 'Cannot delete category: It is currently referenced by existing topics. Please reassign or delete those topics first.' });
    }
    res.status(500).json({ message: 'Error deleting category.' });
  }
});

module.exports = router;
