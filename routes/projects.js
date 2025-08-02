const express = require('express');
const {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectForms,
  getProjectShareLink,
  duplicateProject
} = require('../controllers/projectController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, createProject);
router.get('/', auth, getUserProjects);
router.get('/:id', auth, getProjectById);
router.put('/:id', auth, updateProject);
router.delete('/:id', auth, deleteProject);

// 🆕 ADD THESE TWO NEW ROUTES FOR WORKMENU
router.get('/:id/share-link', auth, getProjectShareLink); // For share functionality
router.post('/:id/duplicate', auth, duplicateProject);    // For copy functionality

router.get('/:projectId/forms', auth, getProjectForms);

module.exports = router;
