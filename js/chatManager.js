/**
 * Chat Manager - State & History Management
 * Manages active conversation sessions, message history, text & image file attachments and LocalStorage.
 */

const STORAGE_KEY_CHATS = 'forgebox_chats';
const STORAGE_KEY_ACTIVE = 'forgebox_active_chat_id';

class ChatManager {
  constructor() {
    this.chats = this.loadChats();
    this.activeChatId = localStorage.getItem(STORAGE_KEY_ACTIVE) || null;
    this.pendingAttachments = []; // Holds uploaded text & image files

    // Create default chat if none exists
    if (this.chats.length === 0) {
      this.createNewChat();
    } else if (!this.activeChatId || !this.getChat(this.activeChatId)) {
      this.activeChatId = this.chats[0].id;
    }
  }

  /**
   * Create a new chat session
   */
  createNewChat(title = 'Nuevo Chat') {
    const newChat = {
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };

    this.chats.unshift(newChat);
    this.activeChatId = newChat.id;
    this.save();
    return newChat;
  }

  /**
   * Get active chat object
   */
  getActiveChat() {
    return this.chats.find(c => c.id === this.activeChatId) || this.chats[0];
  }

  /**
   * Get specific chat by ID
   */
  getChat(id) {
    return this.chats.find(c => c.id === id);
  }

  /**
   * Set active chat ID
   */
  setActiveChat(id) {
    if (this.getChat(id)) {
      this.activeChatId = id;
      localStorage.setItem(STORAGE_KEY_ACTIVE, id);
    }
  }

  /**
   * Delete a chat session
   */
  deleteChat(id) {
    this.chats = this.chats.filter(c => c.id !== id);
    if (this.activeChatId === id) {
      this.activeChatId = this.chats.length > 0 ? this.chats[0].id : null;
    }
    if (this.chats.length === 0) {
      this.createNewChat();
    }
    this.save();
  }

  /**
   * Add message to active chat
   */
  addMessage(role, content, attachments = []) {
    const chat = this.getActiveChat();
    if (!chat) return null;

    const message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      role: role,
      content: content,
      attachments: attachments,
      timestamp: new Date().toISOString()
    };

    chat.messages.push(message);
    chat.updatedAt = new Date().toISOString();

    // Auto-generate title from first user message
    if (chat.messages.length === 1 && role === 'user') {
      const cleanTitle = content.trim().substring(0, 30);
      chat.title = cleanTitle ? (cleanTitle + (content.length > 30 ? '...' : '')) : 'Nuevo Chat';
    }

    this.save();
    return message;
  }

  /**
   * Add pending file attachment (Text or Image)
   */
  addAttachment(fileData) {
    this.pendingAttachments.push(fileData);
  }

  /**
   * Remove pending attachment by index
   */
  removeAttachment(index) {
    if (index >= 0 && index < this.pendingAttachments.length) {
      this.pendingAttachments.splice(index, 1);
    }
  }

  /**
   * Clear pending attachments
   */
  clearAttachments() {
    this.pendingAttachments = [];
  }

  /**
   * Read file content (Text or Image base64)
   */
  async processFile(file) {
    return new Promise((resolve, reject) => {
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target.result;
        if (isImage) {
          // Extract raw base64 string without data URL header
          const base64Clean = result.split(',')[1] || result;
          resolve({
            type: 'image',
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            dataUrl: result,
            base64: base64Clean
          });
        } else {
          const lineCount = (result.match(/\n/g) || []).length + 1;
          resolve({
            type: 'text',
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            lines: lineCount,
            content: result
          });
        }
      };

      reader.onerror = () => reject(new Error(`Error leyendo el archivo ${file.name}`));

      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  /**
   * Format message prompt with text attachments and extract base64 images array
   */
  buildPromptWithAttachments(rawPrompt, attachments) {
    if (!attachments || attachments.length === 0) {
      return { promptText: rawPrompt, images: [] };
    }

    let fullText = rawPrompt;
    const images = [];

    attachments.forEach(att => {
      if (att.type === 'text') {
        fullText += `\n\n--- [Archivo Adjunto: ${att.name} (${att.lines} líneas, ${att.size})] ---\n\`\`\`\n${att.content}\n\`\`\``;
      } else if (att.type === 'image' && att.base64) {
        images.push(att.base64);
      }
    });

    return { promptText: fullText, images };
  }

  /**
   * Load chats from LocalStorage
   */
  loadChats() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHATS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error cargando chats:', e);
      return [];
    }
  }

  /**
   * Save chats to LocalStorage
   */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(this.chats));
      if (this.activeChatId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE, this.activeChatId);
      }
    } catch (e) {
      console.error('Error guardando en LocalStorage:', e);
    }
  }

  /**
   * Export chats as JSON file
   */
  exportToJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.chats, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `forgebox_chats_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

window.chatManager = new ChatManager();
