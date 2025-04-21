import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { drawsBarChart } from './BarChart';
import { drawPieChart } from './PieChart';



const PieReadyData = (data) => {
    var aggregated = {};
    data.forEach((c) => {
      const key = `${c.FromLinter}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          name: c.FromLinter,
          email: "",
          count: 0,
          measure : '',
        };
      }
      aggregated[key].count += 1;
    });
    return Object.values(aggregated);
}

const LintIssuesByLinter = ({ data, title , filterPath = null, useBarChart = true}) => {
  const svgRef = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!(Array.isArray(data) && data.length > 0)){
        return
    }
    if (svgRef.current && containerRef.current) {
        if (filterPath != null) {
            data = data.filter(d => d.Pos.Filename.startsWith(filterPath))
        }
        const linterCounts = d3.rollups(
            data,
            v => v.length,
            d => d.FromLinter
          );
        if (useBarChart)
            drawsBarChart(svgRef.current, containerRef.current, linterCounts, title);
        else {
            const pie_data = PieReadyData(data)
            drawPieChart(svgRef.current,pie_data)
        }
    } 

    const handleResize = () => {
      // Clear previous chart
      d3.select(svgRef.current).selectAll("*").remove();
      
      const linterCounts = d3.rollups(
        data,
        v => v.length,
        d => d.FromLinter
      );
      
      // Redraw with new dimensions
      if (useBarChart)
        drawsBarChart(svgRef.current, containerRef.current, linterCounts, title);
      else {
        const pie_data = PieReadyData(data);
        drawPieChart(svgRef.current, pie_data);
      }
    };


    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);


  return (

    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center">
    {!useBarChart && title && <h3 className="text-center">{title}</h3>}
    <svg ref={svgRef} className="w-full h-full" /> {/* Full width and height */}
  </div>
    // <div ref={containerRef} className="w-full h-full">
    //   <svg ref={svgRef}></svg>
    // </div>
  );
};

export default LintIssuesByLinter;
