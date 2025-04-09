import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const CirclePackingChart = ({ data, title }) => {
  const chartRef = useRef();
  const [chartInitialized, setChartInitialized] = useState(false);
  const tooltipRef = useRef(null);
  const simulationRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Clean up function to ensure proper teardown
  useEffect(() => {
    return () => {
      // Clean up simulation if it exists
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      
      // Clean up resize observer if it exists
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      
      // Clean up tooltip if it exists
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    const container = chartRef.current;
    if (!container || !data || data.length === 0) return;

    // Only initialize the chart once
    if (chartInitialized) return;
    setChartInitialized(true);

    const renderChart = () => {
      // Clear previous chart
      d3.select(container).selectAll("*").remove();

      const { width, height } = container.getBoundingClientRect();
      
      // Create SVG
      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height);
      
      // Create a group for all elements (for zoom handling)
      const g = svg.append("g");

      // Color scale
      const color = d3.scaleOrdinal(d3.schemeTableau10);
      
      // Size scale for circles
      const maxValue = d3.max(data, d => d.count);
      const size = d3.scaleLinear()
        .domain([0, maxValue])
        .range([10, 55]); // Circle sizes between 10px and 55px

      // Tooltip creation - store reference for cleanup
      const tooltip = d3
        .select(container.parentElement)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "fixed")
        .style("visibility", "hidden")
        .style("background-color", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("pointer-events", "none");
      
      tooltipRef.current = tooltip;

      // Create circles
      const node = g
        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", d => size(d.count))
        .attr("cx", width / 2)
        .attr("cy", height / 2)
        .style("fill", d => color(d.name))
        .style("fill-opacity", 0.8)
        .attr("stroke", "white")
        .style("stroke-width", 2)
        .on("mouseenter", function(event, d) {
          tooltip
            .html(`<strong>${d.name}</strong><br/>${d.email}<br/>${d.count}`)
            .style("visibility", "visible");

          d3.select(this)
            .transition()
            .duration(300)
            .style("fill-opacity", 1)
            .attr("stroke", "#333")
            .style("stroke-width", 3);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("top", `${event.clientY + 10}px`)
            .style("left", `${event.clientX + 10}px`);
        })
        .on("mouseleave", function() {
          tooltip.style("visibility", "hidden");
          d3.select(this)
            .transition()
            .duration(300)
            .style("fill-opacity", 0.8)
            .attr("stroke", "white")
            .style("stroke-width", 2);
        })
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

      // Add labels to the circles
      const labels = g
        .selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(d => {
          const initials = d.name
            .split(" ")
            .map(word => word[0])
            .join("");
          return initials;
        })
        .attr("class", "label")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style("pointer-events", "none"); // Prevent labels from intercepting events

      // Define zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 10]) // Allow zoom from 0.1x to 10x
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          
          // Adjust stroke width based on zoom level
          const strokeWidth = 2 / event.transform.k;
          node.style("stroke-width", strokeWidth);
          
          // Adjust font size based on zoom level
          const fontSize = 10 / event.transform.k;
          labels.style("font-size", `${fontSize}px`);
        });

      // Apply zoom behavior to svg
      svg.call(zoom);
      
      // Add double-click to reset zoom
      svg.on("dblclick.zoom", function(event) {
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
      });

      // Add zoom controls
      // Zoom in button
      svg.append("circle")
        .attr("cx", 30)
        .attr("cy", 30)
        .attr("r", 15)
        .style("fill", "#f8f9fa")
        .style("stroke", "#dee2e6")
        .style("cursor", "pointer")
        .on("click", function() {
          svg.transition()
            .duration(300)
            .call(zoom.scaleBy, 1.3);
        });

      svg.append("text")
        .attr("x", 30)
        .attr("y", 35)
        .text("+")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .style("cursor", "pointer")
        .style("pointer-events", "none");

      // Zoom out button
      svg.append("circle")
        .attr("cx", 30)
        .attr("cy", 70)
        .attr("r", 15)
        .style("fill", "#f8f9fa")
        .style("stroke", "#dee2e6")
        .style("cursor", "pointer")
        .on("click", function() {
          svg.transition()
            .duration(300)
            .call(zoom.scaleBy, 0.7);
        });

      svg.append("text")
        .attr("x", 30)
        .attr("y", 75)
        .text("−")
        .style("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .style("cursor", "pointer")
        .style("pointer-events", "none");

      // Reset button
      svg.append("circle")
        .attr("cx", 30)
        .attr("cy", 110)
        .attr("r", 15)
        .style("fill", "#f8f9fa")
        .style("stroke", "#dee2e6")
        .style("cursor", "pointer")
        .on("click", function() {
          svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
        });

      svg.append("text")
        .attr("x", 30)
        .attr("y", 115)
        .text("R")
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("cursor", "pointer")
        .style("pointer-events", "none");

      // Force simulation setup
      const simulation = d3
        .forceSimulation()
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("charge", d3.forceManyBody().strength(0.1))
        .force("collide", d3.forceCollide().strength(0.5).radius(d => size(d.count) + 5).iterations(2));
      
      // Store simulation reference for cleanup
      simulationRef.current = simulation;

      // Apply forces to nodes
      simulation
        .nodes(data)
        .on("tick", () => {
          node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

          labels
            .attr("x", d => d.x)
            .attr("y", d => d.y + 4); // Center text vertically
        });

      // Drag functions
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    };

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      // Reset initialization flag on resize to allow re-rendering
      setChartInitialized(false);
    });
    
    resizeObserverRef.current = resizeObserver;
    resizeObserver.observe(container);
    
    // Initial render
    renderChart();

  }, [data, chartInitialized]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {title && <h3 style={{ textAlign: "center" }}>{title}</h3>}
      <div 
        ref={chartRef} 
        style={{ 
          width: "100%", 
          height: "90%",
          cursor: "grab"
        }} 
      />
    </div>
  );
};

export default CirclePackingChart;