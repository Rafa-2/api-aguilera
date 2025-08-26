# HMI Data API

API para recibir y consultar datos de HMI Wecon con interfaz web integrada.

## Características

- **API REST** para recibir datos desde scripts Lua
- **Consulta de datos** con filtros por tiempo
- **Exportación a CSV** de los datos almacenados
- **Estadísticas básicas** de los datos
- **Interfaz web** para visualización y descarga
- **Optimizado para Vercel** con configuración de producción

## Estructura del Proyecto

```
api-aguilera/
├── server.js           # Servidor principal con API endpoints
├── package.json        # Dependencias y scripts
├── vercel.json         # Configuración de Vercel
├── .env.example        # Variables de entorno de ejemplo
├── .gitignore          # Archivos a ignorar en Git
├── README.md           # Este archivo
└── public/
    └── index.html      # Interfaz web
```

## Instalación Local

1. **Clonar o descargar el proyecto**
2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   Editar `.env` con tus credenciales de PostgreSQL.

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

5. **Ejecutar en producción:**
   ```bash
   npm start
   ```

## Despliegue en Vercel

### Opción 1: Desde GitHub

1. **Subir el código a GitHub**
2. **Conectar con Vercel:**
   - Ir a [vercel.com](https://vercel.com)
   - Importar proyecto desde GitHub
   - Seleccionar este repositorio

3. **Configurar variables de entorno en Vercel:**
   - `DB_USER`: Usuario de PostgreSQL
   - `DB_HOST`: Host de la base de datos
   - `DB_NAME`: Nombre de la base de datos
   - `DB_PASSWORD`: Contraseña de PostgreSQL
   - `DB_PORT`: Puerto (generalmente 5432)
   - `NODE_ENV`: production

### Opción 2: Desde CLI de Vercel

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Desplegar:**
   ```bash
   vercel
   ```

3. **Configurar variables de entorno:**
   ```bash
   vercel env add DB_USER
   vercel env add DB_HOST
   vercel env add DB_NAME
   vercel env add DB_PASSWORD
   vercel env add DB_PORT
   vercel env add NODE_ENV
   ```

## Base de Datos

### Configuración de la Base de Datos

El esquema completo de PostgreSQL se encuentra en `database/schema.sql`. Para configurar la base de datos:

1. **Ejecutar el esquema:**
   ```bash
   psql -U tu_usuario -f database/schema.sql
   ```

2. **O copiar y ejecutar manualmente** el contenido del archivo en tu cliente PostgreSQL.

### Estructura de la tabla `mediciones`

```sql
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

-- Índice para optimizar consultas por fecha
CREATE INDEX idx_mediciones_fecha ON mediciones(fecha_creacion);
```

### Proveedores de PostgreSQL recomendados para Vercel:

- **Neon** (gratuito): [neon.tech](https://neon.tech)
- **Supabase** (gratuito): [supabase.com](https://supabase.com)
- **Railway** (gratuito con límites): [railway.app](https://railway.app)

## API Endpoints

### POST `/api/datos`
Recibe datos del script Lua y los almacena en la base de datos.

**Body:**
```json
{
    "oa_brute": 123.45,
    "boensidad": 67.89,
    "ssw": 12.34,
    "a_neto": 56.78,
    "temp_gas": 90.12,
    "densidad_diluente": 34.56,
    "drive_gain_gas": 78.90,
    "column1": 23.45
}
```

### GET `/api/datos`
Consulta datos con filtros opcionales.

**Query Parameters:**
- `horas`: Filtrar por últimas X horas
- `limite`: Número máximo de registros
- `pagina`: Página para paginación

### GET `/api/datos/csv`
Descarga datos en formato CSV.

**Query Parameters:**
- `horas`: Filtrar por últimas X horas
- `todas=true`: Descargar todos los datos

### GET `/api/estadisticas`
Obtiene estadísticas básicas de los datos.

## Interfaz Web

Accede a `/` para usar la interfaz web que permite:
- Consultar datos por rango de horas
- Descargar datos en CSV
- Ver estadísticas básicas

## Scripts Disponibles

- `npm start`: Ejecutar en producción
- `npm run dev`: Ejecutar en desarrollo con nodemon
- `npm run build`: Comando de build (no necesario para este proyecto)

## Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos
- **CSV-Stringify** - Generación de archivos CSV
- **CORS** - Manejo de políticas de origen cruzado

## Configuración de Producción

El proyecto está optimizado para Vercel con:
- Variables de entorno para configuración de base de datos
- SSL habilitado para conexiones de base de datos en producción
- Configuración de puerto dinámico
- Archivos estáticos servidos desde `/public`

## Soporte

Para problemas o preguntas sobre el despliegue, revisa:
1. Los logs de Vercel en el dashboard
2. Las variables de entorno están correctamente configuradas
3. La base de datos está accesible desde Vercel
4. La tabla `mediciones` existe en la base de datos
