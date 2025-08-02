const Project = require('../models/Project');
const Form = require('../models/Form');

const createProject = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    const project = await Project.create({
      name,
      description,
      color: color || '#007bff',
      creator: req.user.id
    });

    await project.populate('creator', 'name email');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getUserProjects = async (req, res) => {
  try {
    const { archived = false } = req.query;

    const projects = await Project.find({
      $or: [
        { creator: req.user.id },
        { 'collaborators.userId': req.user.id }
      ],
      isArchived: archived === 'true'
    })
      .populate('creator', 'name email')
      .populate('forms', 'title status createdAt')
      .populate('collaborators.userId', 'name email')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate('creator', 'name email')
      .populate('forms')
      .populate('collaborators.userId', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access permissions
    const isCreator = project.creator._id.toString() === req.user.id;
    const isCollaborator = project.collaborators.some(
      collab => collab.userId._id.toString() === req.user.id
    );

    if (!isCreator && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const project = await Project.findOneAndUpdate(
      { _id: id, creator: req.user.id },
      updates,
      { new: true }
    )
      .populate('creator', 'name email')
      .populate('forms', 'title status')
      .populate('collaborators.userId', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findOneAndDelete({
      _id: id,
      creator: req.user.id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found or access denied'
      });
    }

    // Update all forms in this project to remove project reference
    await Form.updateMany(
      { project: id },
      { $unset: { project: 1 } }
    );

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
const getProjectForms = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    // Check if user is creator or collaborator
    const userId = req.user.id;
    const isCreator = project.creator.toString() === userId;
    const isCollaborator = project.collaborators.some(c => 
      c.userId && c.userId.toString() === userId
    );
    
    if (!isCreator && !isCollaborator) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Get forms associated with this project
    const forms = await Form.find({ project: projectId })
                            .populate('creator', 'name email')
                            .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      forms,
      project: {
        _id: project._id,
        name: project.name,
        color: project.color
      }
    });
    
  } catch (error) {
    console.error('Error fetching project forms:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const getProjectShareLink = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user owns the project or is a collaborator
    const isCreator = project.creator.toString() === req.user.id;
    const isCollaborator = project.collaborators.some(
      collab => collab.userId && collab.userId.toString() === req.user.id
    );

    if (!isCreator && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to share this project'
      });
    }

    // Generate share URL
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/project/${project._id}`;
    
    res.status(200).json({
      success: true,
      url: shareUrl,
      projectId: project._id,
      name: project.name
    });

  } catch (error) {
    console.error('Get project share link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate share link'
    });
  }
};

// 🆕 ADD THIS FUNCTION - Duplicate/Copy project
const duplicateProject = async (req, res) => {
  try {
    const originalProject = await Project.findById(req.params.id);
    
    if (!originalProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user owns the project (only creators can duplicate)
    if (originalProject.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to copy this project'
      });
    }

    // Create duplicate project
    const duplicateData = {
      name: `${originalProject.name} (Copy)`,
      description: originalProject.description,
      color: originalProject.color,
      creator: req.user.id,
      isArchived: false,
      collaborators: [] // Don't copy collaborators
    };

    const duplicatedProject = await Project.create(duplicateData);
    await duplicatedProject.populate('creator', 'name email');

    // Also duplicate all forms in the project
    const projectForms = await Form.find({ project: originalProject._id });
    const duplicatedForms = [];

    for (const form of projectForms) {
      const duplicateFormData = {
        title: `${form.title} (Copy)`,
        description: form.description,
        questions: form.questions,
        design: form.design,
        pages: form.pages,
        conditionalLogic: form.conditionalLogic,
        defaultRedirect: form.defaultRedirect,
        creator: req.user.id,
        project: duplicatedProject._id,
        status: 'draft',
        visibility: 'public', // Reset to public
        accessControl: [] // Reset access control
      };

      const duplicatedForm = await Form.create(duplicateFormData);
      duplicatedForms.push(duplicatedForm._id);
    }

    // Update project with forms array
    duplicatedProject.forms = duplicatedForms;
    await duplicatedProject.save();

    res.status(201).json({
      success: true,
      message: 'Project duplicated successfully',
      project: duplicatedProject,
      formsCount: duplicatedForms.length,
      name: duplicatedProject.name
    });

  } catch (error) {
    console.error('Duplicate project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate project'
    });
  }
};
module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectForms,
  getProjectShareLink,
  duplicateProject
};
