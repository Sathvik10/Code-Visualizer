// Modal.jsx
import React from 'react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0  bg-grey bg-opacity-50 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-auto max-h-[90vh] overflow-hidden">
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
            >
              ×
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <div className="h-120 w-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// In the ChartContainer component
export const ChartContainer = ({ title, children, onExpand, childrenHeight = "h-64" }) => {
  const cClass = "w-full overflow-hidden " + childrenHeight
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 flex-1">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button 
          onClick={onExpand}
          className="p-1 hover:bg-gray-100 rounded-full"
          title="Expand chart"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5" />
          </svg>
        </button>
      </div>
      {/* Change from h-[calc(100%-2rem)] to a fixed height */}
      <div className={cClass}> {/* Use h-64 or another appropriate fixed height */}
        {children}
      </div>
    </div>
  );
};


