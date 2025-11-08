// script.js

// Variables globales
let states = [];
let transitions = [];
let autoStateCount = 0; // Contador para estados autogenerados

// Variables globales para asignar nombres únicos a los estados del AFD
let stateNameMapping = {};
let stateNameCounter = 0;

// Función para generar los checkboxes de estados finales
function generateFinalStatesCheckboxes() {
    const finalStatesContainer = document.getElementById('finalStatesCheckboxes');
    finalStatesContainer.innerHTML = '';  // Limpiar el contenido previo

    states.forEach((estado, index) => {
        // Crear columna dinámica, máximo 3 columnas por fila
        const div = document.createElement('div');
        div.classList.add('col-4');  // 3 columnas en pantallas grandes

        // Crear la estructura del checkbox
        const formCheck = document.createElement('div');
        formCheck.classList.add('form-check', 'mb-2');

        const checkbox = document.createElement('input');
        checkbox.classList.add('form-check-input');
        checkbox.type = 'checkbox';
        checkbox.id = `finalState${index}`;
        checkbox.value = estado;

        const label = document.createElement('label');
        label.classList.add('form-check-label');
        label.htmlFor = `finalState${index}`;
        label.textContent = estado;

        // Anidar los elementos
        formCheck.appendChild(checkbox);
        formCheck.appendChild(label);
        div.appendChild(formCheck);
        finalStatesContainer.appendChild(div);
    });
}

// Llamar a la función para generar los checkboxes
generateFinalStatesCheckboxes();

// Function to reset state name mapping
function resetStateNameMapping() {
    stateNameMapping = {};
    stateNameCounter = 0;
}

// Función para obtener un nombre único para un conjunto de estados
function getUniqueStateName(stateSet) {
    let stateKey = stateSet.sort().join(",");  // Crear una clave única ordenando y uniendo los nombres de estados
    if (!stateNameMapping[stateKey]) {
        stateNameMapping[stateKey] = `A${stateNameCounter++}`;  // Asignar un nombre único con prefijo 'A'
    }
    return stateNameMapping[stateKey];
}

// Función para agregar un estado
function addState() {
    const stateInput = document.getElementById('newStateName');
    let stateName = stateInput.value.trim();

    if (stateName === "") {
        // Generar nombre automático
        stateName = `q${autoStateCount}`;
        autoStateCount++;
    }

    if (states.includes(stateName)) {
        alert("El nombre del estado ya existe.");
        return;
    }

    if (!/^[A-Za-z0-9_]+$/.test(stateName)) {
        alert("El nombre del estado debe contener solo letras, números o guiones bajos.");
        return;
    }

    states.push(stateName);
    updateStateTablesAndSelects();
    stateInput.value = ""; // Limpiar el campo
}

// Función para actualizar las tablas, selects y checkboxes con los estados
function updateStateTablesAndSelects() {
    // Actualizar tabla de estados
    const statesTableBody = document.getElementById('statesTable').querySelector('tbody');
    statesTableBody.innerHTML = "";
    states.forEach((state, index) => {
        const row = statesTableBody.insertRow();
        row.innerHTML = `
            <td>${state}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteState(${index}), generateFinalStatesCheckboxes()">Eliminar</button></td>
        `;
    });

    // Actualizar selects para estado inicial y transiciones
    const initialStateSelect = document.getElementById('initialStateSelect');
    const transitionFromSelect = document.getElementById('newTransitionFrom');
    const transitionToSelect = document.getElementById('newTransitionTo');

    // Limpiar las opciones de los selects
    initialStateSelect.innerHTML = `<option value="">-- Selecciona el estado inicial --</option>`;
    transitionFromSelect.innerHTML = `<option value="">-- Estado origen --</option>`;
    transitionToSelect.innerHTML = `<option value="">-- Estado destino --</option>`;

    states.forEach(state => {
        const option1 = new Option(state, state);
        initialStateSelect.add(option1.cloneNode(true));

        const option2 = new Option(state, state);
        transitionFromSelect.add(option2.cloneNode(true));

        const option3 = new Option(state, state);
        transitionToSelect.add(option3.cloneNode(true));
    });

    // Actualizar checkboxes de estados finales
    const finalStatesContainer = document.getElementById('finalStatesCheckboxes');
    finalStatesContainer.innerHTML = "";
    states.forEach(state => {
        const checkbox = document.createElement('div');
        checkbox.classList.add('form-check');
        checkbox.innerHTML = `
            <input class="form-check-input" type="checkbox" id="finalStateCheckbox_${state}" value="${state}">
            <label class="form-check-label" for="finalStateCheckbox_${state}">${state}</label>
        `;
        finalStatesContainer.appendChild(checkbox);
    });
}

