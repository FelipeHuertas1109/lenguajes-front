import { NextRequest, NextResponse } from "next/server";

// Normalizar BASE_URL para asegurar que termine con "/"
const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || "http://localhost:8000/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const BASE_URL = getBaseUrl();

export async function POST(request: NextRequest) {
  try {
    // Obtener el FormData de la petición
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No se proporcionó archivo. Use el campo 'file' en el formulario.",
        },
        { status: 400 }
      );
    }

    // Validar que el archivo sea .txt o .csv
    const fileName = file.name.toLowerCase();
    const isValidExtension =
      fileName.endsWith(".txt") || fileName.endsWith(".csv");

    if (!isValidExtension) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El archivo debe ser un archivo de texto (.txt) o CSV (.csv)",
        },
        { status: 400 }
      );
    }

    // Construir URL para la API de Django
    const apiUrl = new URL("api/regex-file-to-csv/", BASE_URL);

    console.log("Calling Django API for CSV processing:", apiUrl.toString());
    console.log("File name:", file.name, "Size:", file.size, "bytes");

    // Convertir el archivo a FormData para enviarlo a Django
    // En Next.js, necesitamos recrear el FormData para enviarlo a Django
    const djangoFormData = new FormData();
    
    // Crear un Blob desde el archivo para preservar el contenido
    const fileBuffer = await file.arrayBuffer();
    // Usar el tipo MIME original del archivo, o uno por defecto basado en la extensión
    const mimeType = file.type || (fileName.endsWith('.csv') ? 'text/csv' : 'text/plain');
    const fileBlob = new Blob([fileBuffer], { type: mimeType });
    
    // Agregar el archivo al FormData con el nombre original
    djangoFormData.append("file", fileBlob, file.name);

    // Hacer petición POST a la API de Django
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      body: djangoFormData,
      // Timeout de 5 minutos (300 segundos) para archivos grandes
      signal: AbortSignal.timeout(300000),
    });

    // Verificar si la respuesta es un CSV o un JSON de error
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      // Intentar leer como JSON si hay error
      let errorData;
      try {
        const responseText = await response.text();
        errorData = JSON.parse(responseText);
      } catch {
        errorData = {
          error: `Error ${response.status}: ${response.statusText}`,
        };
      }

      console.error("Django API returned error (POST):", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorData.error || "Error al procesar el archivo",
        },
        { status: response.status }
      );
    }

    // Si la respuesta es CSV, devolverla directamente
    if (contentType.includes("text/csv") || contentType.includes("application/csv")) {
      const csvBlob = await response.blob();
      const csvText = await csvBlob.text();

      // Generar nombre de archivo con timestamp
      const now = new Date();
      const timestamp = now
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\..+/, "")
        .replace("T", "_");
      const fileName = `regex_dataset_${timestamp}.csv`;

      return new NextResponse(csvText, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
    }

    // Si no es CSV, intentar leer como JSON (por si acaso)
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Django API returned non-CSV, non-JSON response:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        preview: responseText.substring(0, 300),
      });
      return NextResponse.json(
        {
          success: false,
          error: `La API de Django devolvió una respuesta no válida (${response.status} ${response.statusText}). Verifica que la API esté corriendo en ${BASE_URL} y que la ruta /api/regex-file-to-csv/ exista.`,
        },
        { status: 500 }
      );
    }

    // Si es JSON pero no es error, puede ser que Django devolviera JSON por alguna razón
    if (data.error) {
      return NextResponse.json(
        {
          success: false,
          error: data.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error calling Django API (POST):", error);

    // Manejar errores de timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          success: false,
          error: "Timeout: La API de Django no respondió en el tiempo esperado. El archivo puede ser muy grande o la API está lenta. Verifica que esté corriendo.",
        },
        { status: 504 }
      );
    }

    // Manejar errores de conexión
    if (error instanceof Error && error.message.includes("fetch failed")) {
      return NextResponse.json(
        {
          success: false,
          error: `Error de conexión: No se pudo conectar con la API de Django en ${BASE_URL}. Verifica que el servidor esté corriendo.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Error al conectar con la API: ${error.message}`
            : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}

