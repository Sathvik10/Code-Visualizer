import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const PieChart = ({ data, title, width = 500, height = 500 }) => {
  const chartRef = useRef();

  useEffect(() => {
    // Clear any previous chart
    d3.select(chartRef.current).selectAll("*").remove();

    const radius = Math.min(width, height) / 2;
    const svg = d3
      .select(chartRef.current)
      .append("svg")
      .attr("width", width + 20) // Add extra width for padding
      .attr("height", height + 20) // Add extra height for padding
      .append("g")
      .attr("transform", `translate(${(width + 20) / 2}, ${(height + 20) / 2})`);

    const color = d3.scaleOrdinal(d3.schemeTableau10);
    const pie = d3.pie().value((d) => d.count);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(0).outerRadius(radius + 10); // For hover effect

    const data_ready = pie(data);

    // Create the tooltip div (hidden initially)
    const tooltip = d3
      .select(chartRef.current)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(0, 0, 0, 0.7)")
      .style("color", "#fff")
      .style("padding", "5px")
      .style("border-radius", "5px")
      .style("font-size", "12px");

    // Pie chart slices
    const slices = svg
      .selectAll("path")
      .data(data_ready)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => color(d.data.name))
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .on("mouseenter", function (event, d) {
        // Show tooltip with name and email
        tooltip
          .html(`<strong>${d.data.name}</strong><br/>${d.data.email}`)
          .style("visibility", "visible");

        // Scale up the slice when hovered
        d3.select(this)
          .transition()
          .duration(300)
          .attr("d", arcHover)
          .style("opacity", 0.7);
      })
      .on("mousemove", function (event) {
        // Position the tooltip near the mouse
        tooltip
          .style("top", event.pageY + 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseleave", function () {
        // Hide tooltip
        tooltip.style("visibility", "hidden");

        // Reset the slice when hover is removed
        d3.select(this)
          .transition()
          .duration(300)
          .attr("d", arc)
          .style("opacity", 1);
      });

    // Add labels
    svg
      .selectAll("text")
      .data(data_ready)
      .enter()
      .append("text")
      .text((d) => `${d.data.name} (${d.data.count})`)
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .style("text-anchor", "middle")
      .style("font-size", "12px");
  }, [data, width, height]);

  return (
    <div style={{ margin: "20px", textAlign: "center" }}>
      <h3>{title}</h3>
      <div ref={chartRef} />
    </div>
  );
};

export default PieChart;
