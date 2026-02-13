// Script para inserir setores iniciais no Neon
import { sql } from './turso-db.js';

async function insertSetores() {
  console.log('[INSERT] Conectando ao Neon...');
  try {
    // Inserir UTI
    const id1 = crypto.randomUUID();
    await sql`INSERT INTO setores (id, nome) VALUES (${id1}, 'UTI')`;
    console.log('✅ UTI inserida:', id1);

    // Inserir CME
    const id2 = crypto.randomUUID();
    await sql`INSERT INTO setores (id, nome) VALUES (${id2}, 'CME')`;
    console.log('✅ CME inserida:', id2);

    // Verificar
    const result = await sql`SELECT * FROM setores ORDER BY nome`;
    console.log('\n✅ Setores no banco:');
    result.forEach(s => console.log(`   ${s.id} - ${s.nome}`));
    
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error(err);
    process.exit(1);
  }
}

insertSetores();
