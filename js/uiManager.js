/**
 * UI Manager - Rendering & DOM Interactions
 * Controls message rendering, Markdown parsing, code highlighting, and modals.
 * Updated for ForgeBox theme, Favicon icons & Multimodal image attachments.
 */

const UIManager = {
  init() {
    // Configure Marked.js parser with custom code renderer
    if (window.marked) {
      const renderer = new marked.Renderer();
      
      renderer.code = function(code, language) {
        const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
        let highlighted = code;
        try {
          highlighted = hljs.highlight(code, { language: validLang }).value;
        } catch (e) {
          highlighted = marked.Renderer.prototype.code.call(this, code, language);
        }

        const id = 'code_' + Math.random().toString(36).substr(2, 6);
        
        return `
          <div class="code-block-wrapper">
            <div class="code-header">
              <span>${validLang.toUpperCase()}</span>
              <button class="btn-copy-code" data-code-id="${id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copiar</span>
              </button>
            </div>
            <pre><code id="${id}" class="hljs ${validLang}">${highlighted}</code></pre>
          </div>
        `;
      };

      marked.setOptions({
        renderer: renderer,
        gfm: true,
        breaks: true
      });
    }

    // Global listener for copy code buttons
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.btn-copy-code');
      if (copyBtn) {
        const codeId = copyBtn.getAttribute('data-code-id');
        const codeEl = document.getElementById(codeId);
        if (codeEl) {
          navigator.clipboard.writeText(codeEl.innerText).then(() => {
            const span = copyBtn.querySelector('span:last-child');
            const originalText = span.innerText;
            span.innerText = '¡Copiado!';
            copyBtn.style.color = '#ffb703';
            setTimeout(() => {
              span.innerText = originalText;
              copyBtn.style.color = '';
            }, 2000);
          });
        }
      }
    });
  },

  /**
   * Render sidebar conversation history list
   */
  renderChatHistory(chats, activeId, onSelect, onDelete) {
    const container = document.getElementById('chat-history-list');
    if (!container) return;
    container.innerHTML = '';

    chats.forEach(chat => {
      const item = document.createElement('div');
      item.className = `history-item ${chat.id === activeId ? 'active' : ''}`;
      
      const titleSpan = document.createElement('span');
      titleSpan.className = 'history-item-title';
      titleSpan.innerText = chat.title || 'Nuevo Chat';
      
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'history-item-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon-sm';
      deleteBtn.title = 'Eliminar conversación';
      deleteBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onDelete(chat.id);
      });

      actionsDiv.appendChild(deleteBtn);
      item.appendChild(titleSpan);
      item.appendChild(actionsDiv);

      item.addEventListener('click', () => onSelect(chat.id));
      container.appendChild(item);
    });
  },

  /**
   * Populate model selector dropdown
   */
  updateModelSelector(models, selectedModel) {
    const select = document.getElementById('model-select');
    if (!select) return;
    select.innerHTML = '';

    if (!models || models.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.innerText = 'Sin modelos en Ollama';
      select.appendChild(opt);
      select.disabled = true;
      return;
    }

    select.disabled = false;
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.innerText = `${m.name} (${m.size || 'Local'})`;
      if (m.name === selectedModel) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    const activeBadge = document.getElementById('active-model-name-badge');
    if (activeBadge) {
      activeBadge.innerText = select.value || 'Modelo activo';
    }
  },

  /**
   * Render status card in sidebar
   */
  renderStatusCard(status) {
    const dot = document.getElementById('status-dot');
    const title = document.getElementById('status-title');
    const subtitle = document.getElementById('status-subtitle');

    if (!dot || !title || !subtitle) return;

    dot.className = 'status-dot';
    if (status.demo) {
      dot.classList.add('demo');
      title.innerText = 'Modo Demostración';
      subtitle.innerText = 'IA Simulada (Prueba UI)';
    } else if (status.online) {
      dot.classList.add('online');
      title.innerText = 'Ollama Conectado';
      subtitle.innerText = OllamaService.config.endpoint.replace('http://', '');
    } else {
      dot.classList.add('offline');
      title.innerText = 'Ollama Desconectado';
      subtitle.innerText = 'Verifica puerto 11434';
    }
  },

  /**
   * Render attached files & images pills in input container
   */
  renderAttachedFiles(attachments, onRemove) {
    const bar = document.getElementById('attached-files-bar');
    if (!bar) return;

    if (!attachments || attachments.length === 0) {
      bar.classList.add('hidden');
      bar.innerHTML = '';
      return;
    }

    bar.classList.remove('hidden');
    bar.innerHTML = '';

    attachments.forEach((file, index) => {
      const pill = document.createElement('div');
      pill.className = 'file-pill';

      if (file.type === 'image' && file.dataUrl) {
        pill.innerHTML = `
          <img src="${file.dataUrl}" alt="${file.name}" class="image-thumb-pill">
          <span>${file.name} (${file.size})</span>
        `;
      } else {
        pill.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span>${file.name} (${file.lines || 0} líns)</span>
        `;
      }

      const removeBtn = document.createElement('button');
      removeBtn.className = 'file-pill-remove';
      removeBtn.title = 'Quitar archivo';
      removeBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      removeBtn.addEventListener('click', () => onRemove(index));
      pill.appendChild(removeBtn);
      bar.appendChild(pill);
    });
  },

  /**
   * Render messages list for active chat
   */
  renderMessages(messages) {
    const welcomeView = document.getElementById('welcome-view');
    const container = document.getElementById('messages-container');

    if (!container || !welcomeView) return;

    if (!messages || messages.length === 0) {
      welcomeView.style.display = 'flex';
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    welcomeView.style.display = 'none';
    container.classList.remove('hidden');
    container.innerHTML = '';

    messages.forEach(msg => {
      const messageRow = this.createMessageElement(msg);
      container.appendChild(messageRow);
    });

    this.scrollToBottom();
  },

  /**
   * Create single message row DOM element
   */
  createMessageElement(msg) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;
    row.id = msg.id;

    // Avatar (User vs Favicon AI Logo)
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    if (msg.role === 'user') {
      avatar.innerText = 'U';
    } else {
      avatar.innerHTML = `<img src="assets/favicon.png" alt="ForgeBox AI" class="avatar-favicon-img">`;
    }

    // Content wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'message-content-wrapper';

    // File attachments preview chips inside user message
    if (msg.attachments && msg.attachments.length > 0) {
      const chipsDiv = document.createElement('div');
      chipsDiv.className = 'bubble-attachments';

      msg.attachments.forEach(att => {
        if (att.type === 'image' && att.dataUrl) {
          const imgEl = document.createElement('img');
          imgEl.src = att.dataUrl;
          imgEl.alt = att.name;
          imgEl.className = 'attachment-image-preview';
          chipsDiv.appendChild(imgEl);
        } else {
          const chip = document.createElement('div');
          chip.className = 'attachment-chip';
          chip.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            </svg>
            <span>${att.name}</span>
          `;
          chipsDiv.appendChild(chip);
        }
      });

      wrapper.appendChild(chipsDiv);
    }

    // Message Bubble
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    if (msg.role === 'user') {
      bubble.innerText = msg.content;
    } else {
      bubble.innerHTML = window.marked ? marked.parse(msg.content) : msg.content;
      if (window.renderMathInElement) {
        renderMathInElement(bubble, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ]
        });
      }
    }

    wrapper.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(wrapper);

    return row;
  },

  /**
   * Append typing indicator for streaming assistant response
   */
  appendTypingIndicator() {
    const container = document.getElementById('messages-container');
    if (!container) return null;

    const row = document.createElement('div');
    row.className = 'message-row assistant streaming-row';
    row.id = 'streaming-indicator-row';

    row.innerHTML = `
      <div class="message-avatar">
        <img src="assets/favicon.png" alt="ForgeBox AI" class="avatar-favicon-img">
      </div>
      <div class="message-content-wrapper">
        <div class="message-bubble" id="streaming-bubble">
          <div class="thinking-pulse">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;

    container.appendChild(row);
    this.scrollToBottom();
    return row;
  },

  /**
   * Update streaming text chunk
   */
  updateStreamingText(text) {
    const bubble = document.getElementById('streaming-bubble');
    if (!bubble) return;

    bubble.innerHTML = window.marked ? marked.parse(text) : text;
    if (window.renderMathInElement) {
      renderMathInElement(bubble, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ]
      });
    }
    this.scrollToBottom();
  },

  /**
   * Remove streaming element when finished
   */
  removeStreamingIndicator() {
    const row = document.getElementById('streaming-indicator-row');
    if (row) row.remove();
  },

  /**
   * Scroll viewport to bottom
   */
  scrollToBottom() {
    const viewport = document.getElementById('chat-viewport');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  },

  /**
   * Update header brand name with AI Name
   */
  updateAIName(name) {
    const el = document.getElementById('header-ai-name');
    if (el) {
      el.innerText = name || 'Gemini Local';
    }
  },

  /**
   * Typewriter effect for Low Spec / Slow mode
   */
  async typewriterEffect(fullText, onProgress, signal) {
    let currentText = '';
    const stepSize = Math.max(1, Math.floor(fullText.length / 300));
    
    for (let i = 0; i < fullText.length; i += stepSize) {
      if (signal && signal.aborted) break;
      currentText = fullText.slice(0, i + stepSize);
      onProgress(currentText);
      await new Promise(r => setTimeout(r, 12));
    }

    if (!signal || !signal.aborted) {
      onProgress(fullText);
    }
  },

  /**
   * Show feedback toast notification
   */
  showToast(message, type = 'info') {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 95px;
      right: 24px;
      background: var(--bg-surface-hover);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 10px 18px;
      border-radius: 20px;
      font-size: 0.85rem;
      box-shadow: var(--shadow-md);
      z-index: 2000;
      animation: slideUp 0.2s ease-out;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
};

window.UIManager = UIManager;