// Función para eliminar un estado
function deleteState(index) {
    const state = states[index];
    states.splice(index, 1);
    // Eliminar todas las transiciones que involucren este estado
    transitions = transitions.filter(t => t.from !== state && t.to !== state);
    updateStateTablesAndSelects();
    updateTransitionsTable();
}

// Función para agregar una transición
function addTransition() {
    const from = document.getElementById('newTransitionFrom').value;
    const to = document.getElementById('newTransitionTo').value;
    let symbol = document.getElementById('newTransitionSymbol').value.trim();

    // Si el campo está vacío, se asume que es una transición epsilon (ε)
    if (symbol === "") {
        symbol = "ε";  // Transición epsilon por defecto
    }

    if (from === "" || to === "") {
        alert("Por favor completa los campos de estado origen y destino.");
        return;
    }

    transitions.push({ from, to, symbol });
    updateTransitionsTable();
    // Limpiar los campos de transición
    document.getElementById('newTransitionSymbol').value = "";
}

// Función para actualizar la tabla de transiciones
function updateTransitionsTable() {
    const transitionsTableBody = document.getElementById('transitionsTable').querySelector('tbody');
    transitionsTableBody.innerHTML = "";
    transitions.forEach((transition, index) => {
        const row = transitionsTableBody.insertRow();
        row.innerHTML = `
            <td>${transition.from}</td>
            <td>${transition.to}</td>
            <td>${transition.symbol}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteTransition(${index})">Eliminar</button></td>
        `;
    });
}

// Función para eliminar una transición
function deleteTransition(index) {
    transitions.splice(index, 1);
    updateTransitionsTable();
}

// Función para convertir AFND a expresión regular usando el algoritmo de Kleene
function convertToRegex() {
    // Validar las transiciones antes de iniciar la conversión
    if (!validateTransitions()) {
        return; // Si las transiciones no son válidas, se detiene el proceso
    }

    const initialState = document.getElementById('initialStateSelect').value;
    const finalStates = Array.from(document.querySelectorAll('#finalStatesCheckboxes input:checked')).map(checkbox => checkbox.value);

    if (initialState === "" || finalStates.length === 0) {
        alert("Por favor selecciona el estado inicial y al menos un estado final.");
        return;
    }

    // Crear el AFND con los estados y transiciones
    let nfa = {
        states: [...states],
        initialState: initialState,
        finalStates: [...finalStates],
        transitions: [...transitions]
    };

    // Renderizar el AFND original (opcional, solo para mostrarlo)
    renderAutomata(nfa, 'nfa-automata'); // Automata AFND

    // Log del AFND antes de la conversión
    console.log("AFND generado: ", nfa);

    // Convertir el AFND a AFD
    const afd = convertNfaToAfd(nfa);

    // Log del AFD después de la conversión
    console.log("AFD generado: ", afd);

    // Renderizar el AFD generado
    renderAutomata(afd, 'afd-automata'); // Automata AFD

    // Llamar a la función que convierte el AFD a expresión regular con el algoritmo de Kleene
    const regex = convertDfaToRegexKleene(afd); // Usamos el AFD aquí

    // Mostrar el resultado no simplificado (para depuración)
    console.log("Expresión regular sin simplificar: ", regex);

    // Mostrar la expresión regular final
    document.getElementById('resultRegex').textContent = regex;
}

