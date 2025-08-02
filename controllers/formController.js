// controllers/formController.js
const Form = require('../models/Form');
const Project = require('../models/Project');
const User = require('../models/User');
const Response = require('../models/Response');

const createForm = async (req, res) => {
    try {
        const {
            title,
            description,
            questions,
            design,
            pages,
            conditionalLogic,
            defaultRedirect,
            status,
            project // FIXED: Changed from projectId to project
        } = req.body;

        console.log('Creating form with project:', project); // Debug log

        // Ensure 'pages' array always has at least one default page if not provided or empty
        const defaultPages = (pages && Array.isArray(pages) && pages.length > 0) ? pages : [
            {
                id: 'page-1',
                name: "Page 01",
                layout: [{ id: 'default-section', type: 'section-break', color: '#DDDDDD' }],
                active: true,
                conditionalLogic: { conditions: [], passRedirect: null, failRedirect: null }
            }
        ];

        // Ensure other complex fields have sensible defaults
        const defaultQuestions = questions && Array.isArray(questions) ? questions : [];
        const defaultDesign = design || { backgroundColor: "#b6b6b6", sectionColor: "#b6b6b6", theme: "light" };
        const defaultConditionalLogic = conditionalLogic || { conditions: [], passRedirect: null, failRedirect: null };
        const defaultStatus = status || "draft";
        const defaultDescription = description || "";
        const defaultDefaultRedirect = defaultRedirect || "";

        const form = await Form.create({
            title,
            description: defaultDescription,
            questions: defaultQuestions,
            design: defaultDesign,
            pages: defaultPages,
            conditionalLogic: defaultConditionalLogic,
            defaultRedirect: defaultDefaultRedirect,
            status: defaultStatus,
            creator: req.user.id,
            project: project || null // FIXED: Use project || null
        });

        // IMPORTANT: Add form to project's forms array if project is specified
        if (project) {
            try {
                await Project.findByIdAndUpdate(
                    project,
                    { $push: { forms: form._id } }
                );
                console.log(`Form ${form._id} added to project ${project}`);
            } catch (error) {
                console.error('Error updating project forms array:', error);
            }
        }

        await form.populate('creator', 'name email');
        res.status(201).json({
            success: true,
            message: 'Form created successfully',
            form
        });
    } catch (error) {
        console.error('Error creating form:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred during form creation.'
        });
    }
};

const saveFormDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log('Saving draft with project:', updates.project); // Debug log
        
        if (updates.conditionalLogic) {
            const { validateConditionalLogic } = require('../utils/conditionalLogic');
            const errors = validateConditionalLogic(updates.conditionalLogic, updates.questions || []);
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Conditional logic validation failed',
                    errors
                });
            }
        }

        // Get current form to check project changes
        const currentForm = await Form.findById(id);
        if (!currentForm) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        const form = await Form.findOneAndUpdate(
            { _id: id, creator: req.user.id },
            { ...updates, status: 'draft' },
            { new: true }
        ).populate('creator', 'name email');

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found or access denied'
            });
        }

        // IMPORTANT: Handle project association changes
        const oldProject = currentForm.project?.toString();
        const newProject = updates.project;

        if (oldProject !== newProject) {
            try {
                // Remove from old project if it existed
                if (oldProject) {
                    await Project.findByIdAndUpdate(
                        oldProject,
                        { $pull: { forms: form._id } }
                    );
                    console.log(`Form ${form._id} removed from project ${oldProject}`);
                }
                
                // Add to new project if specified
                if (newProject) {
                    await Project.findByIdAndUpdate(
                        newProject,
                        { $push: { forms: form._id } }
                    );
                    console.log(`Form ${form._id} added to project ${newProject}`);
                }
            } catch (error) {
                console.error('Error updating project forms array during draft save:', error);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Form saved successfully',
            form
        });
    } catch (error) {
        console.error('Error saving form draft:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred during draft save.'
        });
    }
};

