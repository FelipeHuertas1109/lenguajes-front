let states = [];
let transitions = [];
let autoStateCount = 0;

// Función para agregar un estado
function addState() {
    const stateInput = document.getElementById('newStateName');
    let stateName = stateInput.value.trim();

    if (stateName === "") {
        stateName = `q${autoStateCount}`;
        autoStateCount++;
    }

    if (states.includes(stateName)) {
        alert("El nombre del estado ya existe.");
        return;
    }

    states.push(stateName);
    updateStateTablesAndSelects();
    stateInput.value = "";
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
            <td><button class="btn btn-danger btn-sm" onclick="deleteState(${index})">Eliminar</button></td>
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

    generateFinalStatesCheckboxes();
}

// Función para agregar una transición
function addTransition() {
    const from = document.getElementById('newTransitionFrom').value;
    const to = document.getElementById('newTransitionTo').value;
    const symbol = document.getElementById('newTransitionSymbol').value.trim();

    if (from === "" || to === "" || symbol === "") {
        alert("Por favor completa los campos de transición.");
        return;
    }

    transitions.push({ from, to, symbol });
    updateTransitionsTable();
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

function deleteTransition(index) {
    transitions.splice(index, 1);
    updateTransitionsTable();
}

function deleteState(index) {
    const state = states[index];
    states.splice(index, 1);
    transitions = transitions.filter(t => t.from !== state && t.to !== state);
    updateStateTablesAndSelects();
    updateTransitionsTable();
}

// Función para minimizar el AFD
function minimizeAFD() {
    if (transitions.length === 0 || states.length === 0) {
        alert("Agrega estados y transiciones para poder minimizar.");
        return;
    }

    const afd = {
        states: [...states],
        transitions: [...transitions]
    };

    const minimizedAFD = minimize(afd);
    renderMinimizedAFD(minimizedAFD);
}

// Algoritmo de minimización de estados
function minimize(afd) {
    let partition = [[...afd.states]];  // Inicialmente, todos los estados están en la misma partición
    let newPartition;

    do {
        newPartition = refinePartition(partition, afd);
        if (!areEqualPartitions(partition, newPartition)) {
            partition = newPartition;
        }
    } while (!areEqualPartitions(partition, newPartition));

    const minimizedAFD = buildMinimizedAFD(partition, afd);
    return minimizedAFD;
}

function refinePartition(partition, afd) {
    const newPartition = [];

    partition.forEach(group => {
        const refinedGroups = splitGroup(group, partition, afd);
        newPartition.push(...refinedGroups);
    });

    return newPartition;
}

function splitGroup(group, partition, afd) {
    const first = group[0];
    const newGroups = [[first]];

    for (let i = 1; i < group.length; i++) {
        const state = group[i];
        let added = false;

        for (let j = 0; j < newGroups.length; j++) {
            if (areEquivalent(first, state, partition, afd)) {
                newGroups[j].push(state);
                added = true;
                break;
            }
        }

        if (!added) {
            newGroups.push([state]);
        }
    }

    return newGroups;
}

function areEquivalent(state1, state2, partition, afd) {
    const transitions1 = afd.transitions.filter(t => t.from === state1);
    const transitions2 = afd.transitions.filter(t => t.from === state2);

    if (transitions1.length !== transitions2.length) return false;

    return transitions1.every(t1 => {
        const t2 = transitions2.find(t => t.symbol === t1.symbol);
        return t2 && areInSameGroup(t1.to, t2.to, partition);
    });
}

function areInSameGroup(state1, state2, partition) {
    return partition.some(group => group.includes(state1) && group.includes(state2));
}

function areEqualPartitions(p1, p2) {
    if (p1.length !== p2.length) return false;
    return p1.every(group1 => p2.some(group2 => group1.every(s => group2.includes(s))));
}

function buildMinimizedAFD(partition, afd) {
    const newStates = partition.map(group => group.join(","));
    const newTransitions = afd.transitions.map(t => {
        const fromGroup = partition.find(group => group.includes(t.from)).join(",");
        const toGroup = partition.find(group => group.includes(t.to)).join(",");
        return { from: fromGroup, to: toGroup, symbol: t.symbol };
    });

    return {
        states: newStates,
        transitions: newTransitions
    };
}

function renderMinimizedAFD(afd) {
    renderAutomata(afd, 'minimizedAFD');
}

// Función para renderizar el AFD usando Viz.js
function renderAutomata(automaton, elementId) {
    let dot = 'digraph G {\n  rankdir=LR;\n';

    // Estado inicial con una flecha
    dot += `  qi [label="", shape=none];\n`;
    dot += `  qi -> "${automaton.states[0]}";\n`;

    // Agregar estados
    automaton.states.forEach(stateName => {
        let shape = "circle";
        if (automaton.finalStates && automaton.finalStates.includes(stateName)) {
            shape = "doublecircle"; // Estados finales como doble círculo
        }
        dot += `  "${stateName}" [shape=${shape}];\n`;
    });

    // Agregar transiciones
    automaton.transitions.forEach(t => {
        let symbol = t.symbol === "ε" ? "ε" : t.symbol;
        dot += `  "${t.from}" -> "${t.to}" [label="${symbol}"];\n`;
    });

    dot += '}';

    // Renderizar el autómata usando Viz.js
    const viz = new Viz();
    viz.renderSVGElement(dot)
        .then(svgElement => {
            const automataDiv = document.getElementById(elementId);
            automataDiv.innerHTML = "";

            const svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svgContainer.setAttribute("width", "100%");
            svgContainer.setAttribute("height", "100%");
            svgContainer.style.border = "1px solid #ccc";
            svgContainer.style.background = "#fff";

            const innerGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            svgContainer.appendChild(innerGroup);

            const innerSvgGroup = svgElement.querySelector("g");

            if (innerSvgGroup) {
                const clonedGroup = innerSvgGroup.cloneNode(true);
                innerGroup.appendChild(clonedGroup);
            }

            automataDiv.appendChild(svgContainer);

            const svg = d3.select(svgContainer);
            const g = d3.select(innerGroup);

            const zoom = d3.zoom()
                .scaleExtent([0.1, 5])
                .on('zoom', function () {
                    g.attr('transform', d3.event.transform);
                });

            svg.call(zoom);

            const bbox = innerGroup.getBBox();
            svgContainer.setAttribute("viewBox", `${bbox.x - 50} ${bbox.y - 50} ${bbox.width + 100} ${bbox.height + 100}`);
        })
        .catch(error => {
            console.error(error);
        });
}

// Función para generar los checkboxes de estados finales
function generateFinalStatesCheckboxes() {
    const finalStatesContainer = document.getElementById('finalStatesCheckboxes');
    finalStatesContainer.innerHTML = '';

    states.forEach((estado, index) => {
        const div = document.createElement('div');
        div.classList.add('col-4');

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

        formCheck.appendChild(checkbox);
        formCheck.appendChild(label);
        div.appendChild(formCheck);
        finalStatesContainer.appendChild(div);
    });
}
