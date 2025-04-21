import React, { useState, useEffect } from "react";
import CoverageGraph from "./CoverageGraph";

const CoverageDashboardPanel = ({ projectName }) => {
  const [coverageData, setCoverageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "graph"

  // Fetch coverage data when the component mounts or projectName changes
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-2"></div>
        Loading coverage data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">
        <div className="font-bold">Error</div>
        <div>{error}</div>
      </div>
    );
  }

  // Parse coverage report data (if available)
  const parseReportData = () => {
    if (!coverageData || !coverageData.coverageReport) {
      // If coverageReport is not available, use fileCoverages instead
      if (coverageData && coverageData.fileCoverages) {
        return Object.entries(coverageData.fileCoverages).map(([path, data]) => ({
          path,
          name: path.split('/').pop(),
          coverage: data.coveragePerc || 0
        }));
      }
      return [];
    }

    const lines = coverageData.coverageReport.split('\n');
    return lines
      .filter(line => line.trim() !== '')
      .map(line => {
        const parts = line.trim().split('\t');
        // Extract path, function, and percentage
        const path = parts[0].split(':')[0];
        const name = parts.filter(p => p.trim() !== '').slice(-2)[0];
        const coverage = parseFloat(parts.filter(p => p.trim() !== '').slice(-1)[0].replace('%', ''));
        
        return { path, name, coverage };
      })
      .filter(item => !isNaN(item.coverage));
  };

  const reportData = parseReportData();

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Code Coverage</h2>
        
        {/* Tab navigation */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1 rounded text-sm ${
              activeTab === "overview" 
                ? "bg-blue-500 text-white" 
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Overview
          </button>
          {/* <button
            onClick={() => setActiveTab("graph")}
            className={`px-3 py-1 rounded text-sm ${
              activeTab === "graph" 
                ? "bg-blue-500 text-white" 
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Graph
          </button> */}
        </div>
      </div>
      
      <div className="h-[calc(100%-3rem)] overflow-hidden">
        {activeTab === "overview" && (
          <div className="h-full flex flex-col">            
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-600 mb-1">Total Coverage</div>
                <div className="text-2xl font-bold">{coverageData.totalCoverage.toFixed(1)}%</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <div className="text-sm text-green-600 mb-1">Files Covered</div>
                <div className="text-2xl font-bold">
                  {coverageData.filesCovered}/{coverageData.totalFiles}
                </div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <div className="text-sm text-indigo-600 mb-1">Total Files</div>
                <div className="text-2xl font-bold">{coverageData.totalFiles}</div>
              </div>
            </div>
            
            {/* Combined coverage distribution with bar graph */}
            <div className="flex-grow bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-auto">
              <h3 className="text-md font-semibold mb-3">Coverage Distribution</h3>
              
              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden mb-4">
                {/* High coverage (70%+) */}
                <div 
                  className="absolute left-0 top-0 h-full bg-green-500"
                  style={{ 
                    width: `${reportData.filter(d => d.coverage >= 70).length / reportData.length * 100}%` 
                  }}
                ></div>
                
                {/* Medium coverage (30-70%) */}
                <div 
                  className="absolute left-0 top-0 h-full bg-yellow-500"
                  style={{ 
                    width: `${reportData.filter(d => d.coverage >= 30 && d.coverage < 70).length / reportData.length * 100}%`,
                    marginLeft: `${reportData.filter(d => d.coverage >= 70).length / reportData.length * 100}%`
                  }}
                ></div>
                
                {/* Low coverage (0-30%) */}
                <div 
                  className="absolute left-0 top-0 h-full bg-red-500"
                  style={{ 
                    width: `${reportData.filter(d => d.coverage < 30).length / reportData.length * 100}%`,
                    marginLeft: `${(reportData.filter(d => d.coverage >= 70).length + reportData.filter(d => d.coverage >= 30 && d.coverage < 70).length) / reportData.length * 100}%`
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm mb-6">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  <span>Good (&gt;70%): {reportData.filter(d => d.coverage >= 70).length}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                  <span>Okay (30-70%): {reportData.filter(d => d.coverage >= 30 && d.coverage < 70).length}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                  <span>Poor (&lt;30%): {reportData.filter(d => d.coverage < 30).length}</span>
                </div>
              </div>
              
              {/* Insert coverage graph component in the overview tab */}
              <div className="flex-grow" style={{ height: `calc(100% - 100px)` }}>
                <CoverageGraph coverageData={coverageData} />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "graph" && (
          <div className="h-full">
            <CoverageGraph coverageData={coverageData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CoverageDashboardPanel;