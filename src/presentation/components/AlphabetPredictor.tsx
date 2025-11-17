"use client";

import { useState, FormEvent, forwardRef, useImperativeHandle } from "react";
import { useSweetAlert } from "../../utils/useSweetAlert";

interface AlphabetResponse {
  success: boolean;
  regex: string;
  alphabet: string[] | null;
  probabilities: { [symbol: string]: number } | null;
  error: string | null;
}

interface AlphabetPredictorProps {
  onResult: (data: AlphabetResponse) => void;
}

export interface AlphabetPredictorRef {
  clearForm: () => void;
}

const AlphabetPredictor = forwardRef<AlphabetPredictorRef, AlphabetPredictorProps>(
  ({ onResult }, ref) => {
    const [regex, setRegex] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AlphabetResponse | null>(null);
    const { showError, showSuccess } = useSweetAlert();

    // Función para limpiar el formulario
    const clearForm = () => {
      setRegex("");
      setResult(null);
    };

    // Exponer métodos al componente padre mediante ref
    useImperativeHandle(ref, () => ({
      clearForm,
    }));

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      
      if (!regex.trim()) {
        await showError("Error de validación", "Por favor ingresa una expresión regular");
        return;
      }

      setLoading(true);
      setResult(null);

      try {
        const response = await fetch("/api/regex-to-alphabet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ regex: regex.trim() }),
        });

        const data: AlphabetResponse = await response.json();

        if (data.success && data.alphabet) {
          setResult(data);
          onResult(data);
          await showSuccess(
            "Alfabeto predicho",
            `Se encontraron ${data.alphabet.length} símbolos en el alfabeto: ${data.alphabet.join(", ")}`
          );
        } else {
          const errorMsg = data.error || "Error al predecir el alfabeto";
          await showError("Error al predecir", errorMsg);
          setResult(data);
          onResult(data);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error de conexión";
        await showError("Error de conexión", errorMessage);
        const errorResponse: AlphabetResponse = {
          success: false,
          regex: regex,
          alphabet: null,
          probabilities: null,
          error: errorMessage,
        };
        setResult(errorResponse);
        onResult(errorResponse);
      } finally {
        setLoading(false);
      }
    };

    const examples = [
      { regex: "A*B", description: "Cero o más 'A' seguidas de 'B'" },
      { regex: "(A|B)*", description: "Cualquier combinación de 'A' y 'B'" },
      { regex: "A+B", description: "Una o más 'A' seguidas de 'B'" },
      { regex: "A?B", description: "Opcionalmente 'A' seguida de 'B'" },
    ];

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="regex-alphabet"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Expresión Regular
            </label>
            <div className="relative">
              <input
                type="text"
                id="regex-alphabet"
                value={regex}
                onChange={(e) => setRegex(e.target.value.toUpperCase())}
                placeholder="Ej: A*B, (A|B)*, A+B"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono text-black placeholder:text-gray-400 uppercase"
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

          <button
            type="submit"
            disabled={loading || !regex.trim()}
            className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                Predecir Alfabeto
              </>
            )}
          </button>
        </form>

        {/* Resultados */}
        {result && result.success && result.alphabet && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Alfabeto Predicho
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.alphabet.map((symbol) => (
                  <span
                    key={symbol}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg font-semibold text-sm"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
              {result.alphabet.length === 0 && (
                <p className="text-sm text-gray-500">
                  No se predijo ningún símbolo en el alfabeto
                </p>
              )}
            </div>

            {result.probabilities && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                  Ver probabilidades por símbolo
                </summary>
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(result.probabilities)
                    .sort(([, a], [, b]) => b - a)
                    .map(([symbol, prob]) => {
                      const isInAlphabet = result.alphabet?.includes(symbol) || false;
                      return (
                        <div
                          key={symbol}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-gray-900">
                              {symbol}
                            </span>
                            {isInAlphabet && (
                              <span className="text-xs text-purple-600 font-semibold">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  isInAlphabet
                                    ? "bg-purple-600"
                                    : "bg-gray-400"
                                }`}
                                style={{ width: `${prob * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                              {(prob * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Error */}
        {result && !result.success && result.error && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-1">
                Error
              </p>
              <p className="text-sm text-red-600">{result.error}</p>
            </div>
          </div>
        )}

        {/* Ejemplos */}
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
                <code className="text-sm font-mono text-purple-600 font-semibold">
                  {example.regex}
                </code>
                <p className="text-xs text-gray-600 mt-1">
                  {example.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Botón Limpiar Todo */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={clearForm}
            className="w-full py-2 px-4 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors flex items-center justify-center gap-2"
          >
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Limpiar Todo
          </button>
        </div>
      </div>
    );
  }
);

AlphabetPredictor.displayName = "AlphabetPredictor";

export default AlphabetPredictor;

