import * as d3 from 'd3';

export const drawsBarChart = (svgElement, containerElement, counts, title) => {
  const width = containerElement.clientWidth;
  const height = containerElement.clientHeight;
  const margin = { top: 40, right: 20, bottom: 100, left: 60 };

  // Clear existing SVG
  d3.select(svgElement).selectAll('*').remove();
  const color = d3.scaleOrdinal(d3.schemeTableau10);
  
  
  const svg = d3
    .select(svgElement)
    .attr('width', width)
    .attr('height', height);

  const x = d3
    .scaleBand()
    .domain(counts.map(d => d[0]))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(counts, d => d[1])])
    .nice()
    .range([height - margin.bottom, margin.top]);

//   const tooltip = d3.select(containerElement)
//     .append('div')
//     .style('position', 'absolute')
//     .style('background', 'rgba(0, 0, 0, 0.75)')
//     .style('color', '#fff')
//     .style('padding', '6px 10px')
//     .style('border-radius', '4px')
//     .style('font-size', '12px')
//     .style('pointer-events', 'none')
//     .style('visibility', 'hidden');

const tooltip = d3
    .select(containerElement)
    .append("div")
    .attr("class", "tooltip")
    .style("position", "fixed") // Use fixed position for consistent visibility
    .style("visibility", "hidden")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("padding", "5px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("pointer-events", "none")

  svg
    .append('g')
    .selectAll('rect')
    .data(counts)
    .enter()
    .append('rect')
    .attr('x', d => x(d[0]))
    .attr('y', d => y(d[1]))
    .attr('width', x.bandwidth())
    .attr('height', d => y(0) - y(d[1]))
    .attr("fill", (d) => color(d[0]))
    .on("mouseenter", function (event, d) {
          tooltip
            .html(`<strong>${d[0]}</strong><br/>${d[1]}`)
            .style("visibility", "visible");
        })
    .on('mouseover', (event, d) => {
        tooltip
          .html(`<strong>${d[0]}</strong><br/>Count: ${d[1]}`)
          .style('visibility', 'visible');
      })
      .on('mousemove', (event) => {
        tooltip
          .style('top', `${event.clientY + 10}px`)
          .style('left', `${event.clientX + 10}px`);
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
      });

  svg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('transform', 'rotate(-40)')
    .style('text-anchor', 'end');

  svg
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .text(title);
};