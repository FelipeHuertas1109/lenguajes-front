function regexToNfaWithoutLambda(text) {
    'use strict';
    
    function generateGraphWithoutLambda(node, start, end, count) {
        var i, last, temp, tempStart, tempEnd;
        if (!start.hasOwnProperty('id')) {
            start.id = count;
            count += 1;
        }

        switch (node.type) {
        case 'empty':
            // No agregamos transiciones vacías en el AFND sin λ
            break;
        case 'text':
            // Transiciones con texto (símbolos explícitos)
            if (node.text && node.text.trim() !== '') { 
                start.edges.push([node.text, end]);  // Solo añadimos si hay un símbolo válido
            }
            break;
        case 'cat':
            last = start;
            for (i = 0; i < node.parts.length - 1; i += 1) {
                temp = {'type': '', 'edges': []};
                count = generateGraphWithoutLambda(node.parts[i], last, temp, count);
                last = temp;
            }
            count = generateGraphWithoutLambda(node.parts[node.parts.length - 1], last, end, count);
            break;
        case 'or':
            // Transiciones OR en AFND, permitiendo múltiples caminos por el mismo símbolo
            for (i = 0; i < node.parts.length; i += 1) {
                tempStart = {'type': '', 'edges': []};
                tempEnd = {'type': '', 'edges': []};
                count = generateGraphWithoutLambda(node.parts[i], tempStart, tempEnd, count);
                if (tempStart && tempEnd && node.text && node.text.trim() !== '') {
                    start.edges.push([node.text, tempStart]);  // Solo añadir si hay símbolo
                    tempEnd.edges.push([node.text, end]);
                }
            }
            break;
        case 'star':
            tempStart = {'type': '', 'edges': []};
            tempEnd = {'type': '', 'edges': []};
            if (tempStart && tempEnd) {
                // Crear bucles de estrella (*)
                start.edges.push([node.text || '', tempStart]); 
                tempEnd.edges.push([node.text || '', end]); 
                count = generateGraphWithoutLambda(node.sub, tempStart, tempEnd, count);
            }
            break;
        default:
            // En caso de otros nodos, no hacer nada
            break;
        }
        if (!end.hasOwnProperty('id')) {
            end.id = count;
            count += 1;
        }
        return count;
    }

    // Parsear la expresión regular
    var ast = parseRegex(text),
        start = {'type': 'start', 'edges': []},
        accept = {'type': 'accept', 'edges': []};
    
    if (typeof ast === 'string') {
        return ast;
    }

    // Generar el autómata sin transiciones lambda
    generateGraphWithoutLambda(ast, start, accept, 0);
    
    return start;
}
