import React, { useRef, useEffect, useState } from 'react';

const LintingCodeViewer = ({
  fileContent,
  lintErrors,
  focusLine = -1,
  lintingEnabled = false
}) => {
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const [highlightedLine, setHighlightedLine] = useState(-1);

  const lines = fileContent.split('\n');

  // Map line number → error message
  const errorMap = lintErrors.reduce((acc, err) => {
    acc[err.line] = err.message;
    return acc;
  }, {});

  useEffect(() => {
    if (focusLine > 0 && containerRef.current) {
      // 1) scroll into view
      const el = containerRef.current.querySelector(
        `[data-line="${focusLine}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // 2) trigger 2s highlight
      setHighlightedLine(focusLine);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setHighlightedLine(-1);
        timeoutRef.current = null;
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [focusLine]);

  return (
    <div
      ref={containerRef}
      className="bg-gray-900 text-white rounded-lg overflow-auto text-[10px] font-mono h-full w-full shadow-lg border border-gray-700"
    >
      <div className="min-w-full flex flex-col relative">
        {lines.map((line, idx) => {
          const lineNumber = idx + 1;
          const errorMessage = errorMap[lineNumber];
          const isHighlighted = lineNumber === highlightedLine;

          return (
            <div
              key={idx}
              data-line={lineNumber}
              className={`group relative flex items-start px-3 py-0.5 whitespace-pre border-b border-gray-800 ${
                isHighlighted
                  ? 'bg-yellow-600/50 animate-pulse'
                  : lintingEnabled && errorMessage
                  ? 'bg-red-800/30'
                  : 'bg-gray-900'
              }`}
            >
              {/* Tooltip near line number */}
              {lintingEnabled && errorMessage && (
                <div className="absolute right-0 ml-2 hidden group-hover:block z-20">
                  <div className="bg-red-700 text-white text-[10px] rounded px-2 py-1 shadow-lg max-w-xs whitespace-normal">
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
