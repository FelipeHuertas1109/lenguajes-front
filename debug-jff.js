/**
 * Script de diagnóstico para archivos JFF
 * Ejecutar con: node debug-jff.js <archivo.jff>
 */

const fs = require('fs');

function analyzeJFF(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extraer todos los IDs de estados
  const stateIdRegex = /<state id="([^"]+)"/g;
  const stateIds = [];
  let match;
  
  while ((match = stateIdRegex.exec(content)) !== null) {
    stateIds.push(match[1]);
  }
  
  console.log('\n=== Análisis del archivo JFF ===\n');
  console.log(`Archivo: ${filePath}`);
  console.log(`Total de estados: ${stateIds.length}\n`);
  
  // Verificar IDs negativos
  const negativeIds = stateIds.filter(id => {
    const numId = parseInt(id);
    return !isNaN(numId) && numId < 0;
  });
  
  if (negativeIds.length > 0) {
    console.log('❌ IDs NEGATIVOS ENCONTRADOS:');
    negativeIds.forEach(id => console.log(`  - ${id}`));
    console.log('');
  } else {
    console.log('✅ No hay IDs negativos\n');
  }
  
  // Verificar duplicados
  const uniqueIds = new Set(stateIds);
  if (uniqueIds.size !== stateIds.length) {
    console.log('❌ IDs DUPLICADOS ENCONTRADOS:');
    const counts = {};
    stateIds.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });
    Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .forEach(([id, count]) => {
        console.log(`  - ID "${id}" aparece ${count} veces`);
      });
    console.log('');
  } else {
    console.log('✅ No hay IDs duplicados\n');
  }
  
  // Mostrar todos los IDs
  console.log('Lista completa de IDs:');
  stateIds.forEach((id, index) => {
    console.log(`  ${index}: ${id}`);
  });
  console.log('');
  
  // Analizar transiciones
  const fromRegex = /<from>([^<]+)<\/from>/g;
  const toRegex = /<to>([^<]+)<\/to>/g;
  const transitionFroms = [];
  const transitionTos = [];
  
  while ((match = fromRegex.exec(content)) !== null) {
    transitionFroms.push(match[1]);
  }
  
  while ((match = toRegex.exec(content)) !== null) {
    transitionTos.push(match[1]);
  }
  
  // Verificar referencias inválidas
  const allReferences = new Set([...transitionFroms, ...transitionTos]);
  const invalidRefs = Array.from(allReferences).filter(ref => !uniqueIds.has(ref));
  
  if (invalidRefs.length > 0) {
    console.log('❌ REFERENCIAS A ESTADOS QUE NO EXISTEN:');
    invalidRefs.forEach(ref => console.log(`  - ${ref}`));
    console.log('');
  } else {
    console.log('✅ Todas las transiciones referencian estados válidos\n');
  }
}

// Ejecutar
if (process.argv.length < 3) {
  console.log('Uso: node debug-jff.js <archivo.jff>');
  process.exit(1);
}

try {
  analyzeJFF(process.argv[2]);
} catch (error) {
  console.error('Error al analizar el archivo:', error.message);
  process.exit(1);
}

