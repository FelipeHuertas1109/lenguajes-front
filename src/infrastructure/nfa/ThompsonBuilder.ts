import { NFA } from "../../domain/entities/NFA";
import { State } from "../../domain/entities/State";

interface NFAPair {
  start: State;
  end: State;
}

export class ThompsonBuilder {
  private nfa: NFA;
  private regex: string = "";
  private pos: number = 0;

  constructor() {
    this.nfa = new NFA();
  }

  build(regex: string): NFA {
    this.nfa = new NFA();
    this.regex = regex;
    this.pos = 0;
    
    const pair = this.parseExpression();
    
    // Conectar el inicio y fin del NFA
    this.nfa.addTransition(this.nfa.startState, null, pair.start);
    this.nfa.setAcceptingState(pair.end, true);
    
    return this.nfa;
  }

  private parseExpression(): NFAPair {
    let result = this.parseTerm();
    
    while (this.pos < this.regex.length && this.peek() === "|") {
      this.consume("|");
      const term = this.parseTerm();
      result = this.buildAlternation(result, term);
    }
    
    return result;
  }

  private parseTerm(): NFAPair {
    let result: NFAPair | null = null;
    
    while (
      this.pos < this.regex.length &&
      this.peek() !== "|" &&
      this.peek() !== ")"
    ) {
      const factor = this.parseFactor();
      if (result === null) {
        result = factor;
      } else {
        result = this.buildConcatenation(result, factor);
      }
    }
    
    return result || this.buildEpsilon();
  }

  private parseFactor(): NFAPair {
    let atom = this.parseAtom();
    
    while (
      this.pos < this.regex.length &&
      (this.peek() === "*" || this.peek() === "+" || this.peek() === "?")
    ) {
      const op = this.regex[this.pos++];
      if (op === "*") {
        atom = this.buildKleeneStar(atom);
      } else if (op === "+") {
        atom = this.buildPlus(atom);
      } else if (op === "?") {
        atom = this.buildOptional(atom);
      }
    }
    
    return atom;
  }

  private parseAtom(): NFAPair {
    if (this.pos >= this.regex.length) {
      return this.buildEpsilon();
    }

    const char = this.peek();

    if (char === "(") {
      this.consume("(");
      const expr = this.parseExpression();
      this.consume(")");
      return expr;
    }

    if (char === "\\") {
      this.consume("\\");
      if (this.pos >= this.regex.length) {
        throw new Error("Incomplete escape sequence");
      }
      const escaped = this.regex[this.pos++];
      return this.buildCharacter(escaped);
    }

    if (char === ".") {
      this.pos++;
      return this.buildAny();
    }

    if (char === "|" || char === ")" || char === "*" || char === "+" || char === "?") {
      throw new Error(`Unexpected character: ${char}`);
    }

    this.pos++;
    return this.buildCharacter(char);
  }

  private peek(): string {
    if (this.pos >= this.regex.length) {
      return "";
    }
    return this.regex[this.pos];
  }

  private consume(expected: string): void {
    if (this.pos >= this.regex.length || this.regex[this.pos] !== expected) {
      throw new Error(`Expected '${expected}' but found '${this.regex[this.pos] || "EOF"}'`);
    }
    this.pos++;
  }

  private buildCharacter(char: string): NFAPair {
    const start = this.nfa.createState();
    const end = this.nfa.createState();
    this.nfa.addTransition(start, char, end);
    return { start, end };
  }

  private buildAny(): NFAPair {
    const start = this.nfa.createState();
    const end = this.nfa.createState();
    // Para "cualquier carácter", usamos un símbolo especial "." que será manejado
    // durante la construcción de subconjuntos para crear transiciones para todos los caracteres
    // del alfabeto encontrados en la expresión regular
    this.nfa.addTransition(start, ".", end);
    return { start, end };
  }

  private buildEpsilon(): NFAPair {
    const start = this.nfa.createState();
    const end = this.nfa.createState();
    this.nfa.addTransition(start, null, end);
    return { start, end };
  }

  private buildConcatenation(left: NFAPair, right: NFAPair): NFAPair {
    this.nfa.addTransition(left.end, null, right.start);
    return { start: left.start, end: right.end };
  }

  private buildAlternation(left: NFAPair, right: NFAPair): NFAPair {
    const start = this.nfa.createState();
    const end = this.nfa.createState();

    this.nfa.addTransition(start, null, left.start);
    this.nfa.addTransition(start, null, right.start);
    this.nfa.addTransition(left.end, null, end);
    this.nfa.addTransition(right.end, null, end);

    return { start, end };
  }

  private buildKleeneStar(pair: NFAPair): NFAPair {
    const start = this.nfa.createState();
    const end = this.nfa.createState();

    this.nfa.addTransition(start, null, pair.start);
    this.nfa.addTransition(pair.end, null, end);
    this.nfa.addTransition(pair.end, null, pair.start);
    this.nfa.addTransition(start, null, end);

    return { start, end };
  }

  private buildPlus(pair: NFAPair): NFAPair {
    const start = this.nfa.createState();
    const end = this.nfa.createState();

    this.nfa.addTransition(start, null, pair.start);
    this.nfa.addTransition(pair.end, null, end);
    this.nfa.addTransition(pair.end, null, pair.start);

    return { start, end };
  }

  private buildOptional(pair: NFAPair): NFAPair {
    const start = this.nfa.createState();
    const end = this.nfa.createState();

    this.nfa.addTransition(start, null, pair.start);
    this.nfa.addTransition(pair.end, null, end);
    this.nfa.addTransition(start, null, end);

    return { start, end };
  }
}
