"use client";

import { useState, FormEvent, forwardRef, useImperativeHandle } from "react";
import { useSweetAlert } from "../../utils/useSweetAlert";

interface SearchResult {
  id: number;
  regex: string;
}

interface SearchResponse {
  success: boolean;
  query: string | null;
  id: number | null;
  results: SearchResult[];
  total: number;
  limit: number;
  error: string | null;
}

interface RegexSearchProps {
  onResult: (data: SearchResponse) => void;
}

export interface RegexSearchRef {
  clearForm: () => void;
}

const RegexSearch = forwardRef<RegexSearchRef, RegexSearchProps>(
  ({ onResult }, ref) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchId, setSearchId] = useState("");
    const [limit, setLimit] = useState("50");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchResponse | null>(null);
    const [searchType, setSearchType] = useState<"query" | "id">("query");
    const { showError, showSuccess } = useSweetAlert();

    // Función para limpiar el formulario
    const clearForm = () => {
      setSearchQuery("");
      setSearchId("");
      setLimit("50");
      setResult(null);
      setSearchType("query");
    };

    // Exponer métodos al componente padre mediante ref
    useImperativeHandle(ref, () => ({
      clearForm,
    }));

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      
      // Validar que al menos uno de los parámetros esté presente
      if (searchType === "query" && !searchQuery.trim()) {
        await showError("Error de validación", "Por favor ingresa una palabra clave para buscar");
        return;
      }

      if (searchType === "id" && (!searchId.trim() || isNaN(parseInt(searchId)))) {
        await showError("Error de validación", "Por favor ingresa un ID válido (0-5999)");
        return;
      }

      setLoading(true);
      setResult(null);

      try {
        const params: { query?: string; id?: number; limit?: number } = {};
        
        if (searchType === "query") {
          params.query = searchQuery.trim();
        } else {
          params.id = parseInt(searchId, 10);
        }
        
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum >= 1 && limitNum <= 1000) {
          params.limit = limitNum;
        }

        const response = await fetch("/api/search-regex/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });

        const data: SearchResponse = await response.json();

        if (data.success && data.results.length > 0) {
          setResult(data);
          onResult(data);
          await showSuccess(
            "Búsqueda exitosa",
            `Se encontraron ${data.total} resultados${data.total > data.limit ? ` (mostrando ${data.limit})` : ""}`
          );
        } else if (data.success && data.results.length === 0) {
          setResult(data);
          onResult(data);
          await showError(
            "Sin resultados",
            "No se encontraron expresiones regulares que coincidan con la búsqueda"
          );
        } else {
          const errorMsg = data.error || "Error al buscar expresiones regulares";
          await showError("Error al buscar", errorMsg);
          setResult(data);
          onResult(data);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error de conexión";
        await showError("Error de conexión", errorMessage);
        const errorResponse: SearchResponse = {
          success: false,
          query: searchType === "query" ? searchQuery : null,
          id: searchType === "id" ? parseInt(searchId, 10) : null,
          results: [],
          total: 0,
          limit: parseInt(limit, 10) || 50,
          error: errorMessage,
        };
        setResult(errorResponse);
        onResult(errorResponse);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        {/* Selector de tipo de búsqueda */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Tipo de Búsqueda
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchType("query");
                setSearchId("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                searchType === "query"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              Por Texto
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchType("id");
                setSearchQuery("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                searchType === "id"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              Por ID
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo de búsqueda por texto */}
          {searchType === "query" && (
            <div>
              <label
                htmlFor="search-query"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Buscar Regex
              </label>
              <input
                type="text"
                id="search-query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ej: LCIG, *+, [A-Z]"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono text-black placeholder:text-gray-400"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Busca expresiones regulares que contengan la palabra clave (case-insensitive)
              </p>
            </div>
          )}

          {/* Campo de búsqueda por ID */}
          {searchType === "id" && (
            <div>
              <label
                htmlFor="search-id"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                ID del Regex
              </label>
              <input
                type="number"
                id="search-id"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="0-5999"
                min="0"
                max="5999"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono text-black placeholder:text-gray-400"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Ingresa el ID del regex que deseas buscar (rango: 0-5999)
              </p>
            </div>
          )}

          {/* Límite de resultados */}
          <div>
            <label
              htmlFor="search-limit"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Límite de Resultados
            </label>
            <input
              type="number"
              id="search-limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="50"
              min="1"
              max="1000"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono text-black placeholder:text-gray-400"
            />
            <p className="mt-2 text-xs text-gray-500">
              Máximo número de resultados a mostrar (1-1000, por defecto: 50)
            </p>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              (searchType === "query" && !searchQuery.trim()) ||
              (searchType === "id" && (!searchId.trim() || isNaN(parseInt(searchId))))
            }
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
                Buscando...
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Buscar
              </>
            )}
          </button>
        </form>

        {/* Resultados en miniatura */}
        {result && result.success && result.results.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Resultados ({result.total} encontrados)
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.results.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">
                        ID: {item.id}
                      </span>
                    </div>
                    <code className="text-sm font-mono text-gray-900 block mt-1 break-all">
                      {item.regex}
                    </code>
                  </div>
                ))}
                {result.results.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    ... y {result.results.length - 5} más (ver resultados completos a la derecha)
                  </p>
                )}
              </div>
            </div>
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

RegexSearch.displayName = "RegexSearch";

export default RegexSearch;

