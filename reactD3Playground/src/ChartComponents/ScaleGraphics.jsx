import React, { useEffect } from 'react';
import * as d3 from 'd3';

const DATA = [
  { x: 10, y: 20 },
  { x: 20, y: 50 },
  { x: 80, y: 90 }
];

export default function App() {
  useEffect(() => {
    const margin =  { top: 10, right: 40, bottom: 30, left: 30 };
    const width =   450 - margin.left - margin.right;
    const height =  400 - margin.top - margin.bottom;

    const svg = d3
      .select('#area')
        .append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom)
        .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    
    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x));

    svg.append('g').call(d3.axisLeft(y));

    svg
      .selectAll("whatever")
      .data(DATA)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 7);
  }, []);

  return (
    <div className='App'>
      <svg id='area' height={400} width={500}></svg>
    </div>
  );
}
