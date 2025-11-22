import { NextRequest, NextResponse } from "next/server";

// Normalizar BASE_URL para asegurar que termine con "/"
const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || "http://localhost:8000/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const BASE_URL = getBaseUrl();

/**
 * Hace proxy a la API de Django
 */
async function proxyToDjango(
  params: { query?: string; q?: string; id?: number; limit?: number },
  method: "GET" | "POST"
): Promise<NextResponse> {
  const apiUrl = new URL("api/search-regex/", BASE_URL);

  if (method === "GET") {
    if (params.id !== undefined) {
      apiUrl.searchParams.append("id", params.id.toString());
    }
    if (params.query) {
      apiUrl.searchParams.append("query", params.query);
    } else if (params.q) {
      apiUrl.searchParams.append("q", params.q);
    }
    if (params.limit !== undefined) {
      apiUrl.searchParams.append("limit", params.limit.toString());
    }
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body:
        method === "POST" ? JSON.stringify(params) : undefined,
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
          query: params.query || params.q || null,
          id: params.id || null,
          results: [],
          total: 0,
          limit: params.limit || 50,
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
    console.error("Error calling Django API:", error);

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
          query: params.query || params.q || null,
          id: params.id || null,
          results: [],
          total: 0,
          limit: params.limit || 50,
          error:
            "Timeout: La API de Django no respondió en el tiempo esperado.",
        },
        { status: 504 }
      );
    }

    if (error instanceof Error && error.message.includes("fetch failed")) {
      return NextResponse.json(
        {
          success: false,
          query: params.query || params.q || null,
          id: params.id || null,
          results: [],
          total: 0,
          limit: params.limit || 50,
          error: `Error de conexión: No se pudo conectar con la API de Django en ${BASE_URL}.`,
        },
        { status: 503 }
      );
    }

    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || searchParams.get("q") || undefined;
  const idParam = searchParams.get("id");
  const id = idParam ? parseInt(idParam, 10) : undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // Validar ID si está presente
  if (id !== undefined && (isNaN(id) || id < 0)) {
    return NextResponse.json(
      {
        success: false,
        query: query || null,
        id: id || null,
        results: [],
        total: 0,
        limit: limit || 50,
        error: "El parámetro 'id' debe ser un número entero no negativo",
      },
      { status: 400 }
    );
  }

  // Validar limit si está presente
  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 1000)) {
    return NextResponse.json(
      {
        success: false,
        query: query || null,
        id: id || null,
        results: [],
        total: 0,
        limit: 50,
        error: "El parámetro 'limit' debe ser un número entre 1 y 1000",
      },
      { status: 400 }
    );
  }

  const params = { query, id, limit };

  // Hacer proxy directamente a Django
  return proxyToDjango(params, "GET");
}

export async function POST(request: NextRequest) {
  let query: string | undefined;
  let id: number | undefined;
  let limit: number | undefined;

  try {
    const body = await request.json();
    query = body.query || body.q || undefined;
    id = body.id !== undefined ? parseInt(body.id, 10) : undefined;
    limit = body.limit !== undefined ? parseInt(body.limit, 10) : undefined;

    // Validar ID si está presente
    if (id !== undefined && (isNaN(id) || id < 0)) {
      return NextResponse.json(
        {
          success: false,
          query: query || null,
          id: id || null,
          results: [],
          total: 0,
          limit: limit || 50,
          error: "El campo 'id' debe ser un número entero no negativo",
        },
        { status: 400 }
      );
    }

    // Validar limit si está presente
    if (
      limit !== undefined &&
      (isNaN(limit) || limit < 1 || limit > 1000)
    ) {
      return NextResponse.json(
        {
          success: false,
          query: query || null,
          id: id || null,
          results: [],
          total: 0,
          limit: 50,
          error: "El campo 'limit' debe ser un número entre 1 y 1000",
        },
        { status: 400 }
      );
    }

    const params = { query, id, limit };

    // Hacer proxy directamente a Django
    return proxyToDjango(params, "POST");
  } catch (parseError) {
    // Si no es JSON válido
    if (parseError instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          query: null,
          id: null,
          results: [],
          total: 0,
          limit: 50,
          error: "JSON inválido en el cuerpo de la petición",
        },
        { status: 400 }
      );
    }

    // Si hay un error inesperado, intentar hacer proxy con los valores disponibles
    return proxyToDjango({ query, id, limit }, "POST");
  }
}
