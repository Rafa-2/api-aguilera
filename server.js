const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
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

// Configuración de PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Endpoint para recibir datos del script Lua
app.post('/api/datos', async (req, res) => {
    try {
        const {
            oa_brute,
            boensidad,
            ssw,
            a_neto,
            temp_gas,
            densidad_diluente,
            drive_gain_gas,
            column1
        } = req.body;

        const query = `
            INSERT INTO mediciones 
            (oa_brute, boensidad, ssw, a_neto, temp_gas, densidad_diluente, drive_gain_gas, column1)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            oa_brute || 0,
            boensidad || 0,
            ssw || 0,
            a_neto || 0,
            temp_gas || 0,
            densidad_diluente || 0,
            drive_gain_gas || 0,
            column1 || 0
        ];

        const result = await pool.query(query, values);
        
        console.log('Datos insertados:', result.rows[0]);
        res.status(201).json({
            message: 'Datos almacenados correctamente',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al insertar datos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para consultar datos con filtros
app.get('/api/datos', async (req, res) => {
    try {
        const { horas, limite, pagina } = req.query;
        let query = 'SELECT * FROM mediciones';
        let conditions = [];
        let values = [];
        let counter = 1;

        // Filtrar por últimas X horas
        if (horas) {
            conditions.push(`fecha_creacion >= NOW() - INTERVAL $${counter} hour`);
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
            query += ` LIMIT $${counter}`;
            values.push(parseInt(limite));
            counter++;
        }

        // Aplicar paginación si se especifica
        if (pagina && limite) {
            const offset = (parseInt(pagina) - 1) * parseInt(limite);
            query += ` OFFSET $${counter}`;
            values.push(offset);
        }

        const result = await pool.query(query, values);
        res.json({
            total: result.rowCount,
            datos: result.rows
        });
    } catch (error) {
        console.error('Error al consultar datos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para descargar datos en CSV
app.get('/api/datos/csv', async (req, res) => {
    try {
        const { horas, todas } = req.query;
        let query = 'SELECT * FROM mediciones';
        let values = [];

        // Filtrar por últimas X horas o obtener todas
        if (horas) {
            query += ' WHERE fecha_creacion >= NOW() - INTERVAL $1 hour ORDER BY fecha_creacion DESC';
            values.push(parseInt(horas));
        } else if (todas === 'true') {
            query += ' ORDER BY fecha_creacion DESC';
        } else {
            return res.status(400).json({ 
                error: 'Debe especificar "horas" o "todas=true"' 
            });
        }

        const result = await pool.query(query, values);
        
        // Convertir a CSV
        stringify(result.rows, {
            header: true,
            columns: {
                id: 'ID',
                fecha_creacion: 'Fecha Creación',
                oa_brute: 'OA Brute',
                boensidad: 'Boensidad',
                ssw: 'SSW',
                a_neto: 'A Neto',
                temp_gas: 'Temp Gas',
                densidad_diluente: 'Densidad Diluente',
                drive_gain_gas: 'Drive Gain Gas',
                column1: 'Column1'
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
app.get('/api/estadisticas', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_registros,
                MIN(fecha_creacion) as fecha_mas_antigua,
                MAX(fecha_creacion) as fecha_mas_reciente,
                AVG(temp_gas) as temperatura_promedio,
                AVG(drive_gain_gas) as drive_gain_promedio
            FROM mediciones
        `;

        const result = await pool.query(query);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple API status endpoint for Lua
app.get('/api/status', (req, res) => {
    res.json({ message: 'API OK' });
});

// Test database connection endpoint
app.get('/api/test-db', async (req, res) => {
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    
    try {
        const result = await pool.query('SELECT NOW() as current_time');
        
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
                            <div class="time">Connected at: ${result.rows[0].current_time}</div>
                        </div>
                    </body>
                </html>
            `);
        } else {
            res.json({ 
                status: 'Database connected successfully', 
                time: result.rows[0].current_time 
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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(port, () => {
    console.log('Listening');
    if (process.env.NODE_ENV === 'production') {
        console.log('Servidor API ejecutándose en https://api-aguilera.vercel.app');
    } else {
        console.log(`Servidor API ejecutándose en http://localhost:${port}`);
    }
});

module.exports = app;
