import React, { useState, useEffect, useRef } from "react";
import runForceGraph from "./graphAnimation";
import styles from "./graphAnimation.module.css";
import * as d3 from "d3";

export default function BFSGraphContainer({ graphData, linksData, nodesData }) {
  const [nodes] = useState(nodesData);
  const [links] = useState(linksData);
  const [graph] = useState(graphData);

  const [bfsQueue, setBfsQueue] = useState([]);
  const [visited, setVisited] = useState({});

  const containerRef = useRef(null);
  const onStart = (id) => {
    if(bfsQueue.length === 0) {
      setBfsQueue([id]);
      setVisited({ id: true });
    }
  }

  const clickMe = () => {
    const bfsQueueCopy = JSON.parse(JSON.stringify(bfsQueue));
    const visitedCopy = JSON.parse(JSON.stringify(visited));

    if(bfsQueue.length > 0) {
      const currentNode = bfsQueueCopy.shift();
      graph[currentNode].forEach(neighbor => {
        if(!visitedCopy[neighbor]) {
          bfsQueueCopy.push(neighbor);
          visitedCopy[neighbor] =  true;
        }
      });

      d3.select("#"+currentNode).attr("class", styles.active);
    }

    setBfsQueue(bfsQueueCopy);
    setVisited(visitedCopy);
  }

  useEffect(() => {
    let destroyFn;

    if (containerRef.current) {
      if(containerRef.current.children.length > 0) {
        containerRef.current.removeChild(containerRef.current.children[0]);
      }
      const { destroy } = runForceGraph(containerRef.current, links, nodes, onStart);
      destroyFn = destroy;
    }
    
    return destroyFn;
  }, [links, nodes]);

  return <div>
    <button onClick={clickMe}> click me </button>
    <div ref={containerRef} className={styles.container} />
  </div>
}
