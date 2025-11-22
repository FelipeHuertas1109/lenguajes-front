"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import RegexForm, { RegexFormRef } from "@/src/presentation/components/RegexForm";
import TransitionsForm, { TransitionsFormRef } from "@/src/presentation/components/TransitionsForm";
import AlphabetPredictor, { AlphabetPredictorRef } from "@/src/presentation/components/AlphabetPredictor";
import RegexSearch, { RegexSearchRef } from "@/src/presentation/components/RegexSearch";
import DFADetails from "@/src/presentation/components/DFADetails";
import RegexFileProcessor from "@/src/presentation/components/RegexFileProcessor";

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

type InputType = "regex" | "transitions";
type RegexViewType = "dfa" | "alphabet" | "search";

interface AlphabetResponse {
  success: boolean;
  regex: string;
  alphabet: string[] | null;
  probabilities: { [symbol: string]: number } | null;
  error: string | null;
}

interface SearchResponse {
  success: boolean;
  query: string | null;
  id: number | null;
  results: Array<{ id: number; regex: string }>;
  total: number;
  limit: number;
  error: string | null;
}

export default function Home() {
  const [inputType, setInputType] = useState<InputType>("regex");
  const [regexViewType, setRegexViewType] = useState<RegexViewType>("dfa");
  const [dfa, setDfa] = useState<DFAData | null>(null);
  const [regex, setRegex] = useState<string>("");
  const [testResult, setTestResult] = useState<{
    string: string;
    accepted: boolean;
  } | null>(null);
  const [testResults, setTestResults] = useState<{
    string: string;
    accepted: boolean;
  }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alphabetResult, setAlphabetResult] = useState<AlphabetResponse | null>(null);
  
  // Referencias a los formularios
  const regexFormRef = useRef<RegexFormRef>(null);
  const transitionsFormRef = useRef<TransitionsFormRef>(null);
  const alphabetPredictorRef = useRef<AlphabetPredictorRef>(null);
  const regexSearchRef = useRef<RegexSearchRef>(null);
  
  // Estado para resultados de búsqueda
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  
  // Estado para predicción de AcepNet
  interface AcepNetPrediction {
    success: boolean;
    dfa_id: number;
    afd_info: {
      id: number;
      regex: string;
      alphabet: string;
      states: string;
      accepting: string;
    } | null;
    predictions: Array<{
      string: string;
      y1: {
        probability: number;
        predicted: boolean;
        ground_truth: boolean | null;
        correct: boolean | null;
        alphabet_mismatch: boolean;
      };
      y2: {
        probability: number;
        predicted: boolean;
      };
    }>;
    error: string | null;
  }
  const [acepNetPrediction, setAcepNetPrediction] = useState<AcepNetPrediction | null>(null);
  const [selectedDfaId, setSelectedDfaId] = useState<number | null>(null);
  const [predictionStrings, setPredictionStrings] = useState<string>("");
  const [predicting, setPredicting] = useState(false);

  const handleAcepNetPredict = async (dfaId: number, strings: string[]) => {
    if (strings.length === 0) {
      return;
    }

    setPredicting(true);
    setAcepNetPrediction(null);

    try {
      const response = await fetch("/api/acepnet-predict/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dfa_id: dfaId,
          strings: strings,
        }),
      });

      const data: AcepNetPrediction = await response.json();
      setAcepNetPrediction(data);
    } catch (error) {
      console.error("Error predicting with AcepNet:", error);
      setAcepNetPrediction({
        success: false,
        dfa_id: dfaId,
        afd_info: null,
        predictions: [],
        error: error instanceof Error ? error.message : "Error de conexión",
      });
    } finally {
      setPredicting(false);
    }
  };

  const handleRegexResult = (data: {
    regex: string;
    dfa: DFAData | null;
    testResult: { string: string; accepted: boolean } | null;
    testResults?: { string: string; accepted: boolean }[] | null;
    error: string | null;
  }) => {
    setDfa(data.dfa);
    setRegex(data.regex);
    setTestResult(data.testResult);
    setTestResults(data.testResults || null);
    setError(data.error);
  };

  const handleTransitionsResult = (data: {
    dfa: DFAData | null;
    testResult: { string: string; accepted: boolean } | null;
    testResults?: { string: string; accepted: boolean }[] | null;
    error: string | null;
  }) => {
    setDfa(data.dfa);
    setRegex(""); // No hay regex cuando se usan transiciones
    setTestResult(data.testResult);
    setTestResults(data.testResults || null);
    setError(data.error);
    setAlphabetResult(null); // Limpiar resultado de alfabeto
  };

  const handleAlphabetResult = (data: AlphabetResponse) => {
    setAlphabetResult(data);
    // Limpiar datos de DFA cuando se predice alfabeto
    setDfa(null);
    setTestResult(null);
    setTestResults(null);
    setError(data.error);
    setSearchResult(null); // Limpiar resultados de búsqueda
    setAcepNetPrediction(null);
    setSelectedDfaId(null);
    setPredictionStrings("");
  };

  const handleSearchResult = (data: SearchResponse) => {
    setSearchResult(data);
    // Limpiar otros resultados cuando se busca
    setDfa(null);
    setAlphabetResult(null);
    setTestResult(null);
    setTestResults(null);
    setError(data.error);
  };

  // Función para copiar datos del DFA al formulario de transiciones
  const handleCopyToTransitions = (data: {
    states: string[];
    start: string;
    accepting: string[];
    transitions: Array<{ from: string; symbol: string; to: string }>;
  }) => {
    // Cambiar al formulario de transiciones primero
    setInputType("transitions");
    // Usar requestAnimationFrame para asegurar que el DOM se haya actualizado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (transitionsFormRef.current) {
          transitionsFormRef.current.setFormData(data);
        }
      });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            DFA Converter
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Convierte expresiones regulares o transiciones en autómatas finitos deterministas
            (DFA) y visualízalos gráficamente. También predice el alfabeto de expresiones regulares
            usando aprendizaje profundo. Usa el algoritmo de Thompson y construcción de subconjuntos.
          </p>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-1">
            {/* Selector de tipo de entrada */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Tipo de Entrada
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputType("regex");
                    // Solo limpiar los resultados, no el estado de los formularios
                    setDfa(null);
                    setRegex("");
                    setTestResult(null);
                    setTestResults(null);
                    setError(null);
                    setAlphabetResult(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    inputType === "regex"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  Expresión Regular
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputType("transitions");
                    // Solo limpiar los resultados, no el estado de los formularios
                    setDfa(null);
                    setRegex("");
                    setTestResult(null);
                    setTestResults(null);
                    setError(null);
                    setAlphabetResult(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    inputType === "transitions"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  Transiciones
                </button>
              </div>
            </div>

            {/* Selector de vista para Expresión Regular */}
            {inputType === "regex" && (
              <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Vista
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegexViewType("dfa");
                      setDfa(null);
                      setTestResult(null);
                      setTestResults(null);
                    setError(null);
                    setAlphabetResult(null);
                    setSearchResult(null);
                    setAcepNetPrediction(null);
                    setSelectedDfaId(null);
                    setPredictionStrings("");
                  }}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                      regexViewType === "dfa"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    Convertir a DFA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegexViewType("alphabet");
                      setDfa(null);
                      setTestResult(null);
                      setTestResults(null);
                    setError(null);
                    setAlphabetResult(null);
                    setSearchResult(null);
                    setAcepNetPrediction(null);
                    setSelectedDfaId(null);
                    setPredictionStrings("");
                  }}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                      regexViewType === "alphabet"
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    Predecir Alfabeto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegexViewType("search");
                      setDfa(null);
                      setTestResult(null);
                      setTestResults(null);
                    setError(null);
                    setAlphabetResult(null);
                    setSearchResult(null);
                    setAcepNetPrediction(null);
                    setSelectedDfaId(null);
                    setPredictionStrings("");
                  }}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                      regexViewType === "search"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    Buscar Regex
                  </button>
                </div>
              </div>
            )}
            
            {/* Formulario correspondiente - Renderizar ambos pero ocultar el inactivo para preservar estado */}
            {inputType === "regex" && regexViewType === "dfa" && (
              <div>
                <RegexForm ref={regexFormRef} onResult={handleRegexResult} />
              </div>
            )}
            {inputType === "regex" && regexViewType === "alphabet" && (
              <div>
                <AlphabetPredictor ref={alphabetPredictorRef} onResult={handleAlphabetResult} />
              </div>
            )}
            {inputType === "regex" && regexViewType === "search" && (
              <div>
                <RegexSearch ref={regexSearchRef} onResult={handleSearchResult} />
              </div>
            )}
            {inputType === "transitions" && (
              <div>
                <TransitionsForm 
                  ref={transitionsFormRef} 
                  onResult={handleTransitionsResult}
                />
              </div>
            )}
          </div>

          {/* Right Column - Visualization */}
          <div className="lg:col-span-2">
            {/* Visualización de Búsqueda - solo mostrar cuando es vista de búsqueda */}
            {inputType === "regex" && regexViewType === "search" && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 min-h-[600px]">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Resultados de Búsqueda
                </h2>
                {searchResult && searchResult.success && searchResult.results.length > 0 ? (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Total encontrados:</strong> {searchResult.total}
                        {searchResult.total > searchResult.limit && (
                          <span className="ml-2">
                            (mostrando {searchResult.limit} de {searchResult.total})
                          </span>
                        )}
                      </p>
                      {searchResult.query && (
                        <p className="text-sm text-blue-700 mt-1">
                          <strong>Búsqueda:</strong> "{searchResult.query}"
                        </p>
                      )}
                      {searchResult.id !== null && (
                        <p className="text-sm text-blue-700 mt-1">
                          <strong>ID buscado:</strong> {searchResult.id}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {searchResult.results.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-600">
                              ID: {item.id}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedDfaId(item.id);
                                  setPredictionStrings("");
                                  setAcepNetPrediction(null);
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
                              >
                                Predecir con AcepNet
                              </button>
                              <button
                                onClick={() => {
                                  // Copiar regex al formulario de regex
                                  setInputType("regex");
                                  setRegexViewType("dfa");
                                  setRegex(item.regex);
                                  // Usar requestAnimationFrame para asegurar que el componente esté montado
                                  requestAnimationFrame(() => {
                                    if (regexFormRef.current) {
                                      regexFormRef.current.setRegex(item.regex);
                                    }
                                  });
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition-colors"
                              >
                                Usar esta regex
                              </button>
                            </div>
                          </div>
                          <code className="text-base font-mono text-gray-900 block break-all bg-white p-3 rounded border border-gray-300">
                            {item.regex}
                          </code>
                        </div>
                      ))}
                    </div>

                    {/* Sección de Predicción con AcepNet */}
                    {selectedDfaId !== null && (
                      <div className="mt-6 pt-6 border-t-2 border-green-300">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <svg
                            className="w-6 h-6 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Predicción con AcepNet
                        </h3>
                        
                        {selectedDfaId !== null && (
                          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-semibold text-blue-800 mb-2">
                              AFD ID: {selectedDfaId}
                            </p>
                            {searchResult && (
                              <>
                                {searchResult.results.find((r) => r.id === selectedDfaId) && (
                                  <>
                                    <p className="text-sm text-blue-700">
                                      <strong>Regex:</strong>{" "}
                                      <code className="font-mono">
                                        {searchResult.results.find((r) => r.id === selectedDfaId)
                                          ?.regex}
                                      </code>
                                    </p>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {acepNetPrediction?.afd_info && (
                          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-semibold text-green-800 mb-2">
                              AFD ID: {acepNetPrediction.afd_info.id}
                            </p>
                            <p className="text-sm text-green-700">
                              <strong>Regex:</strong>{" "}
                              <code className="font-mono">{acepNetPrediction.afd_info.regex}</code>
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              <strong>Alfabeto:</strong> {acepNetPrediction.afd_info.alphabet}
                            </p>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Cadenas a evaluar (separadas por comas)
                            </label>
                            <textarea
                              value={predictionStrings}
                              onChange={(e) => setPredictionStrings(e.target.value)}
                              placeholder="Ej: C, LC, LCIG, X"
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base font-mono text-black placeholder:text-gray-400"
                              rows={3}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                              Ingresa las cadenas que deseas evaluar, separadas por comas
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              const strings = predictionStrings
                                .split(",")
                                .map((s) => s.trim())
                                .filter((s) => s.length > 0);
                              if (strings.length > 0 && selectedDfaId !== null) {
                                handleAcepNetPredict(selectedDfaId, strings);
                              }
                            }}
                            disabled={predicting || !predictionStrings.trim() || selectedDfaId === null}
                            className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                          >
                            {predicting ? (
                              <>
                                <svg
                                  className="animate-spin h-5 w-5 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Prediciendo...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Predecir con AcepNet
                              </>
                            )}
                          </button>
                        </div>

                        {/* Resultados de Predicción */}
                        {acepNetPrediction && acepNetPrediction.success && acepNetPrediction.predictions.length > 0 && (
                          <div className="mt-6 space-y-4">
                            <h4 className="text-lg font-semibold text-gray-900">
                              Resultados de Predicción
                            </h4>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {acepNetPrediction.predictions.map((pred, index) => (
                                <div
                                  key={index}
                                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <code className="text-base font-mono font-bold text-gray-900">
                                      "{pred.string}"
                                    </code>
                                    <div className="flex items-center gap-2">
                                      {pred.y1.correct !== null && (
                                        <span
                                          className={`px-2 py-1 text-xs font-semibold rounded ${
                                            pred.y1.correct
                                              ? "bg-green-100 text-green-800"
                                              : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {pred.y1.correct ? "✓ Correcto" : "✗ Incorrecto"}
                                        </span>
                                      )}
                                      {pred.y1.predicted ? (
                                        <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded">
                                          ACEPTA
                                        </span>
                                      ) : (
                                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded">
                                          RECHAZA
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-700">
                                          Y1 (Pertenencia): {(pred.y1.probability * 100).toFixed(2)}%
                                        </span>
                                        {pred.y1.ground_truth !== null && (
                                          <span className="text-xs text-gray-500">
                                            GT: {pred.y1.ground_truth ? "ACEPTA" : "RECHAZA"}
                                          </span>
                                        )}
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${
                                            pred.y1.predicted ? "bg-green-600" : "bg-red-600"
                                          }`}
                                          style={{ width: `${pred.y1.probability * 100}%` }}
                                        ></div>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-700">
                                          Y2 (Cadena Compartida): {(pred.y2.probability * 100).toFixed(2)}%
                                        </span>
                                        {pred.y2.predicted && (
                                          <span className="text-xs text-green-600 font-semibold">
                                            Compartida
                                          </span>
                                        )}
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${
                                            pred.y2.predicted ? "bg-blue-600" : "bg-gray-400"
                                          }`}
                                          style={{ width: `${pred.y2.probability * 100}%` }}
                                        ></div>
                                      </div>
                                    </div>

                                    {pred.y1.alphabet_mismatch && (
                                      <p className="text-xs text-orange-600 font-semibold mt-2">
                                        ⚠ La cadena contiene caracteres fuera del alfabeto del AFD
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {acepNetPrediction && !acepNetPrediction.success && acepNetPrediction.error && (
                          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-semibold text-red-800 mb-1">Error</p>
                            <p className="text-sm text-red-600">{acepNetPrediction.error}</p>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setSelectedDfaId(null);
                            setPredictionStrings("");
                            setAcepNetPrediction(null);
                          }}
                          className="mt-4 w-full py-2 px-4 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cerrar Predicción
                        </button>
                      </div>
                    )}
                  </div>
                ) : searchResult && !searchResult.success ? (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="text-center text-gray-500">
                      <svg
                        className="mx-auto h-16 w-16 text-red-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-lg font-medium text-red-600 mb-2">
                        Error en la búsqueda
                      </p>
                      <p className="text-sm text-gray-600">{searchResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="text-center text-gray-500">
                      <svg
                        className="mx-auto h-16 w-16 text-gray-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <p className="text-lg font-medium">
                        Busca expresiones regulares en el dataset
                      </p>
                      <p className="text-sm mt-2">
                        Puedes buscar por texto o por ID (0-5999)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Visualización de DFA - solo mostrar cuando no es vista de alfabeto ni búsqueda */}
            {!(inputType === "regex" && (regexViewType === "alphabet" || regexViewType === "search")) && (
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
            )}
            
            {/* Visualización de Alfabeto - solo mostrar cuando es vista de alfabeto */}
            {inputType === "regex" && regexViewType === "alphabet" && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 min-h-[600px]">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Predicción de Alfabeto
                </h2>
                {alphabetResult && alphabetResult.success && alphabetResult.alphabet ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Alfabeto Predicho
                      </h3>
                      <div className="flex flex-wrap gap-3 mb-4">
                        {alphabetResult.alphabet.map((symbol) => (
                          <span
                            key={symbol}
                            className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold text-lg border-2 border-purple-300"
                          >
                            {symbol}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">
                        Se predijeron <strong>{alphabetResult.alphabet.length}</strong> símbolos en el alfabeto
                      </p>
                    </div>

                    {alphabetResult.probabilities && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          Probabilidades por Símbolo
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {Object.entries(alphabetResult.probabilities)
                            .sort(([, a], [, b]) => b - a)
                            .map(([symbol, prob]) => {
                              const isInAlphabet = alphabetResult.alphabet?.includes(symbol) || false;
                              return (
                                <div
                                  key={symbol}
                                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-lg text-gray-900">
                                        {symbol}
                                      </span>
                                      {isInAlphabet && (
                                        <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">
                                          EN ALFABETO
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-lg font-bold text-gray-700">
                                      {(prob * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                      className={`h-3 rounded-full transition-all ${
                                        isInAlphabet
                                          ? "bg-purple-600"
                                          : "bg-gray-400"
                                      }`}
                                      style={{ width: `${prob * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {alphabetResult.regex && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <strong>Expresión regular:</strong>{" "}
                          <code className="px-2 py-1 bg-gray-100 rounded font-mono">
                            {alphabetResult.regex}
                          </code>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[400px]">
                    <div className="text-center text-gray-500">
                      <svg
                        className="mx-auto h-16 w-16 text-gray-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      <p className="text-lg font-medium">
                        Ingresa una expresión regular para predecir su alfabeto
                      </p>
                      <p className="text-sm mt-2">
                        El modelo de aprendizaje profundo analizará la expresión y predirá qué símbolos pertenecen al alfabeto
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Details Section - Solo mostrar para DFA, no para alfabeto */}
        {(dfa || error) && !(inputType === "regex" && regexViewType === "alphabet") && (
          <div className="mb-6">
            <DFADetails 
              dfa={dfa} 
              testResult={testResult} 
              testResults={testResults} 
              regex={regex}
              onCopyToTransitions={handleCopyToTransitions}
            />
          </div>
        )}

        {/* File Processor Section */}
        <div className="mb-6 border-t border-gray-200 pt-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Procesamiento por Lotes
            </h2>
            <p className="text-gray-600">
              Procesa múltiples expresiones regulares desde un archivo y genera un dataset CSV completo
            </p>
          </div>
          <RegexFileProcessor />
        </div>

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
