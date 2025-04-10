import React from 'react';

const LintingCodeViewer = ({ fileContent, lintErrors }) => {
  const lines = fileContent.split('\n');

  // Map line number to error message for quick lookup
  const errorMap = lintErrors.reduce((acc, err) => {
    acc[err.line] = err.message;
    return acc;
  }, {});

  return (
    <div className="bg-gray-900 text-white rounded-lg overflow-auto text-sm font-mono h-full w-full shadow-lg border border-gray-700">
      <div className="min-w-full flex flex-col relative">
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const errorMessage = errorMap[lineNumber];

          return (
            <div
              key={index}
              className={`group relative flex items-start px-4 py-1 whitespace-pre ${
                errorMessage ? 'bg-red-800/30' : 'bg-gray-900'
              } border-b border-gray-800`}
            >


            {/* Tooltip near line number */}
              {errorMessage && (
                <div className="absolute right-0 ml-2 hidden group-hover:block z-20">
                  <div className="bg-red-700 text-white text-xs rounded px-2 py-1 shadow-lg max-w-xs whitespace-normal">
                    {errorMessage}
                  </div>
                </div>
              )}

              {/* Line number */}
              <span className="w-10 text-right pr-4 text-gray-500 select-none">
                {lineNumber}
              </span>

              {/* Code content */}
              <span className="flex-1 break-all">{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LintingCodeViewer;
