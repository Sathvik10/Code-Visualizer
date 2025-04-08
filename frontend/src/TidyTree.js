import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const TidyTree = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    const width = 600;

    const root = d3.hierarchy(data);
    const dx = 10;
    const dy = (width) / (1 + root.height);

    // Create a tree layout.
    const tree = d3.tree().nodeSize([dx, dy]);
    const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);
    // Sort the tree and apply the layout.
    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));

    // Compute the extent of the tree.
    // let x0 = Infinity;
    // let x1 = -x0;
    // root.each(d => {
    //   if (d.x > x1) x1 = d.x;
    //   if (d.x < x0) x0 = d.x;
    // });

    // // Compute the adjusted height of the tree.
    // const height = x1 - x0 + dx * 2;

    // Create the SVG element
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", dx * 2)
      .attr("viewBox", [-dy / 3, -dx, width, dx])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif; user-select: none;");

    svg.selectAll("*").remove();

    // Links
    const gLink = svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)

    const gNode = svg.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

    function update(event, source) {
      const duration = event?.altKey ? 2500 : 200;
      const nodes = root.descendants().reverse();
      const links = root.links();

      tree(root);

      let left = root;
      let right = root;
      root.eachBefore(d => {
        if (d.x < left.x) left = d;
        if (d.x > right.x) right = d;
      });

      const height = right.x - left.x + dx * 2;

      const transition = svg.transition()
        .duration(duration)
        .attr("height", height)
        .attr("viewBox", [-dy / 3, left.x - dx, width, height])
        .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

      const node = gNode.selectAll("g")
        .data(nodes, d => d.id);

      const nodeEnter = node.enter().append("g")
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", (event, d) => {
          d.children = d.children ? null : d._children;
          update(event, d);
        });

      nodeEnter.append("circle")
        .attr("r", 3)
        .attr("fill", d => d._children ? "#555" : "#999")
        .attr("stroke-width", 10);
      
      nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d._children ? -6 : 6)
        .attr("text-anchor", d => d._children ? "end" : "start")
        .text(d => d.data.name)
        .attr("stroke", "white")
        .attr("paint-order", "stroke")
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")

      const nodeUpdate = node.merge(nodeEnter).transition(transition)
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

      const nodeExit = node.exit().transition(transition).remove()
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);
        
      const link = gLink.selectAll("path")
        .data(links, d => d.target.id);

      const linkEnter = link.enter().append("path")
        .attr("d", d => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        })
      
      link.merge(linkEnter).transition(transition)
        .attr("d", diagonal);
      
      link.exit().transition(transition).remove()
        .attr("d", d => {
          const o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        });

      root.eachBefore(d => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    root.x0 = dy/2;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
      d.id = i;
      d._children = d.children;
      if (d.depth && d.data.name.length !== 7) d.children = null;
    });

    update(null, root);

  }, [data]);

  return <svg ref={svgRef}></svg>;
};

export default TidyTree;