const publishForm = async (req, res) => {
    try {
        const { id } = req.params;
        const { visibility, accessControl, project } = req.body;

        console.log('Publishing form with project:', project); // Debug log

        // NEW: User validation for restricted visibility
        if (visibility === 'restricted' && accessControl && accessControl.length > 0) {
            const invalidEmails = [];
            const validatedAccessControl = [];

            for (const access of accessControl) {
                // Check if user exists in database
                const existingUser = await User.findOne({ email: access.email });
                
                if (!existingUser) {
                    invalidEmails.push(access.email);
                } else {
                    // Add validated user data to access control
                    validatedAccessControl.push({
                        email: access.email,
                        userId: existingUser._id,
                        level: access.level,
                        grantedBy: req.user.id,
                        grantedAt: new Date()
                    });
                }
            }

            // If any email is not registered, return error
            if (invalidEmails.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Some users are not registered in our application",
                    unregisteredEmails: invalidEmails
                });
            }

            // Update form with validated access control
            const form = await Form.findOneAndUpdate(
                { _id: id, creator: req.user.id },
                {
                    status: 'published',
                    publishedAt: new Date(),
                    visibility,
                    accessControl: validatedAccessControl,
                    project: project || null // FIXED: Use project || null
                },
                { new: true, runValidators: true }
            ).populate('creator', 'name email').populate('project', 'name color');

            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: 'Form not found or access denied'
                });
            }

            // IMPORTANT: Ensure form is in project's forms array
            if (project) {
                try {
                    const projectDoc = await Project.findById(project);
                    if (projectDoc && !projectDoc.forms.includes(form._id)) {
                        await Project.findByIdAndUpdate(
                            project,
                            { $push: { forms: form._id } }
                        );
                        console.log(`Form ${form._id} added to project ${project} during publish`);
                    }
                } catch (error) {
                    console.error('Error updating project during publish:', error);
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Form published successfully',
                form
            });
        } else {
            // Handle public forms or forms without access control
            const form = await Form.findOneAndUpdate(
                { _id: id, creator: req.user.id },
                {
                    status: 'published',
                    publishedAt: new Date(),
                    visibility,
                    accessControl: [], // Empty for public forms
                    project: project || null // FIXED: Use project || null
                },
                { new: true, runValidators: true }
            ).populate('creator', 'name email').populate('project', 'name color');

            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: 'Form not found or access denied'
                });
            }

            // IMPORTANT: Ensure form is in project's forms array
            if (project) {
                try {
                    const projectDoc = await Project.findById(project);
                    if (projectDoc && !projectDoc.forms.includes(form._id)) {
                        await Project.findByIdAndUpdate(
                            project,
                            { $push: { forms: form._id } }
                        );
                        console.log(`Form ${form._id} added to project ${project} during publish`);
                    }
                } catch (error) {
                    console.error('Error updating project during publish:', error);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Form published successfully',
                form
            });
        }
    } catch (error) {
        console.error('Error publishing form:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred during publish.'
        });
    }
};

// Keep all your other functions as they are...
const getUserForms = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;
        let query = { creator: req.user.id };
        if (status) query.status = status;
        const forms = await Form.find(query)
            .populate('creator', 'name email')
            .populate('project', 'name color')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        const total = await Form.countDocuments(query);
        res.status(200).json({
            success: true,
            forms,
            pagination: {
                current: parseInt(page),
                total: Math.ceil(total / limit),
                count: forms.length
            }
        });
    } catch (error) {
        console.error('Error getting user forms:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred while fetching user forms.'
        });
    }
};

const getSharedForms = async (req, res) => {
    try {
        const forms = await Form.find({
            'accessControl.userId': req.user.id
        })
            .populate('creator', 'name email')
            .populate('project', 'name color')
            .sort({ updatedAt: -1 });
        res.status(200).json({
            success: true,
            forms
        });
    } catch (error) {
        console.error('Error getting shared forms:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred while fetching shared forms.'
        });
    }
};

const getSharedWorks = async (req, res) => {
    try {
        const userId = req.user.id;

        const formsSharedByUser = await Form.find({
            creator: userId,
            visibility: 'restricted',
            'accessControl.0': { $exists: true }
        })
            .populate('creator', 'name email')
            .populate('project', 'name color')
            .populate('accessControl.userId', 'name email')
            .sort({ updatedAt: -1 });

        const formsSharedWithUser = await Form.find({
            'accessControl.userId': userId
        })
            .populate('creator', 'name email')
            .populate('project', 'name color')
            .sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            sharedByMe: formsSharedByUser,
            sharedWithMe: formsSharedWithUser
        });

    } catch (error) {
        console.error('Error fetching shared works:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch shared works",
            error: error.message
        });
    }
};

const getFormById = async (req, res) => {
    try {
        const { id } = req.params;
        const form = await Form.findById(id)
            .populate('creator', 'name email')
            .populate('project', 'name color');

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        const userId = req.user?.id;
        let hasAccess = false;
        let userPermission = 'view';

        if (form.visibility === 'public') {
            hasAccess = true;
            userPermission = 'anonymous';
        } else if (form.visibility === 'restricted') {
            if (userId && form.creator._id.toString() === userId) {
                hasAccess = true;
                userPermission = 'owner';
            } 
            else if (userId) {
                const userAccess = form.accessControl.find(
                    access => access.userId && access.userId.toString() === userId
                );
                if (userAccess) {
                    hasAccess = true;
                    userPermission = userAccess.level;
                }
            } 
            else {
                hasAccess = true;
                userPermission = 'anonymous';
            }
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.status(200).json({
            success: true,
            form,
            userPermission
        });
    } catch (error) {
        console.error('Error getting form by ID:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred while fetching form by ID.'
        });
    }
};

