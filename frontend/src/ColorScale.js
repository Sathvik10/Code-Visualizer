import * as d3 from "d3";

let colorScale = null;

export const setColorScale = (data) => {
  const uniqueNames = [...new Set(data.map(d => d.name))].sort();
  colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueNames);
};

export const getColorScale = () => {
  return colorScale || (() => "#ccc"); // fallback
};