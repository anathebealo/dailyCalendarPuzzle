// source: https://levelup.gitconnected.com/creating-a-force-graph-using-react-and-d3-6579bcd9628c
import * as d3 from "d3";
import styles from "./graphAnimation.module.css";

export default function runForceGraph(
  container,
  linksData,
  nodesData,
  onStart
) {
  const links = linksData.map((d) => Object.assign({}, d));
  const nodes = nodesData.map((d) => Object.assign({}, d));

  const containerRect = container.getBoundingClientRect();
  const height = containerRect.height;
  const width = containerRect.width;

  const getClass = (active) => {
    return active ? styles.active : styles.inactive;
  };

  const getLinkClass = (active) => {
    return active ? styles.activeLink : styles.inactiveLink;
  };

  const drag = (simulation) => {
    const dragstarted = (e, d) => {
      if (!e.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    };

    const dragged = (e, d) => {
      d.fx = e.x;
      d.fy = e.y;
    };

    const dragended = (e, d) => {
      if (!e.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    };

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(50))
    .force("charge", d3.forceManyBody().strength(-900))
    .force("x", d3.forceX())
    .force("y", d3.forceY());

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .call(d3.zoom().on("zoom", function (e) {
      svg.attr("transform", e.transform);
    }));

  svg.append('defs')
    .append('marker')
    .attr('id', `arrow-${getLinkClass(false)}`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 31)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', "M0,-5L10,0L0,5")
    .attr('fill', '#666')
    .attr('stroke', '#666');
  
  svg.append('defs')
    .append('marker')
    .attr('id', `arrow-${getLinkClass(true)}`)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 31)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr('orient', 'auto-start-reverse')
    .append('path')
    .attr('d', "M0,-5L10,0L0,5")
    .attr('fill', '#111')
    .attr('stroke', '#111');

  const link = svg
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", d => `${getLinkClass(d.active)}`)
    .attr('marker-end', d => `url(#arrow-${getLinkClass(d.active)})`);

  const node = svg
    .append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", 25)
    .attr("id", d => d.id)
    .on("click", (e, data) => onStart(data.id))
    .attr("class", d => `${getClass(d.active)}`)
    .call(drag(simulation))

  const label = svg.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(d => {return d.name;})
    .call(drag(simulation));

  simulation.on("tick", () => {
    //update link positions
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    // update node positions
    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    // update label positions
    label
      .attr("x", d => { return d.x; })
      .attr("y", d => { return d.y; })
  });

  return {
    destroy: () => {
      simulation.stop();
    },
    nodes: () => {
      return svg.node();
    }
  };
}
