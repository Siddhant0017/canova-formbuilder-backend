const Form = require('../models/Form');
const Project = require('../models/Project');
const Response = require('../models/Response');

const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    // Get recent forms activity
    const recentForms = await Form.find({ creator: userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title status createdAt updatedAt publishedAt');

    // Get recent projects activity  
    const recentProjects = await Project.find({ creator: userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('name createdAt updatedAt');

    // Combine and format activities
    const activities = [];

    // Add form activities
    recentForms.forEach(form => {
      if (form.publishedAt) {
        activities.push({
          id: `form_published_${form._id}`,
          type: 'form_published',
          title: form.title,
          description: 'You published a form',
          timestamp: form.publishedAt,
          entityId: form._id,
          entityType: 'form'
        });
      }
      
      activities.push({
        id: `form_created_${form._id}`,
        type: form.createdAt.getTime() === form.updatedAt.getTime() ? 'form_created' : 'form_updated',
        title: form.title,
        description: form.createdAt.getTime() === form.updatedAt.getTime() ? 'You created a new form' : 'You updated a form',
        timestamp: form.createdAt.getTime() === form.updatedAt.getTime() ? form.createdAt : form.updatedAt,
        entityId: form._id,
        entityType: 'form'
      });
    });

    // Add project activities
    recentProjects.forEach(project => {
      activities.push({
        id: `project_${project.createdAt.getTime() === project.updatedAt.getTime() ? 'created' : 'updated'}_${project._id}`,
        type: project.createdAt.getTime() === project.updatedAt.getTime() ? 'project_created' : 'project_updated',
        title: project.name,
        description: project.createdAt.getTime() === project.updatedAt.getTime() ? 'You created a new project' : 'You updated a project',
        timestamp: project.createdAt.getTime() === project.updatedAt.getTime() ? project.createdAt : project.updatedAt,
        entityId: project._id,
        entityType: 'project'
      });
    });

    // Sort by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.status(200).json({
      success: true,
      activities: sortedActivities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getRecentActivity
};
