"use client";

import { useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

interface DFAData {
  alphabet: string[];
  states: string[];
  start: string;
  accepting: string[];
  transitions: Array<{
    from: string;
    symbol: string;
    to: string;
  }>;
}

interface DFAVisualizerProps {
  dfa: DFAData | null;
}

export default function DFAVisualizer({ dfa }: DFAVisualizerProps) {
  const { nodes, edges } = useMemo(() => {
    if (!dfa) {
      return { nodes: [], edges: [] };
    }

    // Encontrar la posición del estado inicial para crear un nodo de inicio
    const startStateIndex = dfa.states.findIndex((s) => s === dfa.start);
    
    // Crear nodos con mejor posicionamiento
    const nodeCount = dfa.states.length;
    const stateNodes: Node[] = dfa.states.map((stateId, index) => {
      const isStart = stateId === dfa.start;
      const isAccepting = dfa.accepting.includes(stateId);

      // Posicionar nodos en un círculo, pero ajustar para evitar superposiciones
      let angle, radius, x, y;
      
      if (nodeCount === 1) {
        x = 400;
        y = 300;
      } else if (nodeCount === 2) {
        // Dos nodos lado a lado
        x = index === 0 ? 250 : 550;
        y = 300;
      } else {
        // Distribución circular
        angle = (index / nodeCount) * 2 * Math.PI - Math.PI / 2; // Empezar desde arriba
        radius = Math.max(180, nodeCount * 30);
        x = 400 + radius * Math.cos(angle);
        y = 300 + radius * Math.sin(angle);
      }

      return {
        id: stateId,
        type: "default",
        position: { x, y },
        data: {
          label: (
            <div className="flex items-center justify-center">
              <div className="relative">
                <div
                  className={`px-4 py-2 rounded-full font-semibold text-sm shadow-md ${
                    isAccepting
                      ? "bg-gradient-to-br from-green-500 to-green-600 text-white ring-2 ring-green-300"
                      : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                  }`}
                >
                  {stateId}
                </div>
                {isAccepting && (
                  <div className="absolute -right-1 -top-1 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"></div>
                )}
              </div>
            </div>
          ),
        },
        style: {
          background: "transparent",
          border: "none",
          width: 100,
          height: 60,
        },
      };
    });

    // Crear nodo inicial invisible y flecha al estado inicial
    const nodes: Node[] = [...stateNodes];
    let startNodePosition = { x: 0, y: 0 };
    
    if (startStateIndex >= 0 && stateNodes[startStateIndex]) {
      const startNode = stateNodes[startStateIndex];
      // Calcular posición del nodo inicial (a la izquierda del estado inicial)
      const angle = startStateIndex >= 0 && nodeCount > 1
        ? (startStateIndex / nodeCount) * 2 * Math.PI - Math.PI / 2
        : 0;
      const radius = nodeCount === 1 ? 0 : Math.max(180, nodeCount * 30);
      const offsetDistance = 120;
      startNodePosition = {
        x: startNode.position.x - offsetDistance * Math.cos(angle + Math.PI),
        y: startNode.position.y - offsetDistance * Math.sin(angle + Math.PI),
      };

      // Agregar nodo inicial invisible
      nodes.unshift({
        id: "__start__",
        type: "default",
        position: startNodePosition,
        data: { label: "" },
        style: { opacity: 0, width: 1, height: 1 },
      });
    }

    // Agrupar transiciones por (from, to) para mostrar múltiples símbolos en una sola arista
    const transitionMap = new Map<string, Map<string, string[]>>();

    dfa.transitions.forEach((transition) => {
      const key = `${transition.from}->${transition.to}`;
      if (!transitionMap.has(transition.from)) {
        transitionMap.set(transition.from, new Map());
      }
      const fromMap = transitionMap.get(transition.from)!;
      if (!fromMap.has(transition.to)) {
        fromMap.set(transition.to, []);
      }
      fromMap.get(transition.to)!.push(transition.symbol);
    });

    // Crear edges
    const edges: Edge[] = [];
    
    // Agregar flecha inicial si existe
    if (dfa.start && nodes.length > 0) {
      edges.push({
        id: "__start-edge__",
        source: "__start__",
        target: dfa.start,
        type: "straight",
        style: {
          stroke: "#f59e0b",
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#f59e0b",
          width: 24,
          height: 24,
        },
        animated: false,
      });
    }
    
    transitionMap.forEach((toMap, from) => {
      toMap.forEach((symbols, to) => {
        // Si es una transición a sí mismo, crear un self-loop curvo
        const isSelfLoop = from === to;

        // Asegurar que hay símbolos para mostrar
        const labelText = symbols.length > 0 ? symbols.sort().join(", ") : "ε";
        
        // Si no hay texto, no crear el edge (no debería pasar, pero por seguridad)
        if (!labelText) return;
        
        if (isSelfLoop) {
          // Self-loop con curva diagonal - usar handles diagonales para crear curva visible
          edges.push({
            id: `${from}-${to}-${edges.length}`,
            source: from,
            target: to,
            type: "smoothstep",
            sourceHandle: "top-right",
            targetHandle: "bottom-left",
            style: {
              stroke: "#6366f1",
              strokeWidth: 2.5,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#6366f1",
              width: 20,
              height: 20,
            },
            label: labelText,
            labelStyle: {
              fill: "#1e293b",
              fontWeight: "bold",
              fontSize: 13,
            },
            labelShowBg: true,
            labelBgStyle: {
              fill: "#ffffff",
              fillOpacity: 0.95,
              stroke: "#6366f1",
              strokeWidth: 2,
            },
            labelBgPadding: [6, 8],
            labelBgBorderRadius: 4,
          });
        } else {
          // Transición normal entre nodos diferentes
          edges.push({
            id: `${from}-${to}-${edges.length}`,
            source: from,
            target: to,
            type: "smoothstep",
            style: {
              stroke: "#6366f1",
              strokeWidth: 2.5,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#6366f1",
              width: 20,
              height: 20,
            },
            label: labelText,
            labelStyle: {
              fill: "#1e293b",
              fontWeight: "bold",
              fontSize: 13,
            },
            labelShowBg: true,
            labelBgStyle: {
              fill: "#ffffff",
              fillOpacity: 0.95,
              stroke: "#6366f1",
              strokeWidth: 2,
            },
            labelBgPadding: [6, 8],
            labelBgBorderRadius: 4,
          });
        }
      });
    });

    return { nodes, edges };
  }, [dfa]);

  if (!dfa) {
    return (
      <div className="w-full h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm font-medium">
            Ingresa una expresión regular para ver el DFA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border-2 border-gray-200 rounded-lg bg-white shadow-lg relative">
      {/* Indicador de estado inicial */}
      {dfa.start && (
        <div className="absolute top-4 left-4 z-10 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-semibold text-yellow-800">
              Inicio: <code className="font-mono">{dfa.start}</code>
            </span>
          </div>
        </div>
      )}

      {/* Indicador de estados finales */}
      {dfa.accepting.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-green-100 border border-green-300 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full ring-2 ring-green-300"></div>
            <span className="text-sm font-semibold text-green-800">
              Aceptación:{" "}
              <code className="font-mono">
                {dfa.accepting.join(", ")}
              </code>
            </span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.5 }}
        nodesDraggable={true}
      >
        <Background color="#f3f4f6" gap={20} size={1} />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node: Node) => {
            const isAccepting = dfa.accepting.includes(node.id);
            const isStart = node.id === dfa.start;
            if (isAccepting) return "#10b981";
            if (isStart) return "#eab308";
            return "#3b82f6";
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

