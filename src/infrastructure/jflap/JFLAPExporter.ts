import { DFASerialized } from "../../domain/entities/DFA";

/**
 * Exporta un DFA a formato JFLAP XML (.jff)
 */
export class JFLAPExporter {
  /**
   * Convierte un DFA serializado a formato XML compatible con JFLAP
   */
  static exportToJFLAP(dfa: DFASerialized): string {
    // Generar estados con coordenadas distribuidas en un círculo
    const states = dfa.states.map((stateId, index) => {
      const isInitial = stateId === dfa.start;
      const isAccepting = dfa.accepting.includes(stateId);
      
      // Coordenadas básicas para posicionar estados en un círculo
      // Si solo hay un estado, lo centramos
      const angle = dfa.states.length === 1 
        ? 0 
        : (index * 2 * Math.PI) / dfa.states.length;
      const radius = Math.max(150, dfa.states.length * 30);
      const centerX = 250;
      const centerY = 250;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      let stateXml = `    <state id="${this.escapeXml(stateId)}" name="${this.escapeXml(stateId)}">\n`;
      stateXml += `      <x>${x.toFixed(2)}</x>\n`;
      stateXml += `      <y>${y.toFixed(2)}</y>\n`;
      if (isInitial) {
        stateXml += `      <initial/>\n`;
      }
      if (isAccepting) {
        stateXml += `      <final/>\n`;
      }
      stateXml += `    </state>`;
      return stateXml;
    }).join("\n");

    // Generar transiciones
    const transitions = dfa.transitions.map((transition) => {
      const symbol = transition.symbol === "" ? "λ" : transition.symbol;
      return `    <transition>
      <from>${this.escapeXml(transition.from)}</from>
      <to>${this.escapeXml(transition.to)}</to>
      <read>${this.escapeXml(symbol)}</read>
    </transition>`;
    }).join("\n");

    // Construir el XML completo
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
    xml += `<!--Created with Regex to DFA Converter-->\n`;
    xml += `<structure>\n`;
    xml += `  <type>fa</type>\n`;
    xml += `  <automaton>\n`;
    xml += `${states}\n`;
    if (transitions) {
      xml += `${transitions}\n`;
    }
    xml += `  </automaton>\n`;
    xml += `</structure>`;

    return xml;
  }

  /**
   * Escapa caracteres especiales XML
   */
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Genera un nombre de archivo válido desde una expresión regular
   * Reemplaza caracteres especiales por guiones bajos
   */
  static sanitizeFileName(regex: string): string {
    return regex
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Genera el nombre completo del archivo JFLAP
   */
  static generateFileName(regex: string): string {
    const sanitized = this.sanitizeFileName(regex);
    return `dfa_${sanitized || "empty"}.jff`;
  }
}

