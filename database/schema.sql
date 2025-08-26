-- Esquema de Base de Datos PostgreSQL para HMI Data API
-- Crear la base de datos
CREATE DATABASE hmi_data;

-- Conectarse a la base de datos
\c hmi_data;

-- Crear la tabla para almacenar los datos
CREATE TABLE mediciones (
    id SERIAL PRIMARY KEY,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    oa_brute NUMERIC,
    boensidad NUMERIC,
    ssw NUMERIC,
    a_neto NUMERIC,
    temp_gas NUMERIC,
    densidad_diluente NUMERIC,
    drive_gain_gas NUMERIC,
    column1 NUMERIC
);

-- Crear índice para búsquedas por fecha
CREATE INDEX idx_mediciones_fecha ON mediciones(fecha_creacion);

-- Comentarios sobre la estructura
COMMENT ON TABLE mediciones IS 'Tabla para almacenar datos recibidos del HMI Wecon';
COMMENT ON COLUMN mediciones.id IS 'Identificador único autoincremental';
COMMENT ON COLUMN mediciones.fecha_creacion IS 'Timestamp de cuando se insertó el registro';
COMMENT ON COLUMN mediciones.oa_brute IS 'Valor OA Brute del HMI';
COMMENT ON COLUMN mediciones.boensidad IS 'Valor de Boensidad del HMI';
COMMENT ON COLUMN mediciones.ssw IS 'Valor SSW del HMI';
COMMENT ON COLUMN mediciones.a_neto IS 'Valor A Neto del HMI';
COMMENT ON COLUMN mediciones.temp_gas IS 'Temperatura del gas';
COMMENT ON COLUMN mediciones.densidad_diluente IS 'Densidad del diluente';
COMMENT ON COLUMN mediciones.drive_gain_gas IS 'Drive Gain del gas';
COMMENT ON COLUMN mediciones.column1 IS 'Valor de Column1 del HMI';