function convertNfaToAfd(nfa) {
    // Reset state name mapping before conversion
    resetStateNameMapping();

    let { states, initialState, finalStates, transitions } = nfa;
    let afdTransitions = [];
    let afdStates = [];
    let afdFinalStates = [];
    let visitedStates = new Set();

    // Calcular la clausura epsilon del estado inicial
    let initialClosure = closure([initialState], transitions);
    let initialKey = getUniqueStateName(initialClosure);  // Asignar nombre único al estado inicial
    let stateQueue = [initialClosure];  // Cola para procesar los conjuntos de estados
    visitedStates.add(initialKey);  // Marcar como visitado

    while (stateQueue.length > 0) {
        let currentStateSet = stateQueue.shift();  // Obtener el siguiente conjunto de estados
        let currentStateName = getUniqueStateName(currentStateSet);  // Obtener el nombre único del conjunto de estados

        // Agregar este conjunto de estados como un nuevo estado en el AFD
        afdStates.push(currentStateName);

        // Si algún estado del conjunto es final en el AFND, este conjunto también es final en el AFD
        if (currentStateSet.some(state => finalStates.includes(state))) {
            afdFinalStates.push(currentStateName);
        }

        // Procesar las transiciones para cada símbolo de entrada
        let symbols = getSymbols(transitions);
        symbols.forEach(symbol => {
            let moveResult = move(currentStateSet, symbol, transitions);
            let closureResult = closure(moveResult, transitions);
            if (closureResult.length > 0) {
                let closureKey = getUniqueStateName(closureResult);  // Obtener el nombre único del nuevo estado

                if (!visitedStates.has(closureKey)) {
                    stateQueue.push(closureResult);  // Agregar el nuevo conjunto de estados a la cola
                    visitedStates.add(closureKey);  // Marcar como visitado
                }

                // Crear una transición en el AFD
                afdTransitions.push({
                    from: currentStateName,
                    to: closureKey,
                    symbol: symbol
                });
            }
        });
    }

    // Crear el AFD final
    let afd = {
        states: afdStates,  // Nombres únicos de los estados en el AFD
        initialState: initialKey,  // Nombre único del estado inicial
        finalStates: afdFinalStates,  // Nombres únicos de los estados finales
        transitions: afdTransitions
    };

    return afd;
}

// Función para obtener los símbolos del AFND (sin incluir ε)
function getSymbols(transitions) {
    let symbols = new Set();
    transitions.forEach(t => {
        if (t.symbol !== "ε") {
            symbols.add(t.symbol);
        }
    });
    return Array.from(symbols);
}

// Función para calcular la clausura epsilon de un conjunto de estados
function closure(states, transitions) {
    let closureStates = new Set([...states]);  // Usamos Set para evitar duplicados
    let added = true;

    while (added) {
        added = false;
        closureStates.forEach(state => {
            transitions.forEach(t => {
                if (t.from === state && t.symbol === "ε" && !closureStates.has(t.to)) {
                    closureStates.add(t.to);
                    added = true;
                }
            });
        });
    }

    // Convertimos el Set en un array para devolver el resultado
    return Array.from(closureStates);
}

// Función para mover a un conjunto de estados según un símbolo
function move(states, symbol, transitions) {
    let result = [];
    states.forEach(state => {
        transitions.forEach(t => {
            if (t.from === state && t.symbol === symbol) {
                result.push(t.to);
            }
        });
    });
    return result;
}

