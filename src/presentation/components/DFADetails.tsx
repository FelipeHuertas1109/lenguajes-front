"use client";

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
}

export default function DFADetails({ dfa, testResult }: DFADetailsProps) {
  if (!dfa) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
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

