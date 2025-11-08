function genAutomataSVG(svgId, start) {
    'use strict';
    var ids = {},
        node,
        next,
        i,
        front = 0,
        queue = [start],
        g = new dagreD3.graphlib.Graph().setGraph({}),
        svg = d3.select(svgId),
        inner = svg.select('g'),
        render = new dagreD3.render();

    // Si no existe el grupo <g>, lo creamos
    if (inner.empty()) {
        inner = svg.append("g");
    }

    // Configurar el zoom utilizando D3.js v4
    var zoom = d3.zoom().on("zoom", function () {
        inner.attr("transform", d3.event.transform);
    });

    svg.call(zoom);

    // Agregamos el nodo inicial
    g.setNode(-1, { shape: 'text', label: '' });

    while (front < queue.length) {
        node = queue[front];
        ids[node.id] = node;

        if (node === start) {
            g.setEdge(-1, node.id, { label: '' });
        }

        if (node.type === '' || node.type === 'start') {
            node.type = 'normal';
        }

        g.setNode(node.id, { shape: node.type, label: node.id });

        for (i = 0; i < node.edges.length; i += 1) {
            next = node.edges[i][1];
            g.setEdge(node.id, next.id, { label: node.edges[i][0] });
            if (!ids.hasOwnProperty(next.id)) {
                queue.push(next);
            }
        }
        front += 1;
    }

    render.shapes().text = function (parent, bbox, node) {
        var w = bbox.width,
            h = bbox.height,
            rx = Math.min(w / 2, h / 2),
            ry = rx,
            point = {x: w / 2, y: h / 2},
            shapeSvg = parent
                .insert("ellipse", ":first-child")
                .attr("cx", point.x)
                .attr("cy", point.y)
                .attr("rx", rx)
                .attr("ry", ry)
                .attr("fill-opacity", "0")
                .attr("stroke-opacity", "0")
                .attr("transform", "translate(" + (-w / 2) + "," + (-h / 2) + ")");

        node.intersect = function (point) {
            return dagreD3.intersect.ellipse(node, rx, ry, point);
        };
        return shapeSvg;
    };

    render.shapes().normal = function (parent, bbox, node) {
        var w = bbox.width,
            h = bbox.height,
            rx = Math.min(w / 2, h / 2),
            ry = rx,
            point = {x: w / 2, y: h / 2},
            shapeSvg = parent
                .insert("ellipse", ":first-child")
                .attr("cx", point.x)
                .attr("cy", point.y)
                .attr("rx", rx)
                .attr("ry", ry)
                .attr("fill", "white")
                .attr("fill-opacity", "0")
                .attr("stroke", "black")
                .attr("transform", "translate(" + (-w / 2) + "," + (-h / 2) + ")");

        node.intersect = function (point) {
            return dagreD3.intersect.ellipse(node, rx, ry, point);
        };
        return shapeSvg;
    };

    render.shapes().accept = function (parent, bbox, node) {
        var w = bbox.width,
            h = bbox.height,
            rx = Math.min(w / 2, h / 2),
            ry = rx,
            point = {x: w / 2, y: h / 2},
            shapeSvg = parent
                .insert("ellipse", ":first-child")
                .attr("cx", point.x)
                .attr("cy", point.y)
                .attr("rx", rx)
                .attr("ry", ry)
                .attr("accept", '')
                .attr("fill", "white")
                .attr("fill-opacity", "0")
                .attr("stroke", "black")
                .attr("transform", "translate(" + (-w / 2) + "," + (-h / 2) + ")");

        shapeSvg = parent
            .insert("ellipse", ":first-child")
            .attr("cx", point.x)
            .attr("cy", point.y)
            .attr("rx", rx - 2)
            .attr("ry", ry - 2)
            .attr("accept", '')
            .attr("fill", "white")
            .attr("fill-opacity", "0")
            .attr("stroke", "black")
            .attr("transform", "translate(" + (-w / 2) + "," + (-h / 2) + ")");

        node.intersect = function (point) {
            return dagreD3.intersect.ellipse(node, rx, ry, point);
        };
        return shapeSvg;
    };

    g.graph().rankdir = 'LR'; // Direccionamos el grafo de izquierda a derecha
    render(inner, g);

    // Obtener las dimensiones del grafo renderizado
    var graphWidth = g.graph().width;
    var graphHeight = g.graph().height;

    // Obtener las dimensiones del contenedor SVG
    var svgWidth = svg.node().getBoundingClientRect().width;
    var svgHeight = graphHeight + 100; // Ajustar altura del SVG con algo de margen

    // Calcular el offset para centrar el gráfico en el área del SVG
    var xOffset = (svgWidth - graphWidth) / 2;
    var yOffset = (svgHeight - graphHeight) / 2; // Centrar también verticalmente
    var initialScale = 0.9; // Ajustar la escala inicial del gráfico

    // Establecer el tamaño del SVG y aplicar transformación de centrado
    svg.attr('height', svgHeight);
    svg.call(zoom.transform, d3.zoomIdentity.translate(xOffset, yOffset).scale(initialScale));

    // Ajustar las dimensiones internas del SVG
    svg.attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
}
