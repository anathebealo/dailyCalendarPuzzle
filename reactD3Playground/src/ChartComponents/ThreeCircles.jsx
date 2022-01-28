import React, { useEffect } from 'react';
import * as d3 from 'd3';

export default function App() {
  useEffect(() => {
    const svg = d3.select('#area');
    svg
      .append('circle')
      .attr('cx', 50)
      .attr('cy', 50)
      .attr('r', 40)
      .style('fill', 'blue');
    svg
      .append('circle')
      .attr('cx', 140)
      .attr('cy', 70)
      .attr('r', 30)
      .style('fill', 'red');
    svg
      .append('circle')
      .attr('cx', 300)
      .attr('cy', 100)
      .attr('r', 20)
      .style('fill', 'green');
  }, []);

  return (
    <div className='App'>
      <svg id='area' height={200} width={450}></svg>
    </div>
  );
}