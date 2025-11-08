# Lenguajes Front - Regex to DFA

Proyecto Next.js que implementa un endpoint para convertir expresiones regulares a autómatas finitos deterministas (DFA) usando arquitectura limpia.

## Arquitectura

El proyecto sigue los principios de **Arquitectura Limpia** (Clean Architecture) con las siguientes capas:

```
src/
├── domain/           # Capa de Dominio
│   └── entities/     # Entidades del negocio (State, Transition, NFA, DFA)
├── application/      # Capa de Aplicación
│   └── use-cases/    # Casos de uso (RegexToDFAUseCase)
├── infrastructure/   # Capa de Infraestructura
│   ├── nfa/          # Algoritmo de Thompson (Regex → NFA)
│   ├── dfa/          # Construcción de subconjuntos (NFA → DFA)
│   └── regex/        # Parser de expresiones regulares
└── presentation/     # Capa de Presentación
    └── app/api/      # API Routes de Next.js
```

## Endpoint: Regex to DFA

### URL
`/api/regex-to-dfa/`

### Métodos
- `GET`: Parámetros en query string
- `POST`: Parámetros en body JSON

### Uso

#### GET Request

```bash
# Convertir una expresión regular a DFA
curl "http://localhost:3000/api/regex-to-dfa/?regex=a*b"

# Convertir y probar una cadena
curl "http://localhost:3000/api/regex-to-dfa/?regex=a*b&test=aaab"
```

#### POST Request

```bash
# Convertir una expresión regular
curl -X POST http://localhost:3000/api/regex-to-dfa/ \
  -H "Content-Type: application/json" \
  -d '{"regex": "a*b"}'

# Convertir y probar una cadena
curl -X POST http://localhost:3000/api/regex-to-dfa/ \
  -H "Content-Type: application/json" \
  -d '{"regex": "a*b", "test": "aaab"}'
```

### Respuesta

```json
{
  "success": true,
  "regex": "a*b",
  "dfa": {
    "alphabet": ["a", "b"],
    "states": ["S0", "S1", "S2"],
    "start": "S0",
    "accepting": ["S2"],
    "transitions": [
      {"from": "S0", "symbol": "a", "to": "S1"},
      {"from": "S0", "symbol": "b", "to": "S2"},
      {"from": "S1", "symbol": "a", "to": "S1"},
      {"from": "S1", "symbol": "b", "to": "S2"}
    ]
  },
  "test_result": {
    "string": "aaab",
    "accepted": true
  },
  "error": null
}
```

### Características

- ✅ Soporte para expresiones regulares estándar: `*`, `+`, `?`, `|`, `.`, `()`, y caracteres escapados con `\`
- ✅ Conversión automática de Regex → NFA (Thompson) → DFA (Subconjuntos)
- ✅ Opción de probar cadenas contra el DFA generado
- ✅ Respuestas en formato JSON estructurado
- ✅ Manejo de errores con mensajes descriptivos

### Ejemplos de Expresiones Regulares

- `a*b` - Cero o más 'a' seguidas de 'b'
- `(a|b)*` - Cualquier combinación de 'a' y 'b'
- `a+b` - Una o más 'a' seguidas de 'b'
- `a?b` - Opcionalmente 'a' seguida de 'b'
- `a\.b` - Literal 'a.b' (el punto está escapado)

## Algoritmos Implementados

### 1. Algoritmo de Thompson
Convierte una expresión regular en un autómata finito no determinista (NFA) usando el algoritmo de construcción de Thompson.

### 2. Construcción de Subconjuntos
Convierte un NFA en un DFA usando el algoritmo de construcción de subconjuntos (subset construction).

## Desarrollo

### Instalación

```bash
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### Construcción

```bash
npm run build
```

### Ejecutar en producción

```bash
npm start
```

## Variables de Entorno

Crea un archivo `.env.local` con:

```env
BASE_URL=http://localhost:3000
```

## Tecnologías

- **Next.js 16** - Framework de React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos

## Estructura de Archivos

```
.
├── app/
│   ├── api/
│   │   └── regex-to-dfa/
│   │       └── route.ts          # API Route
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   ├── domain/
│   │   └── entities/             # Entidades del dominio
│   ├── application/
│   │   └── use-cases/            # Casos de uso
│   └── infrastructure/
│       ├── nfa/                  # Algoritmo de Thompson
│       ├── dfa/                  # Construcción de subconjuntos
│       └── regex/                # Parser de regex
├── package.json
└── README.md
```

## Licencia

MIT
