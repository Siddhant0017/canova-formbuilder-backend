const Form = require('../models/Form');
const Project = require('../models/Project');
const Response = require('../models/Response');

// Existing function (if you have it)
const getViewsAnalytics = async (req, res) => {
    // Your existing views analytics logic
    try {
        // Implementation for views analytics
        res.json({
            success: true,
            totalViews: 0,
            growthPercentage: 0,
            chartData: [],
            formsViewData: []
        });
    } catch (error) {
        console.error('Error fetching views analytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// controllers/analyticsController.js
const getFormAnalytics = async (req, res) => {
    try {
        const { formId } = req.params;
        
        console.log('=== FORM ANALYTICS DEBUG ===');
        console.log('Requested Form ID:', formId);
        
        // Get form with details
        const form = await Form.findById(formId).populate('creator', 'name email');
        if (!form) {
            console.log('❌ Form not found');
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        console.log('✅ Form found:', form.title);
        console.log('📝 Form questions count:', form.questions?.length);
        
        // Debug form questions structure
        if (form.questions && form.questions.length > 0) {
            console.log('📋 Form questions:');
            form.questions.forEach((question, index) => {
                console.log(`  ${index + 1}. ID: ${question.id}, Type: ${question.type}, Title: "${question.title}"`);
                if (question.options && question.options.length > 0) {
                    console.log(`     Options: ${question.options.map(opt => `${opt.id}:"${opt.text}"`).join(', ')}`);
                }
            });
        } else {
            console.log('⚠️ No questions found in form');
        }

        // Get all responses for this form
        const responses = await Response.find({ form: formId });
        console.log('📊 Responses found:', responses.length);
        
        if (responses.length > 0) {
            console.log('💭 Sample response structure:');
            responses.forEach((response, index) => {
                console.log(`  Response ${index + 1}:`);
                response.answers.forEach(answer => {
                    console.log(`    Question ID: ${answer.questionId}, Answer: ${JSON.stringify(answer.answer)}`);
                });
            });
        }
        
        // Process question analytics
        const questionAnalytics = [];
        
        // Check if we have chartable questions
        const chartableQuestions = form.questions.filter(q => 
            ['multiple-choice', 'dropdown', 'checkbox'].includes(q.type)
        );
        console.log('📈 Chartable questions:', chartableQuestions.length);
        
        // Process each chartable question
        chartableQuestions.forEach(question => {
            console.log(`\n🔍 Processing question: ${question.id} (${question.type})`);
            
            // Extract responses for this specific question
            const questionResponses = responses
                .map(r => r.answers.find(ans => ans.questionId === question.id))
                .filter(Boolean);

            console.log(`   Found ${questionResponses.length} responses for this question`);

            const analytics = {
                questionId: question.id,
                questionTitle: question.title,
                questionType: question.type,
                totalResponses: questionResponses.length,
                options: []
            };

            // Process options for charts
            if (question.options && question.options.length > 0) {
                console.log(`   Processing ${question.options.length} options:`);
                
                question.options.forEach(option => {
                    const optionCount = questionResponses.filter(resp => {
                        if (question.type === 'checkbox') {
                            // For checkbox, answer is an array
                            const isSelected = Array.isArray(resp.answer) && resp.answer.includes(option.id);
                            console.log(`     Option ${option.id}: checkbox check = ${isSelected}`);
                            return isSelected;
                        } else {
                            // For multiple-choice and dropdown, answer is a string
                            const isSelected = resp.answer === option.id;
                            console.log(`     Option ${option.id}: single choice check = ${isSelected} (answer: ${resp.answer})`);
                            return isSelected;
                        }
                    }).length;

                    const percentage = questionResponses.length > 0 
                        ? Math.round((optionCount / questionResponses.length) * 100) 
                        : 0;

                    console.log(`     Option "${option.text}" (${option.id}): ${optionCount} selections (${percentage}%)`);

                    analytics.options.push({
                        id: option.id,
                        text: option.text,
                        count: optionCount,
                        percentage
                    });
                });
            } else {
                console.log('   ⚠️ No options found for this question');
            }

            if (questionResponses.length > 0 || analytics.options.length > 0) {
                questionAnalytics.push(analytics);
                console.log(`   ✅ Added question to analytics`);
            } else {
                console.log(`   ⚠️ Skipped question (no responses or options)`);
            }
        });

        console.log(`\n📈 Final analytics: ${questionAnalytics.length} questions processed`);
        console.log('=== END DEBUG ===\n');

        res.json({
            success: true,
            form: {
                _id: form._id,
                title: form.title,
                viewCount: form.viewCount || 0,
                totalResponses: responses.length
            },
            questionAnalytics,
            responses: responses.length
        });

    } catch (error) {
        console.error('❌ Error fetching form analytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};



const getProjectAnalytics = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { period = 'this_year' } = req.query;
        
        // Get project details
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Check if user has access to this project
        const userId = req.user.id;
        if (project.creator.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        // Get all forms in this project
        const forms = await Form.find({ project: projectId }).populate('creator', 'name email');
        
        // Calculate total views across all forms in project
        const totalViews = forms.reduce((sum, form) => sum + (form.viewCount || 0), 0);
        const averageViews = forms.length > 0 ? Math.round(totalViews / forms.length) : 0;
        
        // Calculate growth (simple random for now - you can implement proper logic)
        const viewsGrowth = Math.floor(Math.random() * 40) - 20; // Random between -20% and +20%
        
        res.json({
            success: true,
            project,
            analytics: {
                totalViews,
                averageViews,
                viewsGrowth,
                chartData: [] // Add your chart data here if needed
            },
            forms
        });
    } catch (error) {
        console.error('Error fetching project analytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
  

module.exports = {
    getViewsAnalytics,
    getFormAnalytics,
    getProjectAnalytics
};