// Función para convertir AFD a expresión regular usando el algoritmo de eliminación de estados
function convertDfaToRegexKleene(afd) {
    console.log("AFD para convertir a regex: ", afd);
    
    // Crear una copia profunda del AFD para no modificar el original
    let states = [...afd.states];
    let initialState = afd.initialState;
    let finalStates = [...afd.finalStates];
    let transitions = [...afd.transitions];
    
    // Introducir nuevos estados inicial y final
    const newInitialState = 'qi';
    const newFinalState = 'qf';
    
    states.push(newInitialState, newFinalState);
    transitions.push({ from: newInitialState, to: initialState, symbol: 'ε' });
    finalStates.forEach(fs => {
        transitions.push({ from: fs, to: newFinalState, symbol: 'ε' });
    });
    
    initialState = newInitialState;
    finalStates = [newFinalState];
    
    // Construir la tabla de expresiones regulares
    let regexTable = {};
    states.forEach(i => {
        regexTable[i] = {};
        states.forEach(j => {
            regexTable[i][j] = '';
        });
    });
    
    // Poblar la tabla con las transiciones existentes
    transitions.forEach(t => {
        let from = t.from;
        let to = t.to;
        let symbol = t.symbol === 'ε' ? 'ε' : t.symbol;
        
        if (regexTable[from][to] === '') {
            regexTable[from][to] = symbol;
        } else {
            // Evitar duplicados y manejar alternaciones
            if (!regexTable[from][to].includes(symbol)) {
                regexTable[from][to] = `(${regexTable[from][to]}|${symbol})`;
            }
        }
    });
    
    console.log("Tabla inicial de regex:", regexTable);
    
    // Lista de estados a eliminar (todos excepto el inicial y final)
    let statesToEliminate = states.filter(s => s !== initialState && !finalStates.includes(s));
    
    // Función auxiliar para simplificar concatenaciones con ε
    function concatenateExpressions(expr1, expr2, expr3) {
        // Si expr1 es ε, lo omitimos
        if (expr1 === 'ε') expr1 = '';
        // Si expr3 es ε, lo omitimos
        if (expr3 === 'ε') expr3 = '';
        // Si expr2 es vacío o (ε)*, simplemente concatenamos expr1 y expr3
        if (expr2 === '' || expr2 === '(ε)*') {
            return expr1 + expr3;
        } else {
            return expr1 + expr2 + expr3;
        }
    }
    
    statesToEliminate.forEach(eliminateState => {
        console.log(`Eliminando estado: ${eliminateState}`);
        
        // Obtener las transiciones hacia y desde el estado a eliminar
        let incomingStates = states.filter(s => s !== eliminateState && regexTable[s][eliminateState] !== '');
        let outgoingStates = states.filter(s => s !== eliminateState && regexTable[eliminateState][s] !== '');
        
        // Obtener la expresión regular para los loops en el estado a eliminar
        let loop = regexTable[eliminateState][eliminateState];
        let loopExpr = loop !== '' ? `(${loop})*` : '';
        
        incomingStates.forEach(i => {
            outgoingStates.forEach(j => {
                let expr1 = regexTable[i][eliminateState];
                let expr2 = loopExpr;
                let expr3 = regexTable[eliminateState][j];
                
                let newExpr = concatenateExpressions(expr1, expr2, expr3);
                
                if (regexTable[i][j] === '') {
                    regexTable[i][j] = newExpr;
                } else {
                    // Evitar duplicados y manejar alternaciones
                    if (!regexTable[i][j].includes(newExpr)) {
                        regexTable[i][j] = `(${regexTable[i][j]}|${newExpr})`;
                    }
                }
            });
        });
        
        // Eliminar todas las transiciones que involucran al estado eliminado
        states.forEach(s => {
            regexTable[s][eliminateState] = '';
            regexTable[eliminateState][s] = '';
        });
        
        console.log("Tabla de regex después de eliminar:", regexTable);
    });
    
    // La expresión regular final está en regexTable[initialState][newFinalState]
    let finalRegex = regexTable[initialState][newFinalState];
    console.log("Expresión regular sin simplificar:", finalRegex);
    
    if (!finalRegex) {
        alert("No se pudo generar una expresión regular válida.");
        return '';
    }
    
    // Simplificar la expresión regular
    let simplified = simplifyRegex(finalRegex);
    console.log("Expresión regular final simplificada:", simplified);
    
    return simplified;
}

