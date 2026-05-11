Ops Intelligence System - Rappi

Sistema integral basado en Inteligencia Artificial diseñado para los equipos de Strategy, Planning & Analytics (SP&A) y Operations. Esta solución democratiza el acceso a datos operacionales y automatiza la generación de insights ejecutivos.

Arquitectura de la Solución

El proyecto fue construido utilizando un enfoque modular, separando claramente el Frontend (Interfaz) del Backend (Orquestación y LLM), asegurando escalabilidad y facilidad de mantenimiento.

* **Base de Datos:** PostgreSQL (Supabase). Estructurada en `RAW_INPUT_METRICS` y `RAW_ORDERS` para separar lógicas de KPIs y volumen.
* **Orquestación y Agentes (Backend):** n8n.
* **Modelos de IA:** * **Principal:** Google Gemini 2.5 Flash (Optimizado para velocidad y razonamiento).
  * **Fallback (Redundancia):** Anthropic Claude (Implementado para garantizar alta disponibilidad en caso de cuotas o caídas del modelo principal).
* **Frontend:** React, Tailwind CSS y Recharts (Desplegado a través de Lovable).

## Entregables Implementados

### 1. Bot Conversacional de Datos (Punto 2.1)
Interfaz de chat en lenguaje natural que traduce consultas de negocio complejas en queries SQL precisas usando técnicas de Few-Shot Prompting y un diccionario de datos estricto (uso de ILIKE para mitigar errores de tipeo en base de datos). 
* Soporta visualización dinámica en el frontend leyendo bloques JSON.
* Capacidades de exportación completas (CSV de la tabla analizada y PDF multipágina de los resultados).

### 2. Sistema de Insights Automáticos (Punto 2.2)
Sistema proactivo que escanea la base de datos completa aplicando fórmulas SQL estandarizadas para detectar:
* **Anomalías:** Variaciones >10% (L0W vs L1W).
* **Tendencias Preocupantes:** Caídas consistentes en las últimas 3 semanas.
* Genera un reporte en formato Markdown estricto con resúmenes ejecutivos y recomendaciones de negocio.
* **Ejecución Dual:** Se puede gatillar a demanda desde un botón dedicado en el Dashboard, o de forma programada vía Email (Cron-job los días lunes a las 08:00 AM).

---

## Instrucciones de Reproducibilidad (Setup)

### 1. Base de Datos
1. Crear una base de datos en PostgreSQL.
2. Importar los archivos CSV del caso técnico asegurando la creación de las tablas `RAW_INPUT_METRICS` y `RAW_ORDERS`.

### 2. Backend (n8n Workflows)
En la carpeta `/n8n-workflows` se encuentran los blueprints del sistema.
1. Instalar o acceder a una instancia de [n8n](https://n8n.io/).
2. Crear un nuevo flujo y hacer clic en **"Import from File"**.
3. Importar `01-Agente-Conversacional.json` para el motor principal del webhook.
4. Importar `02-Reporte-Email-Automatico.json` para el sistema programado.
5. **Credenciales:** Se deberán configurar las credenciales locales de PostgreSQL y las API Keys de Google Gemini/Anthropic dentro de los nodos correspondientes.

### 3. Frontend
El dashboard en React está configurado para consumir el Webhook de producción de n8n.
1. Navegar a la carpeta del frontend.
2. Ejecutar `npm install` para instalar las dependencias (Recharts, React-Markdown, Lucide-React).
3. Asegurarse de actualizar la constante `WEBHOOK_URL` en `InsightsDashboard.jsx` con la URL de la instancia local de n8n si se ejecuta fuera de la nube.
4. Ejecutar `npm run dev` para iniciar la aplicación.
5. El site ya esta operativo "https://dash-rappi-tp2.lovable.app/"
