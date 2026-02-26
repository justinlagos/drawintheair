import React, { useState } from 'react';
import './landing.css';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  allowMultiple?: boolean;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ items, allowMultiple = false }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  const handleToggle = (index: number) => {
    if (allowMultiple) {
      const newIndices = new Set(openIndices);
      if (newIndices.has(index)) {
        newIndices.delete(index);
      } else {
        newIndices.add(index);
      }
      setOpenIndices(newIndices);
    } else {
      setOpenIndex(openIndex === index ? null : index);
    }
  };

  const isOpen = (index: number) => {
    return allowMultiple ? openIndices.has(index) : openIndex === index;
  };

  return (
    <div className="landing-faq-accordion">
      {items.map((item, index) => {
        const open = isOpen(index);
        return (
          <div 
            key={index} 
            className={`landing-faq-accordion-item ${open ? 'open' : ''}`}
          >
            <button
              className="landing-faq-accordion-question"
              onClick={() => handleToggle(index)}
              aria-expanded={open}
            >
              <span className="landing-faq-accordion-question-text">{item.question}</span>
              <svg 
                className="landing-faq-accordion-icon"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path 
                  d={open ? "M18 6L6 18M6 6l12 12" : "M6 9l6 6 6-6"} 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div 
              className="landing-faq-accordion-answer"
              style={{
                maxHeight: open ? '1000px' : '0',
                opacity: open ? 1 : 0,
              }}
            >
              <div className="landing-faq-accordion-answer-content">
                {item.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

