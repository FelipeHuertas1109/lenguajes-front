import { NextRequest, NextResponse } from "next/server";

// Normalizar BASE_URL para asegurar que termine con "/"
const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || "http://localhost:8000/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const BASE_URL = getBaseUrl();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dfaId = searchParams.get("dfa_id") || searchParams.get("id");
  const string = searchParams.get("string");
  const stringsParam = searchParams.get("strings");

  // Validar dfa_id
  if (!dfaId) {
    return NextResponse.json(
      {
        success: false,
        dfa_id: null,
        afd_info: null,
        predictions: [],
        error: "Parámetro 'dfa_id' o 'id' es requerido",
      },
      { status: 400 }
    );
  }

  const dfaIdNum = parseInt(dfaId, 10);
  if (isNaN(dfaIdNum) || dfaIdNum < 0 || dfaIdNum >= 6000) {
    return NextResponse.json(
      {
        success: false,
        dfa_id: dfaIdNum || null,
        afd_info: null,
        predictions: [],
        error: "dfa_id debe estar entre 0 y 5999",
      },
      { status: 400 }
    );
  }

  // Validar que al menos una cadena esté presente
  if (!string && !stringsParam) {
    // Intentar obtener múltiples parámetros 'string'
    const stringParams = searchParams.getAll("string");
    if (stringParams.length === 0) {
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaIdNum,
          afd_info: null,
          predictions: [],
          error: "Parámetro 'string' o 'strings' es requerido",
        },
        { status: 400 }
      );
    }
  }

  try {
    // Construir URL para la API de Django
    const apiUrl = new URL("api/acepnet-predict/", BASE_URL);
    apiUrl.searchParams.append("dfa_id", dfaIdNum.toString());

    // Procesar cadenas
    let strings: string[] = [];
    if (stringsParam) {
      // Si hay strings separados por comas
      strings = stringsParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (string) {
      // Si hay un solo string
      strings = [string];
    } else {
      // Intentar obtener múltiples parámetros 'string'
      strings = searchParams.getAll("string");
    }

    if (strings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaIdNum,
          afd_info: null,
          predictions: [],
          error: "Parámetro 'string' o 'strings' es requerido",
        },
        { status: 400 }
      );
    }

    // Agregar strings como parámetros múltiples
    strings.forEach((s) => {
      apiUrl.searchParams.append("string", s);
    });

    console.log("Calling Django API for AcepNet predict:", apiUrl.toString());

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30000),
    });

    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Django API returned non-JSON response:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        url: apiUrl.toString(),
        preview: responseText.substring(0, 300),
      });
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaIdNum,
          afd_info: null,
          predictions: [],
          error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). Verifica que la API esté corriendo en ${BASE_URL}.`,
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calling Django API (GET):", error);

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaIdNum || null,
          afd_info: null,
          predictions: [],
          error: "Timeout: La API de Django no respondió en el tiempo esperado.",
        },
        { status: 504 }
      );
    }

    if (error instanceof Error && error.message.includes("fetch failed")) {
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaIdNum || null,
          afd_info: null,
          predictions: [],
          error: `Error de conexión: No se pudo conectar con la API de Django en ${BASE_URL}.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        dfa_id: dfaIdNum || null,
        afd_info: null,
        predictions: [],
        error:
          error instanceof Error
            ? `Error al conectar con la API: ${error.message}`
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let dfaId: number | undefined;
  let string: string | undefined;
  let strings: string[] | undefined;

  try {
    const body = await request.json();
    const dfaIdParam = body.dfa_id || body.id;
    string = body.string;
    
    // Procesar strings - puede ser array o string separado por comas
    if (body.strings) {
      if (Array.isArray(body.strings)) {
        strings = body.strings;
      } else if (typeof body.strings === "string") {
        strings = body.strings
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }
    }

    dfaId = dfaIdParam !== undefined ? parseInt(dfaIdParam, 10) : undefined;

    // Validar dfa_id
    if (!dfaId && dfaId !== 0) {
      return NextResponse.json(
        {
          success: false,
          dfa_id: null,
          afd_info: null,
          predictions: [],
          error: "Campo 'dfa_id' o 'id' es requerido",
        },
        { status: 400 }
      );
    }

    if (isNaN(dfaId) || dfaId < 0 || dfaId >= 6000) {
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaId || null,
          afd_info: null,
          predictions: [],
          error: "dfa_id debe estar entre 0 y 5999",
        },
        { status: 400 }
      );
    }

    // Validar que al menos una cadena esté presente
    if (!string && (!strings || strings.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaId,
          afd_info: null,
          predictions: [],
          error: "Campo 'string' o 'strings' es requerido",
        },
        { status: 400 }
      );
    }

    // Construir lista de cadenas
    const allStrings: string[] = [];
    if (string) {
      allStrings.push(string);
    }
    if (strings && strings.length > 0) {
      allStrings.push(...strings);
    }

    // Construir URL para la API de Django
    const apiUrl = new URL("api/acepnet-predict/", BASE_URL);

    console.log("Calling Django API for AcepNet predict (POST):", apiUrl.toString());
    console.log("Request body:", { dfa_id: dfaId, strings: allStrings });

    // Hacer petición POST a la API de Django
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        dfa_id: dfaId,
        strings: allStrings,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Django API returned non-JSON response:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        url: apiUrl.toString(),
        preview: responseText.substring(0, 300),
      });
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaId,
          afd_info: null,
          predictions: [],
          error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). Verifica que la API esté corriendo en ${BASE_URL}.`,
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/acepnet-predict:", error);

    // Si no es JSON válido
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          dfa_id: null,
          afd_info: null,
          predictions: [],
          error: "JSON inválido en el cuerpo de la petición",
        },
        { status: 400 }
      );
    }

    // Manejar errores de timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaId || null,
          afd_info: null,
          predictions: [],
          error: "Timeout: La API de Django no respondió en el tiempo esperado.",
        },
        { status: 504 }
      );
    }

    // Manejar errores de conexión
    if (error instanceof Error && error.message.includes("fetch failed")) {
      return NextResponse.json(
        {
          success: false,
          dfa_id: dfaId || null,
          afd_info: null,
          predictions: [],
          error: `Error de conexión: No se pudo conectar con la API de Django en ${BASE_URL}.`,
        },
        { status: 503 }
      );
    }

    // Error genérico
    return NextResponse.json(
      {
        success: false,
        dfa_id: dfaId || null,
        afd_info: null,
        predictions: [],
        error:
          error instanceof Error
            ? `Error al procesar la petición: ${error.message}`
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

