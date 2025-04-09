import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const PieChart = ({ data, title }) => {
  const chartRef = useRef();

  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;
  
    const renderChart = () => {
      // Clear previous chart
      d3.select(container).selectAll("*").remove();
  
      const { width, height } = container.getBoundingClientRect();
      const radius = Math.min(width, height) / 2;
  
      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width + 40) // add padding space
        .attr("height", height + 20)
        .attr("viewBox", `0 ${-30} ${width} ${height + 60}`)
        .append("g")
        .attr("transform", `translate(${(width + 40) / 2}, ${(height + 40) / 2})`);
  
      const color = d3.scaleOrdinal(d3.schemeTableau10);
      const pie = d3.pie().value((d) => d.count);
      const arc = d3.arc().innerRadius(0.5 * radius).outerRadius(radius);
      const arcHover = d3.arc().innerRadius(0.5 * radius).outerRadius(radius + 10);
  
      const data_ready = pie(data);
  
      // Tooltip creation
      const tooltip = d3
        .select(container.parentElement)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "fixed") // Use fixed position for consistent visibility
        .style("visibility", "hidden")
        .style("background-color", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("pointer-events", "none"); // Make sure it doesn't interfere with interactions
  
      // Create chart slices
      svg
        .selectAll("path")
        .data(data_ready)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (d) => color(d.data.name))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .on("mouseenter", function (event, d) {
          tooltip
            .html(`<strong>${d.data.name}</strong><br/>${d.data.email}`)
            .style("visibility", "visible");
  
          d3.select(this)
            .transition()
            .duration(300)
            .attr("d", arcHover)
            .style("opacity", 0.7);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("top", `${event.clientY + 10}px`)  // Adjust for cursor position
            .style("left", `${event.clientX + 10}px`); // Adjust for cursor position
        })
        .on("mouseleave", function () {
          tooltip.style("visibility", "hidden");
          d3.select(this)
            .transition()
            .duration(300)
            .attr("d", arc)
            .style("opacity", 1);
        });
  
      // Create labels
      // svg
      //   .selectAll("text")
      //   .data(data_ready)
      //   .enter()
      //   .append("text")
      //   .text((d) => {
      //     const initials = d.data.name
      //       .split(" ")
      //       .map(word => word[0])
      //       .join("");
      //     return `${initials} (${d.data.count} %)`;
      //   })
      //   .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      //   .style("text-anchor", "middle")
      //   .style("font-size", "12px");

      const outerArc = d3.arc()
        .innerRadius(radius * 1.2)
        .outerRadius(radius * 1.2);

        svg.selectAll('allPolylines')
          .data(data_ready)
          .join('polyline')
            .attr("stroke", "black")
            .style("fill", "none")
            .attr("stroke-width", 1)
            .attr('points', function(d) {
              const posA = arc.centroid(d) // line insertion in the slice
              const posB = outerArc.centroid(d) // line break: we use the other arc generator
              const posC = outerArc.centroid(d) // Label position = line break + 30%
              const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2 // angle for positioning
              posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1); // Adjust X position for left/right
              return [posA, posB, posC];
            });

        svg.selectAll('allLabels')
          .data(data_ready)
          .join('text')
            .text(d => d.data.name + " (" + d.data.count + "%)")
            .attr('transform', function(d) {
              const pos = outerArc.centroid(d);
              const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
              pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1);
              return `translate(${pos})`;
            })
          .style('text-anchor', function(d) {
              const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
              return (midangle < Math.PI ? 'start' : 'end')
          })
          .style("font-size", "12px")
          .style("font-weight", "bold")


    };
  
    const resizeObserver = new ResizeObserver(() => {
      renderChart();
    });
  
    resizeObserver.observe(container);
    renderChart();
  
    return () => resizeObserver.disconnect();
  }, [data]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {title && <h3 style={{ textAlign: "center" }}>{title}</h3>}
      <div ref={chartRef} style={{ width: "90%", height: "90%" }} />
    </div>
  );  
};

export default PieChart;
