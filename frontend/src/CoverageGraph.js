import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const CoverageGraph = ({ coverageData }) => {
  const svgRef = useRef();
  const wrapperRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries.length) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!coverageData || !coverageData.fileCoverages || !dimensions.width) {
      console.log("Missing data or dimensions:", { 
        hasCoverageData: !!coverageData, 
        hasFileCoverages: coverageData && !!coverageData.fileCoverages, 
        width: dimensions.width 
      });
      return;
    }

    // Extract data for visualization
    const fileData = Object.entries(coverageData.fileCoverages)
      .map(([file, coverage]) => ({
        file: file.split('/').pop(), // Get just the filename
        path: file,
        coverage: coverage.coveragePerc || 0,
        statements: coverage.statements || 0,
        covered: coverage.covered || 0
      }))
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, 20); // Show at most 20 files
    
    console.log("Preparing to render graph with data:", fileData);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 90, left: 60 }; // Increased bottom margin
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Create the SVG container
    const container = svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleBand()
      .domain(fileData.map(d => d.file))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Create color scale
    const colorScale = d3.scaleThreshold()
      .domain([30, 70])
      .range(["#ef4444", "#f59e0b", "#10b981"]);

    // Add X axis
    container.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "10px");

    // Add Y axis
    container.append("g")
      .call(d3.axisLeft(y).ticks(10).tickFormat(d => `${d}%`));

    // Add title
    container.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("Code Coverage by File");

    // Add Y axis label
    container.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -(height / 2))
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Coverage (%)");

    // Add X axis label
    container.append("text")
      .attr("y", height + margin.bottom - 10)
      .attr("x", width / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text("Files");

    // Debug line to check if we're getting to the bar rendering code
    console.log("About to render bars for", fileData.length, "files");
    
    // Add bars with explicit debug logging
    const bars = container.selectAll(".bar")
      .data(fileData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.file))
      .attr("y", d => y(d.coverage))
      .attr("width", x.bandwidth())
      .attr("height", d => {
        const barHeight = height - y(d.coverage);
        console.log(`Bar for ${d.file}: coverage=${d.coverage}, height=${barHeight}`);
        return barHeight;
      })
      .attr("fill", d => colorScale(d.coverage));
    
    console.log("Rendered", bars.size(), "bars");

    // Add tooltips with file information
    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 100);

    bars.on("mouseenter", function(event, d) {
        d3.select(this)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);

        tooltip
          .style("opacity", 1)
          .html(`
            <div style="padding: 4px;">
              <div style="font-weight: bold;">${d.file}</div>
              <div style="font-size: 12px;">Path: ${d.path}</div>
              <div style="font-weight: bold; margin-top: 4px;">Coverage: ${d.coverage.toFixed(1)}%</div>
              <div style="font-size: 12px;">Statements: ${d.covered}/${d.statements}</div>
            </div>
          `);

        const tooltipWidth = tooltip.node().offsetWidth;
        const pageWidth = window.innerWidth;
        const xOffset = event.pageX + 10;

        // Adjust position if tooltip would overflow the screen
        const leftPosition = xOffset + tooltipWidth > pageWidth
          ? event.pageX - tooltipWidth - 10
          : xOffset;

        tooltip
          .style("left", `${leftPosition}px`)
          .style("top", `${event.pageY - 30}px`);
      })
      .on("mouseleave", function() {
        d3.select(this).attr("stroke", "none");
        tooltip.style("opacity", 0);
      });

    // Add threshold lines
    container.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y(30))
      .attr("y2", y(30))
      .attr("stroke", "#ef4444")
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", 1);
    
    container.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y(70))
      .attr("y2", y(70))
      .attr("stroke", "#10b981")
      .attr("stroke-dasharray", "5,5")
      .attr("stroke-width", 1);

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [coverageData, dimensions]);

  return (
    <div 
      ref={wrapperRef} 
      className="w-full h-full bg-white rounded-lg shadow-lg p-2"
    >
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default CoverageGraph;