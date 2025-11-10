"use client";

import { useState, FormEvent } from "react";
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

interface RegexFormProps {
  onResult: (data: {
    regex: string;
    dfa: DFAData | null;
    testResult: { string: string; accepted: boolean } | null;
    testResults?: { string: string; accepted: boolean }[] | null;
    error: string | null;
  }) => void;
}

export default function RegexForm({ onResult }: RegexFormProps) {
  const [regex, setRegex] = useState("");
  const [testString, setTestString] = useState("");
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useSweetAlert();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams({ regex });
      
      // Procesar múltiples cadenas de prueba separadas por comas
      if (testString) {
        const tests = testString.split(",").map(t => t.trim()).filter(t => t.length > 0);
        if (tests.length > 0) {
          if (tests.length === 1) {
            // Si hay solo una cadena, usar test para compatibilidad
            params.append("test", tests[0]);
          } else {
            // Si hay múltiples, usar tests
            params.append("tests", tests.join(","));
          }
        }
      }

      const response = await fetch(`/api/regex-to-dfa?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Si hay múltiples resultados, usar test_results; si no, usar test_result para compatibilidad
        const testResults = data.test_results && data.test_results.length > 0 
          ? data.test_results 
          : null;
        const testResult = testResults && testResults.length > 0
          ? testResults[0] // Para compatibilidad con componentes que esperan testResult
          : data.test_result;
        
        onResult({
          regex: regex,
          dfa: data.dfa,
          testResult: testResult,
          testResults: testResults,
          error: null,
        });
        
        // Mostrar resultados si hay múltiples cadenas (solo como confirmación, ya que se muestran en DFADetails)
        if (data.test_results && data.test_results.length > 1) {
          const acceptedCount = data.test_results.filter((r: { accepted: boolean }) => r.accepted).length;
          const rejectedCount = data.test_results.length - acceptedCount;
          showSuccess(
            "Resultados de las pruebas",
            `Se procesaron ${data.test_results.length} cadenas: ${acceptedCount} aceptadas, ${rejectedCount} rechazadas`
          );
        }
      } else {
        const errorMsg = data.error || "Error al procesar la expresión regular";
        await showError("Error al procesar", errorMsg);
        onResult({
          regex: regex,
          dfa: null,
          testResult: null,
          error: data.error,
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error de conexión";
      await showError("Error de conexión", errorMessage);
      onResult({
        regex: regex,
        dfa: null,
        testResult: null,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    { regex: "a*b", description: "Cero o más 'a' seguidas de 'b'" },
    { regex: "(a|b)*", description: "Cualquier combinación de 'a' y 'b'" },
    { regex: "a+b", description: "Una o más 'a' seguidas de 'b'" },
    { regex: "a?b", description: "Opcionalmente 'a' seguida de 'b'" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="regex"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Expresión Regular
          </label>
          <div className="relative">
            <input
              type="text"
              id="regex"
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              placeholder="Ej: a*b, (a|b)*, a+b"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono text-black placeholder:text-gray-400"
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded">
                Regex
              </kbd>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Soporta: <code className="bg-gray-100 px-1 rounded">*</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">+</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">?</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">|</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">.</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">()</code>,{" "}
            <code className="bg-gray-100 px-1 rounded">\</code>
          </p>
        </div>

        <div>
          <label
            htmlFor="test"
            className="block text-sm font-semibold text-gray-700 mb-2"
          >
            Probar Cadena (Opcional)
          </label>
          <input
            type="text"
            id="test"
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Ej: aaab,b,aaa (múltiples cadenas separadas por comas)"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono text-black placeholder:text-gray-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !regex}
          className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
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
              Procesando...
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Convertir a DFA
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Ejemplos rápidos:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {examples.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setRegex(example.regex)}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <code className="text-sm font-mono text-indigo-600 font-semibold">
                {example.regex}
              </code>
              <p className="text-xs text-gray-600 mt-1">
                {example.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

