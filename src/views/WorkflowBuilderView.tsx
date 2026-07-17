import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Intent: Open Presentation' },
    position: { x: 250, y: 5 },
    className: 'bg-slate-800 text-white border-blue-500'
  },
  {
    id: '2',
    data: { label: 'Action: Open PowerPoint' },
    position: { x: 250, y: 100 },
    className: 'bg-slate-800 text-white'
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'Action: Presentation Mode' },
    position: { x: 250, y: 200 },
    className: 'bg-slate-800 text-white border-green-500'
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#60a5fa' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#60a5fa' } },
];

export const WorkflowBuilderView: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white p-6">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workflow Builder</h1>
          <p className="text-slate-400">Visual DAG editor for complex automation workflows.</p>
        </div>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors">
            Simulate DAG
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors">
            Save Workflow
          </button>
        </div>
      </header>

      <div className="flex-1 border border-slate-700 rounded-xl overflow-hidden shadow-2xl bg-slate-800">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          className="bg-slate-800"
        >
          <Background color="#475569" gap={16} />
          <Controls className="bg-slate-700 border-none fill-white" />
        </ReactFlow>
      </div>
    </div>
  );
};
