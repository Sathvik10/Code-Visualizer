import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const TidyTree = ({ data, onNodeClick }) => {
  const svgRef = useRef();
  const wrapperRef = useRef();
  const zoomRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  let highlightedPath = [];

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
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
    if (!data || !dimensions.width || !dimensions.height) return;

    const width = dimensions.width;
    const dx = 40;
    const root = d3.hierarchy(data);

    // Calculate and apply dynamic spacing based on tree depth and expanded nodes
    function calculateDynamicSpacing(root) {
      // Start with a base spacing
      let baseSpacing = width / (1 + root.height);

      // Count expanded nodes at each depth level
      const depthExpansion = {};
      root.each((d) => {
        if (d.children && d.children.length > 0) {
          depthExpansion[d.depth] = (depthExpansion[d.depth] || 0) + 1;
        }
      });

      // Adjust spacing based on expansion count - minimum 120px between levels
      const dynamicDy = Math.max(baseSpacing, 120);

      return dynamicDy;
    }

    const dy = calculateDynamicSpacing(root);

    const tree = d3.tree().nodeSize([dx, dy]);
    const diagonal = d3
      .linkHorizontal()
      .x((d) => d.y)
      .y((d) => d.x);

    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const gZoom = svg.append("g");
    const gLink = gZoom
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5);

    const gNode = gZoom
      .append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

    // Define zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        gZoom.attr("transform", event.transform);
        zoomRef.current = event.transform; // Store current transform
      });

    svg.call(zoom);

    // Initial centering only on first render
    let isFirstRender = true;

    function update(event, source) {
      const duration = event?.altKey ? 2500 : 200;

      // Recalculate dynamic spacing whenever a node is expanded/collapsed
      const dynamicDy = calculateDynamicSpacing(root);
      tree.nodeSize([dx, dynamicDy]);

      const nodes = root.descendants().reverse();
      const links = root.links();

      tree(root);

      let left = root;
      let right = root;
      root.eachBefore((d) => {
        if (d.x < left.x) left = d;
        if (d.x > right.x) right = d;
      });

      const treeHeight = right.x - left.x + dx * 2;
      const treeWidth = d3.max(nodes, (d) => d.y) + 100;

      svg.attr("viewBox", [0, 0, width, dimensions.height]);

      const node = gNode.selectAll("g").data(nodes, (d) => d.id);

      const nodeEnter = node
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${source.y0},${source.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", (event, d) => {
          d.children = d.children ? null : d._children;
          update(event, d);

          // === HIGHLIGHT PATH ===
          highlightedPath = [];
          let current = d;
          while (current) {
            highlightedPath.push(current);
            current = current.parent;
          }

          if (onNodeClick) {
            onNodeClick(d.data.path);
          }
        });

      // Adjust node appearance based on children state
      nodeEnter
        .append("circle")
        .attr("r", 3.5)
        .attr("fill", (d) => (d._children ? "#555" : "#999"))
        .attr("stroke-width", 10);

      // Calculate text padding based on node depth and expanded state
      nodeEnter
        .append("text")
        .attr("dy", "0.31em")
        .attr("x", (d) => (d._children ? -10 : 10))
        .attr("text-anchor", (d) => (d._children ? "end" : "start"))
        .text((d) => d.data.name)
        .attr("stroke", "white")
        .attr("paint-order", "stroke")
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round");

      // Highlighted nodes
      node
        .merge(nodeEnter)
        .select("circle")
        .transition()
        .duration(duration)
        .attr("fill", (d) =>
          highlightedPath.includes(d)
            ? "#f00" // Highlighted node color (red)
            : d._children
            ? "#555"
            : "#999"
        );

      node
        .merge(nodeEnter)
        .select("text")
        .transition()
        .duration(duration)
        .attr("fill", (d) => (highlightedPath.includes(d) ? "#f00" : "black"));

      // Adjust node positions with more horizontal spacing
      root.each((d) => {
        // Increase horizontal spacing for expanded nodes
        d.y = d.depth * dynamicDy;

        // Apply additional spacing for nodes with expanded children
        if (d.children && d.children.length > 0) {
          d.y += 30; // Push expanded nodes further to the right
        }
      });

      node
        .merge(nodeEnter)
        .transition()
        .duration(duration)
        .attr("transform", (d) => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

      node
        .exit()
        .transition()
        .duration(duration)
        .remove()
        .attr("transform", (d) => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

      const link = gLink.selectAll("path").data(links, (d) => d.target.id);

      const linkEnter = link
        .enter()
        .append("path")
        .attr("d", (d) => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        });

      link.merge(linkEnter).transition().duration(duration).attr("d", diagonal);

      link
        .exit()
        .transition()
        .duration(duration)
        .remove()
        .attr("d", (d) => {
          const o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        });

      root.eachBefore((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      // Only center on first render
      if (isFirstRender) {
        const horizontalOffset = 200;
        const initialTransform = d3.zoomIdentity.translate(
          width / 2 - root.y - horizontalOffset,
          dimensions.height / 2 - root.x
        );

        svg
          .transition()
          .duration(duration)
          .call(zoom.transform, initialTransform);
        zoomRef.current = initialTransform;
        isFirstRender = false;
      }
    }

    root.x0 = dx / 2;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
      if (d.depth && d.data.name.length !== 7) d.children = null;
    });

    update(null, root);
  }, [data, dimensions]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "100vh", overflow: "hidden" }}
    >
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: "grab",
          userSelect: "none",
        }}
      />
    </div>
  );
};

export default TidyTree;
