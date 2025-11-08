
function regexToNfa(text) {
    'use strict';
    function generateGraph(node, start, end, count) {
        var i, last, temp, tempStart, tempEnd;
        if (!start.hasOwnProperty('id')) {
            start.id = count;
            count += 1;
        }
        switch (node.type) {
        case 'empty':
            start.edges.push(['λ', end]);
            break;
        case 'text':
            start.edges.push([node.text, end]);
            break;
        case 'cat':
            last = start;
            for (i = 0; i < node.parts.length - 1; i += 1) {
                temp = {'type': '', 'edges': []};
                count = generateGraph(node.parts[i], last, temp, count);
                last = temp;
            }
            count = generateGraph(node.parts[node.parts.length - 1], last, end, count);
            break;
        case 'or':
            for (i = 0; i < node.parts.length; i += 1) {
                tempStart = {'type': '', 'edges': []};
                tempEnd = {'type': '', 'edges': [['λ', end]]};
                start.edges.push(['λ', tempStart]);
                count = generateGraph(node.parts[i], tempStart, tempEnd, count);
            }
            break;
        case 'star':
            tempStart = {'type': '', 'edges': []};
            tempEnd = {'type': '', 'edges': [['λ', tempStart], ['λ', end]]};
            start.edges.push(['λ', tempStart]);
            start.edges.push(['λ', end]);
            count = generateGraph(node.sub, tempStart, tempEnd, count);
            break;
        }
        if (!end.hasOwnProperty('id')) {
            end.id = count;
            count += 1;
        }
        return count;
    }
    var ast = parseRegex(text),
        start = {'type': 'start', 'edges': []},
        accept = {'type': 'accept', 'edges': []};
    if (typeof ast === 'string') {
        return ast;
    }
    generateGraph(ast, start, accept, 0);
    return start;
}