const deleteForm = async (req, res) => {
    try {
        const { id } = req.params;
        const form = await Form.findOneAndDelete({
            _id: id,
            creator: req.user.id
        });
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found or access denied'
            });
        }
        if (form.project) {
            await Project.findByIdAndUpdate(
                form.project,
                { $pull: { forms: form._id } }
            );
        }
        res.status(200).json({
            success: true,
            message: 'Form deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred during form deletion.'
        });
    }
};

const duplicateForm = async (req, res) => {
    try {
        const { id } = req.params;
        const originalForm = await Form.findOne({
            _id: id,
            creator: req.user.id
        });
        if (!originalForm) {
            return res.status(404).json({
                success: false,
                message: 'Form not found or access denied'
            });
        }
        const duplicatedForm = await Form.create({
            title: `${originalForm.title} (Copy)`,
            description: originalForm.description,
            creator: req.user.id,
            questions: originalForm.questions,
            design: originalForm.design,
            conditionalLogic: originalForm.conditionalLogic,
            status: 'draft',
            project: originalForm.project || null // FIXED: Use || null
        });
        
        // Add to project if project exists
        if (duplicatedForm.project) {
            await Project.findByIdAndUpdate(
                duplicatedForm.project,
                { $push: { forms: duplicatedForm._id } }
            );
        }
        
        await duplicatedForm.populate('creator', 'name email');
        res.status(201).json({
            success: true,
            message: 'Form duplicated successfully',
            form: duplicatedForm
        });
    } catch (error) {
        console.error('Error duplicating form:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred during form duplication.'
        });
    }
};

const submitFormResponse = async (req, res) => {
    try {
        const { id } = req.params;
        const { answers } = req.body;
        
        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found.' });
        }
        if (form.status !== 'published') {
            return res.status(403).json({ success: false, message: 'Form is not published.' });
        }

        const newResponse = await Response.create({
            form: id,
            respondent: req.user ? req.user.id : null,
            answers
        });

        res.status(201).json({
            success: true,
            message: 'Form submitted successfully!',
            response: newResponse
        });

    } catch (error) {
        console.error('Error submitting form response:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred during form submission.'
        });
    }
};

const trackFormView = async (req, res, next) => {
    try {
        const formId = req.params.id;
        const userId = req.user?.id || null;
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.get('User-Agent') || 'Unknown';

        console.log(`Tracking view for form: ${formId}`);

        await Form.findByIdAndUpdate(formId, {
            $inc: { viewCount: 1 },
            $push: {
                viewHistory: {
                    timestamp: new Date(),
                    userId,
                    ipAddress,
                    userAgent
                }
            },
            $set: { lastViewed: new Date() }
        });

        console.log(`Form ${formId} view tracked successfully`);
        next();
    } catch (error) {
        console.error('Error tracking form view:', error);
        next();
    }
};
const getFormShareLink = async (req, res) => {
    try {
      const form = await Form.findById(req.params.id);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
  
      // Check if user owns the form or has share permission
      if (form.creator.toString() !== req.user.id && 
          !form.accessControl?.some(ac => ac.userId.toString() === req.user.id && 
          ['edit', 'share'].includes(ac.level))) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to share this form'
        });
      }
  
      // Generate share URL (public form link)
      const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/form/${form._id}`;
      
      res.status(200).json({
        success: true,
        url: shareUrl,
        formId: form._id,
        title: form.title
      });
  
    } catch (error) {
      console.error('Get form share link error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate share link'
      });
    }
  };
  
  // 🆕 ADD THIS FUNCTION - Update form (for rename functionality)
  const updateForm = async (req, res) => {
    try {
      const form = await Form.findById(req.params.id);
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }
  
      // Check if user owns the form or has edit permission
      if (form.creator.toString() !== req.user.id && 
          !form.accessControl?.some(ac => ac.userId.toString() === req.user.id && ac.level === 'edit')) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this form'
        });
      }
  
      // Handle project association changes if project is being updated
      const oldProject = form.project?.toString();
      const newProject = req.body.project;
  
      // Update form with new data
      const updatedForm = await Form.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('creator', 'name email').populate('project', 'name color');
  
      // Update project associations if project changed
      if (oldProject !== newProject) {
        try {
          // Remove from old project if it existed
          if (oldProject) {
            await Project.findByIdAndUpdate(
              oldProject,
              { $pull: { forms: updatedForm._id } }
            );
          }
          
          // Add to new project if specified
          if (newProject) {
            await Project.findByIdAndUpdate(
              newProject,
              { $push: { forms: updatedForm._id } }
            );
          }
        } catch (error) {
          console.error('Error updating project associations:', error);
        }
      }
  
      res.status(200).json({
        success: true,
        message: 'Form updated successfully',
        form: updatedForm
      });
  
    } catch (error) {
      console.error('Update form error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update form'
      });
    }
  };

module.exports = {
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
};
