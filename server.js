const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuração
const ADMIN_PASSWORD = '184470x7'; // Senha simples para o dashboard

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Rota Principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// API: Registrar Inscrição Inicial
app.post('/api/register', (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Dados inválidos' });

    // Correção: Usar 'payment_status' e adicionar 'payment_method' padrão
    db.run(
        `INSERT INTO registrations (name, email, payment_status, payment_method) VALUES (?, ?, 'pending', '7me_link')`,
        [name, email],
        function(err) {
            if (err) {
                // Se já existe, atualiza nome
                db.run(`UPDATE registrations SET name = ? WHERE email = ?`, [name, email]);
                return res.json({ success: true, message: 'Atualizado' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// API: Concluir Inscrição (Apenas confirmação)
app.post('/api/complete', (req, res) => {
    const { email, transaction_id } = req.body;
    console.log(`Recebida confirmação de pagamento para: ${email}`);

    if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório.' });
    }

    // Atualiza apenas o status e ID da transação
    db.run(
        `UPDATE registrations SET payment_status = 'completed', payment_id = ?, payment_confirmed_at = CURRENT_TIMESTAMP WHERE email = ?`,
        [transaction_id, email],
        function(err) {
            if (err) {
                console.error('Erro ao atualizar banco:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Inscrição não encontrada.' });
            }
            res.json({ success: true });
        }
    );
});

// API: Listar Inscrições (Dashboard)
app.get('/api/registrations', (req, res) => {
    // Autenticação simples
    const auth = req.headers['x-admin-auth'];
    if (auth !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    db.all(`SELECT * FROM registrations ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// API: Login Check
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Senha incorreta' });
    }
});

// API: Verificar Pagamento (Admin)
app.post('/api/verify-payment', (req, res) => {
    // Autenticação simples
    const auth = req.headers['x-admin-auth'];
    if (auth !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    const { id } = req.body;
    
    db.run(
        `UPDATE registrations SET payment_status = 'verified' WHERE id = ?`,
        [id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// API: Inscrição Manual (Admin)
app.post('/api/manual-register', (req, res) => {
    // Autenticação simples
    const auth = req.headers['x-admin-auth'];
    if (auth !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    const { name, email, whatsapp, birthdate, cpf, tshirt_size, distance, payment_status } = req.body;
    
    // Insere manualmente
    db.run(
        `INSERT INTO registrations (name, email, whatsapp, birthdate, cpf, tshirt_size, distance, payment_status, payment_method, created_at, payment_confirmed_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [name, email, whatsapp, birthdate, cpf, tshirt_size, distance, payment_status || 'verified'],
        function(err) {
            if (err) {
                // Se for erro de email duplicado
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email já cadastrado.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// API: Atualizar Inscrição (Admin - Edição)
app.post('/api/update-registration', (req, res) => {
    // Autenticação simples
    const auth = req.headers['x-admin-auth'];
    if (auth !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    const { id, name, email, whatsapp, birthdate, cpf, tshirt_size, distance, payment_status } = req.body;
    
    db.run(
        `UPDATE registrations SET name = ?, email = ?, whatsapp = ?, birthdate = ?, cpf = ?, tshirt_size = ?, distance = ?, payment_status = ? WHERE id = ?`,
        [name, email, whatsapp, birthdate, cpf, tshirt_size, distance, payment_status, id],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email já cadastrado em outra inscrição.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        }
    );
});

// API: Excluir Inscrição (Admin)
app.post('/api/delete-registration', (req, res) => {
    // Autenticação simples
    const auth = req.headers['x-admin-auth'];
    if (auth !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta' });
    }

    const { id } = req.body;
    
    db.run(
        `DELETE FROM registrations WHERE id = ?`,
        [id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// API: Gerar PIX (Automação)
app.post('/api/generate-pix', (req, res) => {
    const { name, email, whatsapp, birthdate, cpf, tshirt_size, distance } = req.body;
    if (!name || !email || !whatsapp || !tshirt_size || !birthdate || !cpf || !distance) {
        console.log('Faltando dados:', { name, email, whatsapp, tshirt_size, birthdate, cpf, distance }); // Debug
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    console.log(`Iniciando geração de PIX para: ${name} (${email}), T-Shirt: ${tshirt_size}, Distância: ${distance}`);

    // Executa o script de automação como um processo filho
    const child = spawn('node', ['services/generate_pix.js', name, email]);

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
        output += data.toString();
    });

    child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(`[Playwright Error]: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`Processo de geração finalizado com código ${code}`);
        console.log(`Saída bruta do processo: "${output}"`); // Debug log
        
        try {
            // Tenta encontrar o JSON na saída (pode haver logs antes)
            const lines = output.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const result = JSON.parse(lastLine);

            if (result.success && result.pixCode) {
                // Atualiza o banco de dados com o ID do pagamento e todos os dados
                const paymentId = result.paymentId || null;
                
                db.run(
                    `INSERT INTO registrations (name, email, whatsapp, birthdate, cpf, tshirt_size, distance, payment_status, payment_method, payment_id) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_pix', 'pix', ?)
                     ON CONFLICT(email) DO UPDATE SET 
                     name = excluded.name,
                     whatsapp = excluded.whatsapp,
                     birthdate = excluded.birthdate,
                     cpf = excluded.cpf,
                     tshirt_size = excluded.tshirt_size,
                     distance = excluded.distance,
                     payment_status = 'pending_pix',
                     payment_method = 'pix',
                     payment_id = excluded.payment_id`,
                    [name, email, whatsapp, birthdate, cpf, tshirt_size, distance, paymentId],
                    (err) => {
                        if (err) console.error('Erro ao salvar no banco:', err);
                    }
                );

                return res.json({ success: true, pixCode: result.pixCode, paymentId: result.paymentId });
            } else {
                return res.status(500).json({ error: result.error || 'Falha na geração do PIX.' });
            }
        } catch (e) {
            console.error('Erro ao processar saída:', e);
            console.error('Saída bruta:', output);
            return res.status(500).json({ error: 'Erro interno ao processar resposta da automação.' });
        }
    });
});

const PORT = 3020;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
