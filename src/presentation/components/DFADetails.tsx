"use client";

import { useState } from "react";
import { useSweetAlert } from "../../utils/useSweetAlert";

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

interface TestResult {
  string: string;
  accepted: boolean;
}

interface DFADetailsProps {
  dfa: DFAData | null;
  testResult: TestResult | null;
  regex?: string;
}

export default function DFADetails({ dfa, testResult, regex }: DFADetailsProps) {
  const [downloading, setDownloading] = useState(false);
  const { showError, showSuccess } = useSweetAlert();

  const handleDownloadJFLAP = async () => {
    if (!regex) return;

    setDownloading(true);
    try {
      const response = await fetch(`/api/regex-to-dfa/jff/?regex=${encodeURIComponent(regex)}`);
      
      if (!response.ok) {
        let errorMessage = "Error al descargar el archivo JFLAP";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si no es JSON, usar el mensaje de estado
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Obtener el nombre del archivo del header Content-Disposition o generar uno
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = "dfa.jff";
      
      if (contentDisposition) {
        // Intentar obtener el nombre del archivo del formato filename*=UTF-8''...
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+)/i);
        if (utf8Match && utf8Match[1]) {
          fileName = decodeURIComponent(utf8Match[1]);
        } else {
          // Fallback al formato filename="..."
          const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = fileNameMatch[1].replace(/['"]/g, "");
          }
        }
      }

      // Crear un blob y descargarlo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess("Archivo descargado", "El archivo JFLAP se ha descargado exitosamente");
    } catch (error) {
      console.error("Error downloading JFLAP file:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al descargar el archivo";
      await showError("Error al descargar", errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  if (!dfa) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Detalles del DFA
        </h3>
        {regex && (
          <button
            onClick={handleDownloadJFLAP}
            disabled={downloading}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            title="Descargar DFA en formato JFLAP (.jff)"
          >
          {downloading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
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
              Descargando...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Descargar JFLAP
            </>
          )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-blue-900 mb-1">Alfabeto</p>
          <div className="flex flex-wrap gap-2">
            {dfa.alphabet.map((symbol) => (
              <span
                key={symbol}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-mono font-semibold"
              >
                {symbol}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm font-semibold text-purple-900 mb-1">
            Estados ({dfa.states.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {dfa.states.map((state) => (
              <span
                key={state}
                className={`px-3 py-1 rounded-full text-sm font-mono font-semibold ${
                  state === dfa.start
                    ? "bg-yellow-100 text-yellow-800"
                    : dfa.accepting.includes(state)
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {state}
                {state === dfa.start && " (inicio)"}
                {dfa.accepting.includes(state) && " ✓"}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Transiciones ({dfa.transitions.length})
        </p>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {dfa.transitions.map((transition, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-mono font-semibold text-sm">
                {transition.from}
              </span>
              <span className="text-gray-400">──</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded font-mono font-semibold text-sm">
                {transition.symbol}
              </span>
              <span className="text-gray-400">──</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-mono font-semibold text-sm">
                {transition.to}
              </span>
            </div>
          ))}
        </div>
      </div>

      {testResult && (
        <div
          className={`p-4 rounded-lg border-2 ${
            testResult.accepted
              ? "bg-green-50 border-green-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                testResult.accepted
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            >
              {testResult.accepted ? (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-800">
                Cadena: <code className="font-mono">{testResult.string}</code>
              </p>
              <p
                className={`text-sm font-medium ${
                  testResult.accepted ? "text-green-700" : "text-red-700"
                }`}
              >
                {testResult.accepted
                  ? "✓ Cadena aceptada"
                  : "✗ Cadena rechazada"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

