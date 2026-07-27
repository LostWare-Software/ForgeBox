/**
 * Main Application Orchestrator for ForgeBox
 * Binds UI event listeners, manages app lifecycle, settings tabs, image attachments and Ollama integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI Manager
  UIManager.init();

  let abortController = null;
  let isGenerating = false;

  // DOM Elements References
  const sidebar = document.getElementById('sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const btnOpenSidebar = document.getElementById('btn-open-sidebar');
  const btnNewChat = document.getElementById('btn-new-chat');
  const btnRefreshStatus = document.getElementById('btn-refresh-status');

  const modelSelect = document.getElementById('model-select');
  const toggleDemoMode = document.getElementById('toggle-demo-mode');
  const modeCascadeSelect = document.getElementById('mode-cascade-select');

  const btnUnloadModel = document.getElementById('btn-unload-model');
  const btnPreloadModel = document.getElementById('btn-preload-model');

  const userInput = document.getElementById('user-input');
  const btnSend = document.getElementById('btn-send');
  const btnStop = document.getElementById('btn-stop');
  const btnAttachFile = document.getElementById('btn-attach-file');
  const fileInput = document.getElementById('file-input');

  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  const btnQuickGuide = document.getElementById('btn-quick-guide');
  const btnCloseGuide = document.getElementById('btn-close-guide');
  const guideModal = document.getElementById('guide-modal');
  const btnExportChats = document.getElementById('btn-export-chats');

  // Load Saved Settings into OllamaService
  loadSettingsFromStorage();

  // Initial setup render
  renderApp();
  checkOllamaHealth();

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  // Sidebar Toggle / Collapse / Expand
  btnToggleSidebar?.addEventListener('click', () => {
    sidebar.classList.add('collapsed');
  });

  btnOpenSidebar?.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });

  // New Chat
  btnNewChat?.addEventListener('click', () => {
    chatManager.createNewChat();
    renderApp();
  });

  // Re-check Ollama status button
  btnRefreshStatus?.addEventListener('click', async () => {
    await checkOllamaHealth();
  });

  // Demo Mode Switch (Inside Settings Modal)
  toggleDemoMode?.addEventListener('change', (e) => {
    OllamaService.config.demoMode = !e.target.checked; // Checked = Direct, Unchecked = Demo
    saveSettingsToStorage();
    checkOllamaHealth();
    UIManager.showToast(e.target.checked ? 'Modo Ollama Directo Activado' : 'Modo Demostración Activado');
  });

  // Response Mode Cascade Dropdown (Normal vs Slow Mode)
  modeCascadeSelect?.addEventListener('change', (e) => {
    const isSlow = e.target.value === 'slow';
    OllamaService.config.lowSpecMode = isSlow;
    saveSettingsToStorage();
    UIManager.showToast(isSlow ? 'Slow Mode Activado (Renderizado Suave)' : 'Modo Normal Activado (Tiempo Real)');
  });

  // Model Selector Change
  modelSelect?.addEventListener('change', (e) => {
    const selectedModel = e.target.value;
    const badge = document.getElementById('active-model-name-badge');
    if (badge) badge.innerText = selectedModel || 'Modelo activo';
  });

  // Unload Model from VRAM
  btnUnloadModel?.addEventListener('click', async () => {
    const activeModel = modelSelect.value;
    if (!activeModel) {
      UIManager.showToast('Selecciona un modelo primero', 'warning');
      return;
    }

    UIManager.showToast(`Liberando VRAM para modelo ${activeModel}...`);
    const res = await OllamaService.unloadModel(activeModel);
    UIManager.showToast(res.message);
  });

  // Preload Model into VRAM
  btnPreloadModel?.addEventListener('click', async () => {
    const activeModel = modelSelect.value;
    if (!activeModel) {
      UIManager.showToast('Selecciona un modelo primero', 'warning');
      return;
    }

    UIManager.showToast(`Encendiendo y precargando ${activeModel} en memoria...`);
    const res = await OllamaService.preloadModel(activeModel);
    UIManager.showToast(res.message);
  });

  // Starter Cards Click Listener
  document.querySelectorAll('.starter-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (prompt) {
        userInput.value = prompt;
        sendMessage();
      }
    });
  });

  // Textarea Auto-resize & Keydown
  userInput?.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
  });

  userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Send Message Button
  btnSend?.addEventListener('click', () => {
    sendMessage();
  });

  // Stop Generation Button
  btnStop?.addEventListener('click', () => {
    if (abortController) {
      abortController.abort();
      setGeneratingState(false);
      UIManager.showToast('Generación detenida por el usuario');
    }
  });

  // Multimodal File Attachment Handling (Text & Images)
  btnAttachFile?.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const fileData = await chatManager.processFile(file);
        chatManager.addAttachment(fileData);
      } catch (err) {
        UIManager.showToast(`Error leyendo ${file.name}`, 'error');
      }
    }
    fileInput.value = '';
    UIManager.renderAttachedFiles(chatManager.pendingAttachments, (removeIndex) => {
      chatManager.removeAttachment(removeIndex);
      UIManager.renderAttachedFiles(chatManager.pendingAttachments, arguments.callee);
    });
  });

  // Settings Modal Tabs Handler
  document.querySelectorAll('.settings-tab-bar .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab-bar .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.modal-body .tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = btn.getAttribute('data-tab');
      document.getElementById(targetTab)?.classList.add('active');
    });
  });

  // Settings Modal Open & Close
  btnOpenSettings?.addEventListener('click', () => {
    document.getElementById('setting-ai-name').value = OllamaService.config.aiName || 'Gemini Local';
    document.getElementById('setting-user-name').value = OllamaService.config.userName || '';
    document.getElementById('setting-user-bio').value = OllamaService.config.userBio || '';
    document.getElementById('setting-provider').value = OllamaService.config.provider;
    document.getElementById('setting-endpoint').value = OllamaService.config.endpoint;
    document.getElementById('setting-apikey').value = OllamaService.config.apiKey;
    document.getElementById('setting-system-prompt').value = OllamaService.config.systemPrompt;
    document.getElementById('setting-temperature').value = OllamaService.config.temperature;
    document.getElementById('val-temperature').innerText = OllamaService.config.temperature;
    document.getElementById('setting-top-p').value = OllamaService.config.topP;
    document.getElementById('val-top-p').innerText = OllamaService.config.topP;
    toggleDemoMode.checked = !OllamaService.config.demoMode;

    settingsModal.classList.remove('hidden');
  });

  btnCloseSettings?.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  document.getElementById('setting-temperature')?.addEventListener('input', (e) => {
    document.getElementById('val-temperature').innerText = e.target.value;
  });

  document.getElementById('setting-top-p')?.addEventListener('input', (e) => {
    document.getElementById('val-top-p').innerText = e.target.value;
  });

  btnSaveSettings?.addEventListener('click', () => {
    OllamaService.config.aiName = document.getElementById('setting-ai-name').value.trim() || 'Gemini Local';
    OllamaService.config.userName = document.getElementById('setting-user-name').value.trim();
    OllamaService.config.userBio = document.getElementById('setting-user-bio').value.trim();
    OllamaService.config.provider = document.getElementById('setting-provider').value;
    OllamaService.config.endpoint = document.getElementById('setting-endpoint').value.trim();
    OllamaService.config.apiKey = document.getElementById('setting-apikey').value.trim();
    OllamaService.config.systemPrompt = document.getElementById('setting-system-prompt').value.trim();
    OllamaService.config.temperature = parseFloat(document.getElementById('setting-temperature').value);
    OllamaService.config.topP = parseFloat(document.getElementById('setting-top-p').value);
    OllamaService.config.demoMode = !toggleDemoMode.checked;

    UIManager.updateAIName(OllamaService.config.aiName);
    saveSettingsToStorage();
    settingsModal.classList.add('hidden');
    checkOllamaHealth();
    UIManager.showToast('Configuración guardada correctamente');
  });

  // Quick Guide Modal Handlers
  btnQuickGuide?.addEventListener('click', () => guideModal.classList.remove('hidden'));
  btnCloseGuide?.addEventListener('click', () => guideModal.classList.add('hidden'));

  // Export Chats
  btnExportChats?.addEventListener('click', () => chatManager.exportToJSON());

  // --------------------------------------------------------------------------
  // Core App Functions
  // --------------------------------------------------------------------------

  function renderApp() {
    UIManager.updateAIName(OllamaService.config.aiName);
    if (modeCascadeSelect) {
      modeCascadeSelect.value = OllamaService.config.lowSpecMode ? 'slow' : 'normal';
    }

    const activeChat = chatManager.getActiveChat();
    UIManager.renderChatHistory(
      chatManager.chats,
      chatManager.activeChatId,
      (selectedId) => {
        chatManager.setActiveChat(selectedId);
        renderApp();
      },
      (deleteId) => {
        chatManager.deleteChat(deleteId);
        renderApp();
      }
    );

    UIManager.renderMessages(activeChat ? activeChat.messages : []);
    UIManager.renderAttachedFiles(chatManager.pendingAttachments, (removeIdx) => {
      chatManager.removeAttachment(removeIdx);
      UIManager.renderAttachedFiles(chatManager.pendingAttachments, arguments.callee);
    });
  }

  async function checkOllamaHealth() {
    const status = await OllamaService.checkConnection();
    UIManager.renderStatusCard(status);

    const models = await OllamaService.fetchModels();
    UIManager.updateModelSelector(models, modelSelect.value);
  }

  async function sendMessage() {
    const text = userInput.value.trim();
    const attachments = [...chatManager.pendingAttachments];

    if (!text && attachments.length === 0) return;
    if (isGenerating) return;

    const selectedModel = modelSelect.value;
    if (!selectedModel && !OllamaService.config.demoMode) {
      UIManager.showToast('Selecciona o descarga un modelo en Ollama primero', 'warning');
      guideModal.classList.remove('hidden');
      return;
    }

    // 1. Add User message to state
    const userMsgText = text || (attachments.length > 0 ? 'He adjuntado archivos para análisis.' : '');
    chatManager.addMessage('user', userMsgText, attachments);
    
    // Reset inputs
    userInput.value = '';
    userInput.style.height = 'auto';
    chatManager.clearAttachments();
    renderApp();

    // 2. Prepare payload messages with text & vision base64 images
    const activeChat = chatManager.getActiveChat();
    const formattedMessages = activeChat.messages.map(m => {
      const { promptText, images } = chatManager.buildPromptWithAttachments(m.content, m.attachments);
      return {
        role: m.role,
        content: promptText,
        images: images
      };
    });

    // 3. Set UI state to generating
    setGeneratingState(true);
    UIManager.appendTypingIndicator();

    abortController = new AbortController();
    let streamedText = '';
    const isSlowMode = OllamaService.config.lowSpecMode;

    // 4. Stream response from Ollama API
    await OllamaService.streamChat({
      model: selectedModel || 'llama3.2:latest',
      messages: formattedMessages,
      onChunk: (chunk) => {
        streamedText += chunk;
        if (!isSlowMode) {
          UIManager.updateStreamingText(streamedText);
        }
      },
      onError: (err) => {
        UIManager.showToast(`Error: ${err.message}`, 'error');
      },
      signal: abortController.signal
    });

    // 5. If Slow Mode is enabled, render typewriter effect after full response is fetched
    if (isSlowMode && streamedText.trim() && (!abortController || !abortController.signal.aborted)) {
      await UIManager.typewriterEffect(
        streamedText,
        (partial) => UIManager.updateStreamingText(partial),
        abortController ? abortController.signal : null
      );
    }

    // 6. Finalize message
    UIManager.removeStreamingIndicator();
    if (streamedText.trim()) {
      chatManager.addMessage('assistant', streamedText);
    }
    
    setGeneratingState(false);
    renderApp();
  }

  function setGeneratingState(generating) {
    isGenerating = generating;
    if (generating) {
      btnSend.classList.add('hidden');
      btnStop.classList.remove('hidden');
    } else {
      btnSend.classList.remove('hidden');
      btnStop.classList.add('hidden');
      abortController = null;
    }
  }

  function saveSettingsToStorage() {
    localStorage.setItem('forgebox_settings', JSON.stringify(OllamaService.config));
  }

  function loadSettingsFromStorage() {
    try {
      const saved = localStorage.getItem('forgebox_settings');
      if (saved) {
        Object.assign(OllamaService.config, JSON.parse(saved));
        if (toggleDemoMode) {
          toggleDemoMode.checked = !OllamaService.config.demoMode;
        }
        if (modeCascadeSelect) {
          modeCascadeSelect.value = OllamaService.config.lowSpecMode ? 'slow' : 'normal';
        }
      }
    } catch (e) {
      console.warn('Error leyendo configuración guardada');
    }
  }
});
