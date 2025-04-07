import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const TidyTree = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    const width = 600;
    const dx = 20;
    const root = d3.hierarchy(data);
    const dy = width / (root.height + 1);

    // Create a tree layout.
    const tree = d3.tree().nodeSize([dx, dy]);

    // Sort the tree and apply the layout.
    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
    tree(root);

    // Compute the extent of the tree.
    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
      if (d.x > x1) x1 = d.x;
      if (d.x < x0) x0 = d.x;
    });

    // Compute the adjusted height of the tree.
    const height = x1 - x0 + dx * 2;

    // Create the SVG element
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-dy / 3, x0 - dx, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    // Links
    const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
    .selectAll()
      .data(root.links())
      .join("path")
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x));

    // Nodes
    const node = svg.append("g")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
    .selectAll()
    .data(root.descendants())
    .join("g")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Node Circles
    node.append("circle")
      .attr("fill", d => d.children ? "#555" : "#999")
      .attr("r", 2.5);

    // Node Labels
    node.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.children ? -6 : 6)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name)
      .attr("stroke", "white")
      .attr("paint-order", "stroke");

  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default TidyTree;
