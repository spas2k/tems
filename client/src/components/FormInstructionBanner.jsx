import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { getFormInstructionByFormId } from '../api';
import { useAuth } from '../context/AuthContext';

export default function FormInstructionBanner({ formId }) {
  const { user } = useAuth();
  const [instruction, setInstruction] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  const showInstructionsPref = user?.preferences?.show_form_instructions !== false;

  useEffect(() => {
    let mounted = true;
    if (formId && showInstructionsPref) {
      getFormInstructionByFormId(formId)
        .then(res => {
          if (mounted && res.data && res.data.instruction) {
            setInstruction(res.data.instruction);
            setIsVisible(true);
          }
        })
        .catch(err => console.error('Failed to load instruction for form', formId, err));
    }
    return () => { mounted = false; };
  }, [formId, showInstructionsPref]);

  if (!showInstructionsPref || !instruction || !isVisible) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#f0f9ff',
      border: '1px solid #bae6fd',
      borderRadius: '6px',
      padding: '8px 12px',
      marginBottom: '16px',
      gap: '8px'
    }}>
      <Info size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
      <div style={{
        flex: 1,
        fontSize: '13px',
        color: '#1e3a8a',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap'
      }}>
        {instruction}
      </div>
      <button
        onClick={() => setIsVisible(false)}
        title="Dismiss instruction"
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
