import React, { useState, useEffect } from 'react';
import './ConditionalLogicModal.css'; 

const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
const XIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);

const ConditionalLogicModal = ({ isOpen, onClose, onUpdate, pages, currentPageId, conditionalLogic }) => {
    const [conditions, setConditions] = useState(conditionalLogic?.conditions || []);
    const [passRedirect, setPassRedirect] = useState(conditionalLogic?.passRedirect || '');
    const [failRedirect, setFailRedirect] = useState(conditionalLogic?.failRedirect || '');

    if (!isOpen) return null;

    const currentQuestions = pages.find(p => p.id === currentPageId)?.questions || [];
    const availablePages = pages.filter(p => p.id !== currentPageId);

    const handleAddCondition = () => {
        setConditions(prev => [...prev, {
            id: `cond-${Date.now()}`,
            fieldId: currentQuestions[0]?.id || '',
            operator: 'equals',
            value: '',
        }]);
    };

    const handleUpdateCondition = (id, updates) => {
        setConditions(prev => prev.map(cond => cond.id === id ? { ...cond, ...updates } : cond));
    };

    const handleRemoveCondition = (id) => {
        setConditions(prev => prev.filter(cond => cond.id !== id));
    };

    const handleSave = () => {
        const finalLogic = {
            conditions,
            passRedirect,
            failRedirect
        };
        onUpdate(finalLogic);
    };

    return (
        <div className="modal-backdrop">
            <div className="conditional-modal-content">
                <div className="modal-header">
                    <h2 className="modal-title">Conditional Logic</h2>
                    <button className="modal-close-btn" onClick={onClose}><XIcon /></button>
                </div>
                <div className="modal-body">
                    {conditions.length === 0 ? (
                        <p className="empty-message">No conditions set for this page.</p>
                    ) : (
                        <div className="conditions-list">
                            {conditions.map(condition => (
                                <div key={condition.id} className="condition-item">
                                    <select value={condition.fieldId} onChange={e => handleUpdateCondition(condition.id, { fieldId: e.target.value })}>
                                        {currentQuestions.map(q => (
                                            <option key={q.id} value={q.id}>{q.title}</option>
                                        ))}
                                    </select>
                                    <select value={condition.operator} onChange={e => handleUpdateCondition(condition.id, { operator: e.target.value })}>
                                        <option value="equals">is equal to</option>
                                        <option value="not_equals">is not equal to</option>
                                    </select>
                                    <input type="text" value={condition.value} onChange={e => handleUpdateCondition(condition.id, { value: e.target.value })} />
                                    <button onClick={() => handleRemoveCondition(condition.id)}><TrashIcon /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="add-condition-btn" onClick={handleAddCondition}>
                        <PlusIcon /> Add Condition
                    </button>
                    
                    <div className="redirect-options">
                        <div className="redirect-select">
                            <span>If all conditions are met, go to:</span>
                            <select value={passRedirect} onChange={e => setPassRedirect(e.target.value)}>
                                <option value="">Next Page (Default)</option>
                                {availablePages.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="redirect-select">
                            <span>If any condition fails, go to:</span>
                            <select value={failRedirect} onChange={e => setFailRedirect(e.target.value)}>
                                <option value="">Next Page (Default)</option>
                                {availablePages.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={handleSave} className="save-btn">Save Logic</button>
                </div>
            </div>
        </div>
    );
};

export default ConditionalLogicModal;