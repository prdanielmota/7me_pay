const fs = require('fs');

try {
  const content = fs.readFileSync('network_log.json', 'utf8');
  // O arquivo pode ter sido cortado no final se foi interrompido abruptamente
  // Vamos tentar corrigir o JSON se necessário, ou apenas parsear o que der.
  let logs;
  try {
    logs = JSON.parse(content);
  } catch (e) {
    console.log('JSON inválido (provavelmente incompleto). Tentando recuperar dados parciais...');
    // Tenta encontrar o último '},' e fechar o array
    const lastComma = content.lastIndexOf('},');
    if (lastComma > 0) {
      const fixedContent = content.substring(0, lastComma + 2) + ']';
      try {
        logs = JSON.parse(fixedContent);
      } catch (e2) {
        console.log('Não foi possível recuperar o JSON automaticamente.');
        process.exit(1);
      }
    } else {
        process.exit(1);
    }
  }

  console.log(`Total de logs: ${logs.length}`);

  // Filtra respostas de pagamento
  const paymentResponses = logs.filter(log => 
    log.type === 'response' && 
    log.url.includes('/api/payments/') &&
    log.body
  );

  console.log(`Respostas de pagamento encontradas: ${paymentResponses.length}`);

  paymentResponses.forEach((resp, index) => {
    console.log(`\n--- Resposta ${index + 1} ---`);
    console.log(`URL: ${resp.url}`);
    console.log(`Status: ${resp.status}`);
    console.log('Body:', JSON.stringify(resp.body, null, 2));
  });

  // Verifica também a criação da doação temporária
  const tempDonation = logs.filter(log => 
    log.type === 'response' && 
    log.url.includes('/api/guest/temporary-donations')
  );
  
  if (tempDonation.length > 0) {
      console.log('\n--- Doação Temporária Criada ---');
      tempDonation.forEach(d => {
          console.log(`Status: ${d.status}`);
          console.log('Body:', JSON.stringify(d.body, null, 2));
      });
  }

} catch (err) {
  console.error('Erro ao ler arquivo:', err);
}
