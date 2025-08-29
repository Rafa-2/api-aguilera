const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { stringify } = require('csv-stringify');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

console.log('Server OK');

// Middleware - CORS configurado para permitir cualquier origen
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuración de MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hmi_data',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
const API_PREFIX = '/api_aguilera';
// Endpoint para recibir datos del script Lua
app.post(`${API_PREFIX}/api/datos`, async (req, res) => {
    try {
        const {
            qm_1,
            q_bruto_1,
            densidad_1,
            bsw_1,
            q_net_oil_1,
            q_agua_1,
            temp_1,
            total_oil_1,
            pres_f_liq_1,
            driv_gain_liq_1,
            driv_gain_gas_1,
            pres_f_gas_1,
            qv_1,
            temp_cg_1,
            d_diluente_1,
            apr_valv_1,
            sept_valv_1
        } = req.body;

        const query = `
            INSERT INTO mediciones 
            (qm_1, q_bruto_1, densidad_1, bsw_1, q_net_oil_1, q_agua_1, temp_1, total_oil_1, 
             pres_f_liq_1, driv_gain_liq_1, driv_gain_gas_1, pres_f_gas_1, qv_1, temp_cg_1, 
             d_diluente_1, apr_valv_1, sept_valv_1)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            qm_1 || 0,
            q_bruto_1 || 0,
            densidad_1 || 0,
            bsw_1 || 0,
            q_net_oil_1 || 0,
            q_agua_1 || 0,
            temp_1 || 0,
            total_oil_1 || 0,
            pres_f_liq_1 || 0,
            driv_gain_liq_1 || 0,
            driv_gain_gas_1 || 0,
            pres_f_gas_1 || 0,
            qv_1 || 0,
            temp_cg_1 || 0,
            d_diluente_1 || 0,
            apr_valv_1 || 0,
            sept_valv_1 || 0
        ];

        const [result] = await pool.execute(query, values);
        
        // Obtener el registro insertado
        const [insertedRecord] = await pool.execute(
            'SELECT * FROM mediciones WHERE id = ?',
            [result.insertId]
        );
        
        console.log('Datos insertados:', insertedRecord[0]);
        res.status(201).json({
            message: 'Datos almacenados correctamente',
            data: insertedRecord[0]
        });
    } catch (error) {
        console.error('Error al insertar datos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para consultar datos con filtros
app.get(`${API_PREFIX}/api/datos`, async (req, res) => {
    try {
        const { horas, limite, pagina } = req.query;
        let query = 'SELECT * FROM mediciones';
        let conditions = [];
        let values = [];
        let counter = 1;

        // Filtrar por últimas X horas
        if (horas) {
            conditions.push(`fecha_creacion >= DATE_SUB(NOW(), INTERVAL ? HOUR)`);
            values.push(parseInt(horas));
            counter++;
        }

        // Aplicar condiciones si existen
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Ordenar por fecha más reciente
        query += ' ORDER BY fecha_creacion DESC';

        // Aplicar límite si se especifica
        if (limite) {
            query += ` LIMIT ?`;
            values.push(parseInt(limite));
            counter++;
        }

        // Aplicar paginación si se especifica
        if (pagina && limite) {
            const offset = (parseInt(pagina) - 1) * parseInt(limite);
            query += ` OFFSET ?`;
            values.push(offset);
        }

        const [rows] = await pool.execute(query, values);
        res.json({
            total: rows.length,
            datos: rows
        });
    } catch (error) {
        console.error('Error al consultar datos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para descargar datos en CSV
app.get(`${API_PREFIX}/api/datos/csv`, async (req, res) => {
    try {
        const { horas, todas } = req.query;
        let query = 'SELECT * FROM mediciones';
        let values = [];

        // Filtrar por últimas X horas o obtener todas
        if (horas) {
            query += ' WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL ? HOUR) ORDER BY fecha_creacion DESC';
            values.push(parseInt(horas));
        } else if (todas === 'true') {
            query += ' ORDER BY fecha_creacion DESC';
        } else {
            return res.status(400).json({ 
                error: 'Debe especificar "horas" o "todas=true"' 
            });
        }

        const [result] = await pool.execute(query, values);
        
        // Convertir a CSV
        stringify(result, {
            header: true,
            columns: {
                id: 'ID',
                fecha_creacion: 'Fecha Creación',
                qm_1: 'Caudal Másico',
                q_bruto_1: 'Caudal Bruto',
                densidad_1: 'Densidad',
                bsw_1: 'BSW',
                q_net_oil_1: 'Caudal Neto Oil',
                q_agua_1: 'Caudal Agua',
                temp_1: 'Temperatura',
                total_oil_1: 'Total Oil',
                pres_f_liq_1: 'Presión Flujo Líquido',
                driv_gain_liq_1: 'Drive Gain Líquido',
                driv_gain_gas_1: 'Drive Gain Gas',
                pres_f_gas_1: 'Presión Flujo Gas',
                qv_1: 'Caudal Volumétrico',
                temp_cg_1: 'Temperatura Gas',
                d_diluente_1: 'Densidad Diluente',
                apr_valv_1: 'Apertura Válvula',
                sept_valv_1: 'Válvula Separadora'
            }
        }, (err, output) => {
            if (err) {
                throw err;
            }
            
            // Configurar headers para descarga
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="datos_hmi.csv"');
            res.send(output);
        });
    } catch (error) {
        console.error('Error al generar CSV:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para obtener estadísticas básicas
app.get(`${API_PREFIX}/api/estadisticas`, async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_registros,
                MIN(fecha_creacion) as fecha_mas_antigua,
                MAX(fecha_creacion) as fecha_mas_reciente,
                AVG(temp_1) as temperatura_promedio,
                AVG(driv_gain_gas_1) as drive_gain_gas_promedio,
                AVG(q_bruto_1) as caudal_bruto_promedio,
                AVG(densidad_1) as densidad_promedio,
                AVG(bsw_1) as bsw_promedio
            FROM mediciones
        `;

        const [result] = await pool.execute(query);
        res.json(result[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Health check endpoint
app.get(`${API_PREFIX}/health`, (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple API status endpoint for Lua
app.get(`${API_PREFIX}/api/status`, (req, res) => {
    res.json({ message: 'API OK' });
});

// Test database connection endpoint
app.get(`${API_PREFIX}/api/test-db`, async (req, res) => {
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    
    try {
        const [result] = await pool.execute('SELECT NOW() as current_time');
        
        if (acceptsHtml) {
            res.send(`
                <html>
                    <head>
                        <title>Database Test</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                display: flex; 
                                justify-content: center; 
                                align-items: center; 
                                height: 100vh; 
                                margin: 0; 
                                background-color: #f0f0f0; 
                            }
                            .message { 
                                padding: 20px; 
                                border-radius: 10px; 
                                text-align: center; 
                                font-size: 24px; 
                                font-weight: bold; 
                            }
                            .success { 
                                background-color: #d4edda; 
                                color: #155724; 
                                border: 2px solid #c3e6cb; 
                            }
                            .time { 
                                font-size: 16px; 
                                margin-top: 10px; 
                                font-weight: normal; 
                            }
                        </style>
                    </head>
                    <body>
                        <div class="message success">
                            ✅ Database connected successfully
                            <div class="time">Connected at: ${result[0].current_time}</div>
                        </div>
                    </body>
                </html>
            `);
        } else {
            res.json({ 
                status: 'Database connected successfully', 
                time: result[0].current_time 
            });
        }
    } catch (error) {
        console.error('Database connection error:', error);
        
        if (acceptsHtml) {
            res.status(500).send(`
                <html>
                    <head>
                        <title>Database Test</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                display: flex; 
                                justify-content: center; 
                                align-items: center; 
                                height: 100vh; 
                                margin: 0; 
                                background-color: #f0f0f0; 
                            }
                            .message { 
                                padding: 20px; 
                                border-radius: 10px; 
                                text-align: center; 
                                font-size: 24px; 
                                font-weight: bold; 
                            }
                            .error { 
                                background-color: #f8d7da; 
                                color: #721c24; 
                                border: 2px solid #f5c6cb; 
                            }
                            .details { 
                                font-size: 16px; 
                                margin-top: 10px; 
                                font-weight: normal; 
                            }
                        </style>
                    </head>
                    <body>
                        <div class="message error">
                            ❌ Database connection failed
                            <div class="details">Error: ${error.message}</div>
                        </div>
                    </body>
                </html>
            `);
        } else {
            res.status(500).json({ 
                error: 'Database connection failed', 
                details: error.message 
            });
        }
    }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Servir interfaz web simple
app.get(`${API_PREFIX}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(port, () => {
    console.log('Listening');
    console.log(`Servidor API ejecutándose en http://localhost:${port}`);
    console.log('Configurado para servidor privado de Namecheap');
});

module.exports = app;
