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
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
  
      const color = d3.scaleOrdinal(d3.schemeTableau10);
      const pie = d3.pie().value((d) => d.count);
      const arc = d3.arc().innerRadius(0).outerRadius(radius);
      const arcHover = d3.arc().innerRadius(0).outerRadius(radius + 10);
  
      const data_ready = pie(data);
  
      const tooltip = d3
        .select(container)
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("font-size", "12px");
  
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
            .style("top", event.pageY + 10 + "px")
            .style("left", event.pageX + 10 + "px");
        })
        .on("mouseleave", function () {
          tooltip.style("visibility", "hidden");
          d3.select(this)
            .transition()
            .duration(300)
            .attr("d", arc)
            .style("opacity", 1);
        });
  
      svg
        .selectAll("text")
        .data(data_ready)
        .enter()
        .append("text")
        .text((d) => `${d.data.name} (${d.data.count})`)
        .attr("transform", (d) => `translate(${arc.centroid(d)})`)
        .style("text-anchor", "middle")
        .style("font-size", "12px");
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
      <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );  
};

export default PieChart;
