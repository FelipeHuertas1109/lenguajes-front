/**
 * Script para probar la API de Django directamente
 * y verificar la estructura del DFA que devuelve
 * 
 * Uso: node test-api-response.js "expresion_regular"
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000/';

async function testDjangoAPI(regex) {
  try {
    const url = new URL('api/regex-to-dfa/', BASE_URL);
    url.searchParams.append('regex', regex);
    
    console.log(`\n🔍 Probando API de Django...`);
    console.log(`URL: ${url.toString()}\n`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Respuesta:', text.substring(0, 500));
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ Respuesta recibida correctamente\n');
    console.log('=== ESTRUCTURA DEL DFA ===\n');
    
    if (!data.success) {
      console.error('❌ La API reportó un error:', data.error);
      return;
    }
    
    if (!data.dfa) {
      console.error('❌ No hay DFA en la respuesta');
      return;
    }
    
    const dfa = data.dfa;
    
    // Analizar estados
    console.log(`📊 Número de estados: ${dfa.states.length}`);
    console.log(`Estados: ${JSON.stringify(dfa.states)}\n`);
    
    console.log(`🎯 Estado inicial: ${dfa.start}`);
    console.log(`✓ Estados de aceptación: ${JSON.stringify(dfa.accepting)}\n`);
    
    console.log(`🔤 Alfabeto: ${JSON.stringify(dfa.alphabet)}\n`);
    
    console.log(`🔀 Transiciones: ${dfa.transitions.length}`);
    if (dfa.transitions.length > 0) {
      console.log('Primeras 5 transiciones:');
      dfa.transitions.slice(0, 5).forEach(t => {
        console.log(`  ${t.from} --[${t.symbol}]--> ${t.to}`);
      });
      if (dfa.transitions.length > 5) {
        console.log(`  ... y ${dfa.transitions.length - 5} más`);
      }
    }
    
    // Validaciones
    console.log('\n=== VALIDACIONES ===\n');
    
    // Verificar IDs negativos
    const negativeIds = dfa.states.filter(id => {
      const numId = parseInt(id);
      return !isNaN(numId) && numId < 0;
    });
    
    if (negativeIds.length > 0) {
      console.error('❌ IDs NEGATIVOS DETECTADOS:', negativeIds);
    } else {
      console.log('✅ No hay IDs negativos');
    }
    
    // Verificar duplicados
    const uniqueStates = new Set(dfa.states);
    if (uniqueStates.size !== dfa.states.length) {
      console.error('❌ IDs DUPLICADOS DETECTADOS');
      const counts = {};
      dfa.states.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
      Object.entries(counts)
        .filter(([_, count]) => count > 1)
        .forEach(([id, count]) => {
          console.error(`  - ID "${id}" aparece ${count} veces`);
        });
    } else {
      console.log('✅ No hay IDs duplicados');
    }
    
    // Verificar que el estado inicial existe
    if (!dfa.states.includes(dfa.start)) {
      console.error(`❌ El estado inicial "${dfa.start}" no existe en la lista de estados`);
    } else {
      console.log('✅ El estado inicial existe');
    }
    
    // Verificar que los estados de aceptación existen
    const invalidAccepting = dfa.accepting.filter(id => !dfa.states.includes(id));
    if (invalidAccepting.length > 0) {
      console.error('❌ Estados de aceptación inválidos:', invalidAccepting);
    } else {
      console.log('✅ Todos los estados de aceptación existen');
    }
    
    // Verificar transiciones
    let invalidTransitions = 0;
    dfa.transitions.forEach(t => {
      if (!dfa.states.includes(t.from)) {
        console.error(`❌ Transición inválida: estado origen "${t.from}" no existe`);
        invalidTransitions++;
      }
      if (!dfa.states.includes(t.to)) {
        console.error(`❌ Transición inválida: estado destino "${t.to}" no existe`);
        invalidTransitions++;
      }
    });
    
    if (invalidTransitions === 0) {
      console.log('✅ Todas las transiciones son válidas');
    }
    
    // Verificar tipos de datos
    console.log('\n=== TIPOS DE DATOS ===\n');
    console.log(`Tipo de states: ${Array.isArray(dfa.states) ? 'Array' : typeof dfa.states}`);
    console.log(`Tipo de start: ${typeof dfa.start}`);
    console.log(`Tipo de accepting: ${Array.isArray(dfa.accepting) ? 'Array' : typeof dfa.accepting}`);
    console.log(`Tipo de transitions: ${Array.isArray(dfa.transitions) ? 'Array' : typeof dfa.transitions}`);
    
    if (dfa.states.length > 0) {
      console.log(`Tipo del primer estado: ${typeof dfa.states[0]}`);
    }
    
    // Resumen
    console.log('\n=== RESUMEN ===\n');
    const issues = [];
    if (negativeIds.length > 0) issues.push('IDs negativos');
    if (uniqueStates.size !== dfa.states.length) issues.push('IDs duplicados');
    if (!dfa.states.includes(dfa.start)) issues.push('Estado inicial inválido');
    if (invalidAccepting.length > 0) issues.push('Estados de aceptación inválidos');
    if (invalidTransitions > 0) issues.push('Transiciones inválidas');
    
    if (issues.length > 0) {
      console.log('❌ PROBLEMAS DETECTADOS:', issues.join(', '));
      console.log('\n⚠️ Este DFA NO se puede convertir correctamente a JFF');
    } else {
      console.log('✅ DFA VÁLIDO - Se puede convertir a JFF sin problemas');
    }
    
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error al probar la API:', error.message);
    
    if (error.message.includes('fetch failed')) {
      console.error(`\n💡 Verifica que el servidor Django esté corriendo en ${BASE_URL}`);
    }
  }
}

// Ejecutar
if (process.argv.length < 3) {
  console.log('Uso: node test-api-response.js "expresion_regular"');
  console.log('');
  console.log('Ejemplos:');
  console.log('  node test-api-response.js "a"');
  console.log('  node test-api-response.js "a|b"');
  console.log('  node test-api-response.js "(a|b)*abb(a|b)*"');
  console.log('');
  console.log('Variables de entorno:');
  console.log('  BASE_URL - URL del servidor Django (default: http://localhost:8000/)');
  process.exit(1);
}

const regex = process.argv[2];
testDjangoAPI(regex);

