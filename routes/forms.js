
const express = require('express');
const {
  createForm,
  saveFormDraft,
  publishForm,
  getUserForms,
  getSharedForms,
  getSharedWorks,
  getFormById,
  deleteForm,
  duplicateForm,
  submitFormResponse,
  trackFormView,
  getFormShareLink,
  updateForm
} = require('../controllers/formController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, createForm);
router.put('/:id/draft', auth, saveFormDraft);
router.put('/:id/publish', auth, publishForm);

router.put('/:id', auth, updateForm);
router.get('/:id/share-link', auth, getFormShareLink);

router.get('/my-forms', auth, getUserForms);
router.get('/shared', auth, getSharedForms);
router.get('/shared-works', auth, getSharedWorks); 

router.get('/:id', trackFormView, getFormById);
router.post('/:id/submit', trackFormView, submitFormResponse);

router.delete('/:id', auth, deleteForm);
router.post('/:id/duplicate', auth, duplicateForm);

module.exports = router;
