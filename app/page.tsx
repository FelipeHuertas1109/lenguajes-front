"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import RegexForm from "@/src/presentation/components/RegexForm";
import DFADetails from "@/src/presentation/components/DFADetails";

// Cargar DFAVisualizerD3 solo en el cliente para evitar problemas de hidratación
const DFAVisualizerD3 = dynamic(
  () => import("@/src/presentation/components/DFAVisualizerD3"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
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
        </div>
      </div>
    ),
  }
);

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

export default function Home() {
  const [dfa, setDfa] = useState<DFAData | null>(null);
  const [regex, setRegex] = useState<string>("");
  const [testResult, setTestResult] = useState<{
    string: string;
    accepted: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResult = (data: {
    regex: string;
    dfa: DFAData | null;
    testResult: { string: string; accepted: boolean } | null;
    error: string | null;
  }) => {
    setDfa(data.dfa);
    setRegex(data.regex);
    setTestResult(data.testResult);
    setError(data.error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Regex to DFA Converter
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Convierte expresiones regulares en autómatas finitos deterministas
            (DFA) y visualízalos gráficamente. Usa el algoritmo de Thompson y
            construcción de subconjuntos.
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-1">
            <RegexForm onResult={handleResult} />
          </div>

          {/* Right Column - Visualization */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Visualización del DFA
              </h2>
              <DFAVisualizerD3 dfa={dfa} />
            </div>
          </div>
        </div>

        {/* Details Section */}
        {(dfa || error) && (
          <div className="mb-6">
            <DFADetails dfa={dfa} testResult={testResult} regex={regex} />
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 mt-12 pb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="font-medium text-gray-700">
              Desarrollado con Next.js, React Flow y Arquitectura Limpia
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Algoritmo de Thompson + Construcción de Subconjuntos
          </p>
        </footer>
      </div>
    </div>
  );
}