// Función para simplificar expresiones regulares
function simplifyRegex(regex) {
    // Reemplazar ε por nada
    regex = regex.replace(/ε/g, '');
    
    // Eliminar paréntesis redundantes alrededor de un solo símbolo
    regex = regex.replace(/\((\w)\)/g, '$1');
    
    // Simplificar expresiones como (a|a) a a
    regex = regex.replace(/\((\w)\|\1\)/g, '$1');
    
    // Simplificar expresiones como a|a a a
    regex = regex.replace(/(\w)\|\1/g, '$1');
    
    // Reemplazar a+* con a+
    regex = regex.replace(/(\w)\*\+/g, '$1+');
    
    // Reemplazar (a)* con a*
    regex = regex.replace(/\((\w)\)\*/g, '$1*');
    
    // Reemplazar (a)+ con a+
    regex = regex.replace(/\((\w)\)\+/g, '$1+');
    
    // Eliminar alternaciones vacías
    regex = regex.replace(/\(\|/g, '|');
    regex = regex.replace(/\|\)/g, '|');
    
    // Eliminar paréntesis vacíos
    regex = regex.replace(/\(\)/g, '');
    
    // Eliminar concatenaciones redundantes
    regex = regex.replace(/(\w)\1\*/g, '$1+');
    
    return regex;
}

// Función para renderizar el autómata usando Viz.js con pan y zoom
function renderAutomata(automaton, elementId) {
    let dot = 'digraph G {\n  rankdir=LR;\n';

    // Estado inicial con una flecha
    dot += `  qi [label="", shape=none];\n`;
    dot += `  qi -> "${automaton.initialState}";\n`;

    // Agregar estados
    automaton.states.forEach(stateName => {
        let shape = "circle";
        if (automaton.finalStates.includes(stateName)) {
            shape = "doublecircle"; // Estados finales como doble círculo
        }
        dot += `  "${stateName}" [shape=${shape}];\n`;
    });

    // Agregar transiciones
    automaton.transitions.forEach(t => {
        let symbol = t.symbol === "ε" ? "ε" : t.symbol; // Asegurar que epsilon se vea correctamente
        dot += `  "${t.from}" -> "${t.to}" [label="${symbol}"];\n`;
    });

    dot += '}';

    // Renderizar el autómata usando Viz.js
    const viz = new Viz();
    viz.renderSVGElement(dot)
        .then(svgElement => {
            const automataDiv = document.getElementById(elementId);
            automataDiv.innerHTML = "";

            // Crear un contenedor <svg> para manejar pan y zoom
            const svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgContainer.setAttribute("width", "100%");
            svgContainer.setAttribute("height", "100%");
            svgContainer.style.border = "1px solid #ccc";
            svgContainer.style.background = "#fff";
            svgContainer.style.cursor = "move"; // Cambiar el cursor para indicar pan

            // Crear un grupo dentro del contenedor para aplicar transformaciones
            const innerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            svgContainer.appendChild(innerGroup);

            // Mover el contenido del SVG generado por Viz.js dentro del grupo
            const innerSvgGroup = svgElement.querySelector("g");

            if (innerSvgGroup) {
                // Clonar el grupo interno y añadirlo al nuevo grupo
                const clonedGroup = innerSvgGroup.cloneNode(true);
                innerGroup.appendChild(clonedGroup);
            }

            automataDiv.appendChild(svgContainer);

            // Aplicar D3 zoom y pan
            const svg = d3.select(svgContainer);
            const g = d3.select(innerGroup);

            const zoom = d3.zoom()
                .scaleExtent([0.1, 5]) // Limitar el nivel de zoom
                .on('zoom', function () {
                    g.attr('transform', d3.event.transform);
                });

            svg.call(zoom);

            // Ajustar el viewBox para hacer el SVG responsivo
            const bbox = innerGroup.getBBox();
            svgContainer.setAttribute("viewBox", `${bbox.x - 50} ${bbox.y - 50} ${bbox.width + 100} ${bbox.height + 100}`);
        })
        .catch(error => {
            console.error(error);
        });
}

// Función para validar las transiciones y evitar bucles infinitos
function validateTransitions() {
    if (transitions.length === 0) {
        alert("No hay transiciones definidas. Por favor agrega algunas transiciones.");
        return false;
    }

    // Verificar si hay transiciones que causan bucles (mismo origen y destino)
    for (let i = 0; i < transitions.length; i++) {
        const transition = transitions[i];
        if (transition.from === transition.to && transition.symbol === "ε") {
            alert("Transición epsilon cíclica detectada. Esto podría causar un bucle infinito.");
            return false;
        }
    }

    return true;
}
