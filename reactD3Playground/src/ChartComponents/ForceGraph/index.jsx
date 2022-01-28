import { useEffect, useState } from 'react';
import BFSGraphContainer from './BFSGraphContainer';
import { data } from './data';
import { v4 as uuid4 } from 'uuid';

export default function ForceGraph() {
  const [nodesData, setNodes] = useState([]);
  const [linksData, setLinks] = useState([]);
  const [graphWithIds, setGraphWithIds] = useState();

  const generateDomSafeId = () => `id-${uuid4()}`

  useEffect(() => {
    const graph = data.graph;
    const nodeNamesToIds = {};
    const nodes = [];
    const links = [];
    const idGraph = {};

    Object.keys(graph).forEach(nodeName => {
      if(!nodeNamesToIds[nodeName]) {
        nodeNamesToIds[nodeName] = generateDomSafeId();
      } 
      
      idGraph[nodeNamesToIds[nodeName]] = [];
      nodes.push({
        name: nodeName,
        id: nodeNamesToIds[nodeName],
        active: false,
      });

      graph[nodeName].forEach(neighbor => {
        if(!nodeNamesToIds[neighbor]) {
          nodeNamesToIds[neighbor] = generateDomSafeId();
        }

        idGraph[nodeNamesToIds[nodeName]].push(nodeNamesToIds[neighbor]);
        links.push({
          id: generateDomSafeId(),
          target: nodeNamesToIds[neighbor],
          source: nodeNamesToIds[nodeName]
        });
      });
    });


    setNodes(nodes);
    setLinks(links);
    setGraphWithIds(idGraph);
  }, [setNodes, setLinks]);

  return (
    <div className="App">
      <h1>React & D3 Graph</h1>
      { nodesData.length > 0 && linksData.length > 0
        ? <BFSGraphContainer linksData={linksData} nodesData={nodesData} graphData={graphWithIds} />
        : null
      }
    </div>
  );
}
