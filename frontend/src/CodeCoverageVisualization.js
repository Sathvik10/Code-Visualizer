import React, { useState, useRef, useEffect, useMemo } from "react";

// Modified version of the LintingCodeViewer for coverage highlighting
const CoverageCodeViewer = ({
  fileContent,
  coverageInfo,
  focusLine = -1
}) => {
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const [highlightedLine, setHighlightedLine] = useState(-1);

  const lines = fileContent.split('\n');

  // Parse coverage information for each line if available
  const coverageMap = useMemo(() => {
    if (!coverageInfo || !coverageInfo.lineCoverage) return {};
    return coverageInfo.lineCoverage.reduce((acc, item) => {
      acc[item.line] = item.covered;
      return acc;
    }, {});
  }, [coverageInfo]);

  useEffect(() => {
    if (focusLine > 0 && containerRef.current) {
      // Scroll into view
      const el = containerRef.current.querySelector(
        `[data-line="${focusLine}"]`
      );
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Highlight temporarily
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
          const isCovered = coverageMap[lineNumber] === true;
          const isNotCovered = coverageMap[lineNumber] === false;
          const isHighlighted = lineNumber === highlightedLine;

          return (
            <div
              key={idx}
              data-line={lineNumber}
              className={`group relative flex items-start px-3 py-0.5 whitespace-pre border-b border-gray-800 ${
                isHighlighted
                  ? 'bg-yellow-600/50 animate-pulse'
                  : isNotCovered
                  ? 'bg-red-800/30'
                  : isCovered
                  ? 'bg-green-800/30'
                  : 'bg-gray-900'
              }`}
            >
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

// Main coverage visualization component
const CodeCoverageVisualization = ({ projectName }) => {
  const [coverageData, setCoverageData] = useState(null);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch coverage data
  useEffect(() => {
    setIsLoading(true);
    fetch(`http://localhost:8080/api/v1/codecoverage/${projectName}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setCoverageData(data.response);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching coverage data:", err);
        setError("Failed to load coverage data");
        setIsLoading(false);
      });
  }, [projectName]);

  // Fetch file content when a file is selected
  useEffect(() => {
    if (selectedFile) {
      fetch(`http://localhost:8080/api/v1/filecontent/${projectName}?filepath=${selectedFile}`)
        .then((res) => res.json())
        .then((data) => {
          setFileContent(data.response);
        })
        .catch((err) => {
          console.error("Error fetching file content:", err);
          setFileContent("Error loading file content");
        });
    } else {
      setFileContent("Select a file to view coverage");
    }
  }, [projectName, selectedFile]);

  // Process coverage data into a hierarchical structure for tree view
  const fileTree = useMemo(() => {
    if (!coverageData || !coverageData.fileCoverages) return { children: [] };
    
    const root = { name: "root", children: [], path: "/" };
    
    // Sort files by path
    const sortedFiles = Object.keys(coverageData.fileCoverages).sort();
    
    sortedFiles.forEach(path => {
      const coverage = coverageData.fileCoverages[path];
      const parts = path.split('/');
      let currentNode = root;
      
      // Build path parts
      parts.forEach((part, index) => {
        if (!part) return;
        
        // Check if it's a file (last part)
        const isFile = index === parts.length - 1;
        
        // Find or create node
        let found = currentNode.children.find(node => node.name === part);
        if (!found) {
          const newNode = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            children: [],
          };
          
          if (isFile) {
            newNode.coverage = coverage;
            newNode.isFile = true;
          }
          
          currentNode.children.push(newNode);
          found = newNode;
        }
        
        currentNode = found;
      });
    });
    
    return root;
  }, [coverageData]);

  // Filter tree based on search term
  const filteredTree = useMemo(() => {
    if (!searchTerm) return fileTree;
    
    const filterNode = (node) => {
      if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return { ...node };
      }
      
      if (node.children && node.children.length) {
        const filteredChildren = node.children
          .map(child => filterNode(child))
          .filter(Boolean);
          
        if (filteredChildren.length) {
          return { ...node, children: filteredChildren };
        }
      }
      
      return null;
    };
    
    return filterNode(fileTree) || { children: [] };
  }, [fileTree, searchTerm]);

  // Toggle folder expansion
  const toggleFolder = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Render tree node recursively
  const renderTreeNode = (node, depth = 0) => {
    const isExpanded = expandedFolders[node.path];
    const hasChildren = node.children && node.children.length > 0;
    
    // Skip empty directories
    if (hasChildren && node.children.length === 0) return null;
    
    return (
      <div key={node.path} className="ml-4">
        <div 
          className={`flex items-center py-1 cursor-pointer hover:bg-gray-100 rounded ${
            selectedFile === node.path ? 'bg-blue-100' : ''
          }`}
          onClick={() => {
            if (node.isFile) {
              setSelectedFile(node.path);
            } else if (hasChildren) {
              toggleFolder(node.path);
            }
          }}
        >
          {/* Toggle icon for folders */}
          {hasChildren && (
            <span className="mr-1 text-gray-500 w-4">
              {isExpanded ? '▼' : '►'}
            </span>
          )}
          
          {/* File/folder icon */}
          <span className="mr-2">
            {node.isFile ? '📄' : '📁'}
          </span>
          
          {/* Node name */}
          <span className="flex-grow truncate">{node.name}</span>
          
          {/* Coverage percentage if available */}
          {node.coverage && (
            <span 
              className={`ml-2 px-2 py-0.5 rounded text-xs ${
                node.coverage < 30 ? 'bg-red-500 text-white' :
                node.coverage < 70 ? 'bg-yellow-500 text-black' :
                'bg-green-500 text-white'
              }`}
            >
              {node.coverage.toFixed(1)}%
            </span>
          )}
        </div>
        
        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l border-gray-200 pl-2">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Overall coverage visualization
  const CoverageSummary = () => {
    if (!coverageData) return null;
    
    const totalCoverage = coverageData.totalCoverage || 0;
    const filesCovered = coverageData.filesCovered || 0;
    const totalFiles = coverageData.totalFiles || 0;
    
    return (
      <div className="bg-white rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-3">Coverage Summary</h3>
        
        {/* Coverage gauge */}
        <div className="relative h-36 w-36 mx-auto mb-4">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            
            {/* Coverage indicator */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={
                totalCoverage < 30 ? '#ef4444' :
                totalCoverage < 70 ? '#f59e0b' :
                '#10b981'
              }
              strokeWidth="10"
              strokeDasharray={`${totalCoverage * 2.82} 282`}
              strokeDashoffset="0"
              transform="rotate(-90 50 50)"
            />
            
            {/* Percentage text */}
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="24"
              fontWeight="bold"
              fill="#1f2937"
            >
              {totalCoverage.toFixed(1)}%
            </text>
          </svg>
        </div>
        
        {/* Files covered info */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Files covered:</span>
          <span className="font-medium">
            {filesCovered} / {totalFiles} 
            ({totalFiles > 0 ? ((filesCovered / totalFiles) * 100).toFixed(1) : 0}%)
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading coverage data...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="grid grid-cols-5 gap-4 h-full">
      {/* Left panel: Tree view and summary */}
      <div className="col-span-2 flex flex-col gap-4">
        <CoverageSummary />
        
        <div className="bg-white rounded-lg p-4 shadow-lg flex-grow overflow-auto">
          <h3 className="text-lg font-semibold mb-2">Files</h3>
          
          {/* Search box */}
          <div className="mb-3">
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* File tree */}
          <div className="overflow-auto">
            {filteredTree.children.map(child => renderTreeNode(child))}
          </div>
        </div>
      </div>
      
      {/* Right panel: File viewer with coverage info */}
      <div className="col-span-3 bg-white rounded-lg p-4 shadow-lg h-full">
        <h3 className="text-lg font-semibold mb-2">
          {selectedFile ? selectedFile : "Select a file to view coverage"}
        </h3>
        
        <div className="h-[calc(100%-2rem)]">
          <CoverageCodeViewer
            fileContent={fileContent}
            coverageInfo={selectedFile ? coverageData.fileCoverages[selectedFile] : null}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeCoverageVisualization;