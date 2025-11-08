"use client";

import { useEffect, useRef, useState } from "react";

// Tipos globales para D3 y dagre-d3
declare global {
  interface Window {
    d3: any;
    dagreD3: any;
  }
}

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

interface DFAVisualizerD3Props {
  dfa: DFAData | null;
}

export default function DFAVisualizerD3({ dfa }: DFAVisualizerD3Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [libsLoaded, setLibsLoaded] = useState(false);

  // Asegurar que solo se renderice en el cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Verificar que las librerías estén cargadas
  useEffect(() => {
    if (!isMounted) return;

    const checkLibs = () => {
      if (typeof window !== "undefined" && window.d3 && window.dagreD3) {
        setLibsLoaded(true);
      } else {
        setTimeout(checkLibs, 100);
      }
    };

    checkLibs();
  }, [isMounted]);

  useEffect(() => {
    if (!dfa || !svgRef.current || !containerRef.current || !libsLoaded || !isMounted) {
      return;
    }

    // Limpiar función para evitar memory leaks
    let isCancelled = false;

    function renderGraph() {
      if (
        isCancelled ||
        typeof window === "undefined" ||
        !window.d3 ||
        !window.dagreD3 ||
        !svgRef.current ||
        !containerRef.current ||
        !dfa
      ) {
        return;
      }

      const d3 = window.dagreD3.d3 || window.d3;
      
      // Limpiar SVG anterior
      d3.select(svgRef.current).selectAll("*").remove();

      const svg = d3.select(svgRef.current);
      const inner = svg.append("g");
      const container = containerRef.current;

      const g = new window.dagreD3.graphlib.Graph().setGraph({
        rankdir: "LR",
        nodesep: 50,
        ranksep: 80,
        marginx: 50,
        marginy: 50,
      });

      // Crear nodo inicial invisible
      g.setNode("__start__", {
        shape: "circle",
        label: "",
        style: "fill: none; stroke: none;",
        width: 1,
        height: 1,
      });

      // Agregar nodos
      dfa.states.forEach((stateId) => {
        const isAccepting = dfa.accepting.includes(stateId);
        const shape = isAccepting ? "accept" : "normal";

        g.setNode(stateId, {
          shape: shape,
          label: stateId,
          style: "fill: white; stroke: #333; stroke-width: 2px;",
          labelStyle: "font-size: 14px; font-weight: bold;",
        });
      });

      // Agregar flecha al estado inicial
      g.setEdge("__start__", dfa.start, {
        label: "",
        style: "stroke: #f59e0b; stroke-width: 3px; fill: none;",
        arrowhead: "vee",
        arrowheadStyle: "fill: #f59e0b; stroke: #f59e0b;",
      });

      // Agregar transiciones
      const transitionMap = new Map<string, Map<string, string[]>>();

      dfa.transitions.forEach((transition) => {
        if (!transitionMap.has(transition.from)) {
          transitionMap.set(transition.from, new Map());
        }
        const fromMap = transitionMap.get(transition.from)!;
        if (!fromMap.has(transition.to)) {
          fromMap.set(transition.to, []);
        }
        fromMap.get(transition.to)!.push(transition.symbol);
      });

      transitionMap.forEach((toMap, from) => {
        toMap.forEach((symbols, to) => {
          const labelText = symbols.sort().join(", ");
          const edgeId = `${from}-${to}`;
          
          // Verificar si el edge ya existe (para self-loops o múltiples símbolos)
          const existingEdge = g.edge(from, to);
          if (existingEdge) {
            // Si ya existe, combinar las etiquetas
            const existingLabel = existingEdge.label || "";
            g.setEdge(from, to, {
              label: existingLabel ? `${existingLabel}, ${labelText}` : labelText,
              style: "stroke: #6366f1; stroke-width: 2.5px; fill: none;",
              arrowhead: "vee",
              arrowheadStyle: "fill: #6366f1; stroke: #6366f1;",
              labelStyle: "font-size: 12px; font-weight: bold; font-family: monospace;",
            });
          } else {
            g.setEdge(from, to, {
              label: labelText,
              style: "stroke: #6366f1; stroke-width: 2.5px; fill: none;",
              arrowhead: "vee",
              arrowheadStyle: "fill: #6366f1; stroke: #6366f1;",
              labelStyle: "font-size: 12px; font-weight: bold; font-family: monospace;",
            });
          }
        });
      });

      // Configurar formas personalizadas
      const render = new window.dagreD3.render();

      // Forma para nodo normal (círculo)
      render.shapes().normal = function (parent: any, bbox: any, node: any) {
        const w = bbox.width;
        const h = bbox.height;
        const rx = Math.min(w / 2, h / 2);
        const ry = rx;
        const point = { x: w / 2, y: h / 2 };

        const shapeSvg = parent
          .insert("ellipse", ":first-child")
          .attr("cx", point.x)
          .attr("cy", point.y)
          .attr("rx", rx)
          .attr("ry", ry)
          .attr("fill", "white")
          .attr("stroke", "#3b82f6")
          .attr("stroke-width", "2.5px")
          .attr("transform", `translate(${-w / 2}, ${-h / 2})`);

        node.intersect = function (point: any) {
          return window.dagreD3.intersect.ellipse(node, rx, ry, point);
        };
        return shapeSvg;
      };

      // Forma para nodo de aceptación (doble círculo)
      render.shapes().accept = function (parent: any, bbox: any, node: any) {
        const w = bbox.width;
        const h = bbox.height;
        const rx = Math.min(w / 2, h / 2);
        const ry = rx;
        const point = { x: w / 2, y: h / 2 };

        // Círculo exterior
        const outerCircle = parent
          .insert("ellipse", ":first-child")
          .attr("cx", point.x)
          .attr("cy", point.y)
          .attr("rx", rx)
          .attr("ry", ry)
          .attr("fill", "white")
          .attr("stroke", "#10b981")
          .attr("stroke-width", "2.5px")
          .attr("transform", `translate(${-w / 2}, ${-h / 2})`);

        // Círculo interior
        const innerCircle = parent
          .insert("ellipse", ":first-child")
          .attr("cx", point.x)
          .attr("cy", point.y)
          .attr("rx", rx - 4)
          .attr("ry", ry - 4)
          .attr("fill", "white")
          .attr("stroke", "#10b981")
          .attr("stroke-width", "2.5px")
          .attr("transform", `translate(${-w / 2}, ${-h / 2})`);

        node.intersect = function (point: any) {
          return window.dagreD3.intersect.ellipse(node, rx, ry, point);
        };
        return outerCircle;
      };

      // Forma para el nodo inicial invisible
      render.shapes().circle = function (parent: any, bbox: any, node: any) {
        const w = bbox.width;
        const h = bbox.height;
        const r = Math.min(w, h) / 2;
        const point = { x: w / 2, y: h / 2 };

        const shapeSvg = parent
          .insert("circle", ":first-child")
          .attr("cx", point.x)
          .attr("cy", point.y)
          .attr("r", r)
          .attr("fill", "none")
          .attr("stroke", "none")
          .attr("transform", `translate(${-w / 2}, ${-h / 2})`);

        node.intersect = function (point: any) {
          return window.dagreD3.intersect.circle(node, r, point);
        };
        return shapeSvg;
      };

      // Renderizar el grafo
      render(inner, g);

      // Obtener dimensiones del grafo
      const graphWidth = g.graph().width;
      const graphHeight = g.graph().height;

      // Ajustar tamaño del SVG
      const containerWidth = container.clientWidth;
      const containerHeight = Math.max(600, graphHeight + 100);

      svg.attr("width", containerWidth).attr("height", containerHeight);

      // Centrar el grafo
      const xOffset = (containerWidth - graphWidth) / 2;
      const yOffset = (containerHeight - graphHeight) / 2;
      const initialScale = Math.min(0.9, containerWidth / graphWidth);

      // Aplicar transformación inicial
      inner.attr(
        "transform",
        `translate(${xOffset}, ${yOffset}) scale(${initialScale})`
      );

      // Configurar zoom (D3 v5)
      // En D3 v5, d3.event está disponible como propiedad global dentro del callback
      const zoom = d3.zoom().scaleExtent([0.1, 3]);
      
      // Handler de zoom usando función tradicional para acceder a d3.event
      // En D3 v5, d3.event está disponible globalmente dentro del callback
      zoom.on("zoom", function() {
        try {
          // En D3 v5, el evento está en d3.event (propiedad global)
          // Necesitamos acceder al objeto d3 correcto
          const d3Global = window.dagreD3?.d3 || window.d3 || d3;
          
          // En D3 v5, d3.event está disponible directamente
          if (d3Global) {
            // Acceder a d3.event desde el objeto d3
            const eventObj = (d3Global as any);
            if (eventObj.event && eventObj.event.transform) {
              inner.attr("transform", eventObj.event.transform);
              return;
            }
          }
          
          // Fallback: usar zoomTransform si está disponible
          const zoomTransformFn = d3.zoomTransform || (d3 as any).zoomTransform;
          if (zoomTransformFn) {
            try {
              const transform = zoomTransformFn(svg.node());
              if (transform) {
                inner.attr("transform", transform.toString());
                return;
              }
            } catch (e) {
              // Continuar con el siguiente fallback
            }
          }
          
          // Último fallback: leer desde el nodo SVG (no recomendado pero funciona)
          const svgNode = svg.node() as any;
          if (svgNode && svgNode.__zoom) {
            const zoomData = svgNode.__zoom;
            inner.attr("transform", `translate(${zoomData.x || 0},${zoomData.y || 0}) scale(${zoomData.k || 1})`);
          }
        } catch (err) {
          // Si todo falla, al menos el gráfico seguirá visible
          // No mostrar errores en producción para evitar problemas
        }
      });

      svg.call(zoom);
      
      // Aplicar transformación inicial si zoomIdentity está disponible
      try {
        const zoomIdentity = d3.zoomIdentity || (d3 as any).zoomIdentity;
        if (zoomIdentity) {
          const initialTransform = zoomIdentity
            .translate(xOffset, yOffset)
            .scale(initialScale);
          svg.call((zoom as any).transform, initialTransform);
        }
      } catch (error) {
        // La transformación inicial ya está aplicada directamente arriba
        // Si falla, el gráfico seguirá visible con la transformación manual
        // No mostrar errores en producción
      }
    }

    renderGraph();

    // Cleanup function
    return () => {
      isCancelled = true;
      if (svgRef.current) {
        const d3 = window.dagreD3?.d3 || window.d3;
        if (d3) {
          d3.select(svgRef.current).selectAll("*").remove();
        }
      }
    };
  }, [dfa, libsLoaded, isMounted]);

  // No renderizar nada hasta que esté montado (evitar problemas de hidratación)
  if (!isMounted) {
    return (
      <div
        className="w-full h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
        suppressHydrationWarning
      >
        <div className="text-center text-gray-500">
          <p className="text-sm font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // Mostrar placeholder durante la carga de librerías o si no hay DFA
  if (!libsLoaded || !dfa) {
    return (
      <div
        className="w-full h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
        suppressHydrationWarning
      >
        <div className="text-center text-gray-500">
          {!libsLoaded ? (
            <>
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg
                  className="animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <p className="mt-2 text-sm font-medium">Cargando visualizador...</p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[600px] border-2 border-gray-200 rounded-lg bg-white shadow-lg overflow-hidden"
    >
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
}

