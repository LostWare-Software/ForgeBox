/**
 * Ollama Service - API Integration Layer
 * Handles communication with local Ollama daemon or custom API endpoints.
 * Includes Multimodal (Vision) support for images and text.
 */

const OllamaService = {
  // Default Settings
  config: {
    provider: 'ollama', // 'ollama' or 'openai'
    endpoint: 'http://localhost:11434',
    apiKey: '',
    aiName: 'Gemini Local',
    userName: '',
    userBio: '',
    systemPrompt: '',
    temperature: 0.7,
    topP: 0.9,
    demoMode: false,
    lowSpecMode: false
  },

  /**
   * Build combined system prompt with strict boundary separation between AI Identity and User Profile
   */
  getEffectiveSystemPrompt() {
    const parts = [];

    // 1. AI Identity Section
    const aiName = this.config.aiName || 'Gemini Local';
    parts.push(
`### TU IDENTIDAD (LA IA):
- Tu nombre de asistente es: "${aiName}".
- Eres una Inteligencia Artificial.
- Si el usuario te pregunta quién eres o cuál es tu nombre, debes responder que te llamas ${aiName}.`
    );

    // 2. User Context Section
    if (this.config.userName || this.config.userBio) {
      const userName = this.config.userName ? `"${this.config.userName}"` : 'el usuario';
      const userBio = this.config.userBio ? `"${this.config.userBio}"` : 'Sin datos adicionales';

      parts.push(
`### INFORMACIÓN SOBRE EL USUARIO (LA PERSONA QUE TE HABLA):
- Nombre del usuario: ${userName}
- Contexto y preferencias del usuario: ${userBio}
⚠️ REGLA CRÍTICA DE ROL: La información anterior pertenece al USUARIO que te habla, NO a ti. NUNCA afirmes que tú eres ${userName} ni adoptes sus datos personales como si fuesen tus propias características de IA. Usa esta información únicamente para personalizar cómo le respondes a él/ella.`
      );
    }

    // 3. Custom System Prompt
    if (this.config.systemPrompt && this.config.systemPrompt.trim()) {
      parts.push(`### INSTRUCCIONES ADICIONALES DEL SISTEMA:\n${this.config.systemPrompt.trim()}`);
    }

    return parts.join('\n\n');
  },

  /**
   * Check connection status to Ollama endpoint
   */
  async checkConnection(endpointOverride = null) {
    if (this.config.demoMode) {
      return { online: true, demo: true, message: 'Modo Demostración Activo' };
    }

    const endpoint = (endpointOverride || this.config.endpoint || 'http://localhost:11434').replace(/\/$/, '');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${endpoint}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        return { online: true, demo: false, message: 'Conectado a Ollama' };
      } else {
        return { online: false, demo: false, message: 'Endpoint respondió con error' };
      }
    } catch (err) {
      return { online: false, demo: false, message: 'No se puede conectar a Ollama' };
    }
  },

  /**
   * Fetch available models from Ollama / API
   */
  async fetchModels() {
    if (this.config.demoMode) {
      return [
        { name: 'llama3.2-vision:latest', size: '7.9 GB', modified_at: new Date().toISOString() },
        { name: 'llava:latest', size: '4.7 GB', modified_at: new Date().toISOString() },
        { name: 'llama3.2:latest', size: '3.8 GB', modified_at: new Date().toISOString() },
        { name: 'deepseek-r1:1.5b', size: '1.1 GB', modified_at: new Date().toISOString() },
        { name: 'qwen2.5-coder:7b', size: '4.7 GB', modified_at: new Date().toISOString() },
        { name: 'mistral:latest', size: '4.1 GB', modified_at: new Date().toISOString() }
      ];
    }

    const endpoint = this.config.endpoint.replace(/\/$/, '');
    
    try {
      if (this.config.provider === 'openai') {
        const headers = { 'Content-Type': 'application/json' };
        if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        
        const res = await fetch(`${endpoint}/v1/models`, { headers });
        if (!res.ok) throw new Error('Error al listar modelos OpenAI');
        const data = await res.json();
        return (data.data || []).map(m => ({ name: m.id, size: 'Cloud/API' }));
      } else {
        const res = await fetch(`${endpoint}/api/tags`);
        if (!res.ok) throw new Error('Error al listar modelos de Ollama');
        const data = await res.json();
        return data.models || [];
      }
    } catch (error) {
      console.warn('Error obteniendo modelos:', error);
      return [];
    }
  },

  /**
   * Unload model from RAM/VRAM immediately by sending keep_alive: 0
   */
  async unloadModel(modelName) {
    if (this.config.demoMode || !modelName) {
      return { success: true, message: 'Modelo simulado liberado' };
    }

    const endpoint = this.config.endpoint.replace(/\/$/, '');
    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          keep_alive: 0
        })
      });
      return { success: response.ok, message: response.ok ? 'Modelo apagado de VRAM con éxito' : 'No se pudo apagar el modelo' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  /**
   * Preload model into VRAM
   */
  async preloadModel(modelName) {
    if (this.config.demoMode || !modelName) {
      return { success: true, message: 'Modelo simulado cargado' };
    }

    const endpoint = this.config.endpoint.replace(/\/$/, '');
    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          keep_alive: "10m"
        })
      });
      return { success: response.ok, message: response.ok ? 'Modelo cargado en memoria' : 'Error cargando modelo' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  /**
   * Stream chat response from Ollama or OpenAI with Multimodal Vision support
   */
  async streamChat({ model, messages, onChunk, onError, signal }) {
    if (this.config.demoMode) {
      return this._simulateStreamChat({ model, messages, onChunk, signal });
    }

    const endpoint = this.config.endpoint.replace(/\/$/, '');
    const effectiveSysPrompt = this.getEffectiveSystemPrompt();

    try {
      if (this.config.provider === 'openai') {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        };

        const apiMessages = [];
        if (effectiveSysPrompt) {
          apiMessages.push({ role: 'system', content: effectiveSysPrompt });
        }

        messages.forEach(msg => {
          if (msg.images && msg.images.length > 0) {
            const contentArray = [{ type: 'text', text: msg.content }];
            msg.images.forEach(imgBase64 => {
              contentArray.push({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imgBase64}` }
              });
            });
            apiMessages.push({ role: msg.role, content: contentArray });
          } else {
            apiMessages.push({ role: msg.role, content: msg.content });
          }
        });

        const response = await fetch(`${endpoint}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: model,
            messages: apiMessages,
            temperature: parseFloat(this.config.temperature),
            top_p: parseFloat(this.config.topP),
            stream: true
          }),
          signal
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Error en API (${response.status}): ${errText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.replace('data: ', '');
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                const token = parsed.choices?.[0]?.delta?.content || '';
                if (token) onChunk(token);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } else {
        // Standard Ollama /api/chat with images payload
        const payloadMessages = [];
        if (effectiveSysPrompt) {
          payloadMessages.push({ role: 'system', content: effectiveSysPrompt });
        }
        
        messages.forEach(msg => {
          const msgObj = {
            role: msg.role,
            content: msg.content
          };
          if (msg.images && msg.images.length > 0) {
            msgObj.images = msg.images; // Array of base64 strings for Ollama vision
          }
          payloadMessages.push(msgObj);
        });

        const response = await fetch(`${endpoint}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model,
            messages: payloadMessages,
            options: {
              temperature: parseFloat(this.config.temperature),
              top_p: parseFloat(this.config.topP)
            },
            stream: true
          }),
          signal
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Error de Ollama (${response.status}): ${errBody || 'Asegúrate de que el modelo esté descargado.'}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let partialLine = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          partialLine += decoder.decode(value, { stream: true });
          const lines = partialLine.split('\n');
          partialLine = lines.pop();

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.message && parsed.message.content) {
                  onChunk(parsed.message.content);
                }
              } catch (e) {
                console.warn('Chunk parse error:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError(error);
      }
    }
  },

  /**
   * Internal Demo Mode Stream Generator with Vision simulation
   */
  async _simulateStreamChat({ model, messages, onChunk, signal }) {
    const lastMsgObj = messages[messages.length - 1] || {};
    const lastUserMsg = (lastMsgObj.content || '').toLowerCase();
    const hasImages = lastMsgObj.images && lastMsgObj.images.length > 0;

    const name = this.config.aiName || 'Gemini Local';
    const userName = this.config.userName || '';
    const userBio = this.config.userBio || '';
    const greetingUser = userName ? `, ${userName}` : '';
    
    let demoResponse = '';

    if (hasImages) {
      demoResponse = `¡Hola${greetingUser}! He recibido la imagen adjunta. Como modelo multimodal en **ForgeBox** (${model}), puedo identificar objetos, leer textos dentro de la imagen, analizar diagramas o resumir gráficos visuales.\n\n*(Nota: Para análisis en vivo real con tus imágenes, asegúrate de seleccionar un modelo como \`llama3.2-vision\` o \`llava\` en Ollama).*`;
    } else if (lastUserMsg.includes('quien eres') || lastUserMsg.includes('quién eres') || lastUserMsg.includes('quien sos') || lastUserMsg.includes('tu nombre')) {
      demoResponse = `¡Hola${greetingUser}! Mi nombre es **${name}**, tu asistente de Inteligencia Artificial en ForgeBox.\n\nTengo registrado que estoy conversando con **${userName || 'un usuario'}**${userBio ? ` (Contexto guardado: *"${userBio}"*)` : ''}.\n\n¿En qué te puedo ayudar hoy?`;
    } else if (lastUserMsg.includes('código') || lastUserMsg.includes('python') || lastUserMsg.includes('script')) {
      demoResponse = `¡Hola${greetingUser}! Soy **${name}**. Aquí tienes un ejemplo de código ejecutado con el modelo **${model}**:\n\n\`\`\`python\nimport sys\n\ndef main():\n    print("¡ForgeBox con ${name} y Ollama!")\n    datos = [10, 20, 30, 40, 50]\n    promedio = sum(datos) / len(datos)\n    print(f"Promedio de datos: {promedio}")\n\nif __name__ == '__main__':\n    main()\n\`\`\`\n\nPuedes copiar este snippet con el botón **Copiar**.`;
    } else if (lastUserMsg.includes('idea') || lastUserMsg.includes('brainstorm')) {
      demoResponse = `### 🚀 Ideas recomendadas por ${name} (${model}):\n\n1. **Gestor de Prompts para Ollama**: Una barra rápida de acceso directo.\n2. **Agente de Análisis de Archivos e Imágenes**: Carga documentos TXT, JSON o imágenes para resúmenes.\n3. **Asistente de Programación Offline**: Integración con VS Code.`;
    } else {
      demoResponse = `¡Entendido${greetingUser}! Soy **${name}** y he procesado tu solicitud en ForgeBox usando el modelo **${model}**.\n\nEstoy configurado con tu contexto y listo para ayudarte a redactar textos, analizar imágenes adjuntas o depurar código.`;
    }

    const words = demoResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (signal && signal.aborted) break;
      onChunk(words[i] + ' ');
      await new Promise(r => setTimeout(r, 40));
    }
  }
};

window.OllamaService = OllamaService;
