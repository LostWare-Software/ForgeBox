# 🛠️ ForgeBox — Local AI Forge & Ollama Web UI

![ForgeBox Theme](https://img.shields.io/badge/Theme-Molten%20Forge-fb8500?style=for-the-badge)
![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-ffc300?style=for-the-badge)
![Multimodal](https://img.shields.io/badge/Vision-Multimodal-e63946?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<img width="1254" height="801" alt="logo" src="https://github.com/user-attachments/assets/7daa57c9-de8c-4487-8636-bc36958ac32e" />

**ForgeBox** es una aplicación web intuitiva diseñada para interactuar con modelos de Inteligencia Artificial locales y multimodales a través de **Ollama** y APIs compatibles.

---

## 🌟 Características Principales

### 🎨 Diseño Forge & Marca Personalizada
- **Estética de Forja**: Paleta de colores en carbón oscuro, tonos ámbar, fuego naranja y rojo lava.
- **Nombre de IA Personalizable**: Define el nombre de tu asistente (ej: *Athena, Jarvis, Forja-AI*) y la interfaz lo reflejará en la cabecera.

### 👁️ Soporte Multimodal (Imágenes & Texto)
- Adjunta imágenes (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`) y archivos de texto (`.txt`, `.py`, `.js`, `.json`, `.md`, `.csv`).
- Envío directo de imágenes en Base64 para modelos con visión como `llama3.2-vision`, `llava`, `qwen2-vl` o `bakllava`.
- Previsualizaciones de miniaturas en la barra flotante y dentro de las burbujas de conversación.

### ⚡ Selector de Modo de Respuesta
- Selector de modo integrado en la barra de entrada flotante:
  - **🚀 Normal (Tiempo Real)**: Transmisión palabra por palabra en vivo via streaming.
  - **🐌 Slow Mode (Renderizado Suave / Low Spec)**: Recibe la respuesta completa en segundo plano y la genera con un efecto mecanografiado suave carácter por carácter. Ideal para evitar retardos de pantalla en equipos con menores recursos.

### ⚙️ Ventana de Configuración Categorizada por Secciones
Organizado en tres pestañas principales:
1. 🤖 **Identidad de IA**: Nombre de la IA, Instrucciones del sistema (System Prompt), Temperatura y Top-P.
2. 👤 **Datos de Usuario**: Nombre del Usuario y sección *Sobre mí* (contexto y preferencias que la IA usara para personalizar sus respuestas).
3. 🔌 **Conexión & API**: Proveedor (Ollama Local / OpenAI Compatible), URL Endpoint, Clave API e interruptor para alternar entre **Modo Ollama Directo** y **Modo Demostración**.

### 🧠 Gestión de Recursos de VRAM / GPU
- **Apagar VRAM**: Libera inmediatamente la memoria de la tarjeta gráfica cuando terminas de usar un modelo mediante `keep_alive: 0`.
- **Encender / Precargar**: Carga el modelo seleccionado previamente en memoria.

---

## 🚀 Guía de Instalación y Ejecución

### Requisitos Prerequisitos:
- **Python 3.x**
- **Ollama** (Opcional si usas la app en *Modo Demostración* o con APIs externas).

### Pasos de Inicio Rápido:

1. Clona o descarga el repositorio:
   ```bash
   git clone https://github.com/LostWare-Software/ForgeBox.git
   cd ForgeBox
   ```

2. Ejecuta el servidor local:
   ```bash
   python3 server.py
   ```

3. Abre tu navegador e ingresa a:
   ```
   http://localhost:5173
   ```


---

## 💡 Modelos Recomendados para Instalar en Ollama

```bash
# Modelo Multimodal para Visión e Imágenes
ollama run llama3.2-vision

# Modelo Multimodal Llava
ollama run llava

# Razonamiento Avanzado y Matemáticas
ollama run deepseek-r1:1.5b

# Especialista en Programación y Código
ollama run qwen2.5-coder:3b

# Modelo General de Meta
ollama run llama3.2
```

---

## 📂 Estructura del Proyecto

```
ForgeBox/
├── assets/
│   └── favicon.png          # Icono principal y favicon del navegador
├── css/
│   └── styles.css           # Hoja de estilos con el sistema de diseño Forge Theme
├── js/
│   ├── app.js               # Orquestador de eventos y UI
│   ├── chatManager.js       # Gestión de estados, attachments y LocalStorage
│   ├── uiManager.js         # Renderizado DOM, Markdown, KaTeX y pestañas
│   └── ollamaService.js     # Cliente API para Ollama con soporte multimodal
├── index.html               # Estructura de la aplicación
├── server.py                # Servidor HTTP local con soporte CORS
└── README.md                # Documentación del proyecto
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE). Libre para uso, modificación y distribución.
