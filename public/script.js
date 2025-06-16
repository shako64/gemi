document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const body = document.body;
    const chatMessages = document.getElementById('chat-messages');
    const initialView = document.getElementById('initial-view');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatButton = document.getElementById('new-chat-button');
    const recentChatsList = document.getElementById('recent-chats-list');
    const savePdfButton = document.getElementById('save-pdf-button');
    const emojiButton = document.getElementById('emoji-button');
    const emojiPicker = document.querySelector('emoji-picker');
    const fileUploadInput = document.getElementById('file-upload-input');
    const filePreviewContainer = document.getElementById('file-preview-container');
    
    // --- State Management ---
    let conversationHistory = [];
    let currentChatId = null;
    let uploadedFiles = [];

    // --- File Handling ---
    const renderPreviews = () => {
        filePreviewContainer.innerHTML = '';
        if (uploadedFiles.length === 0) return;
        
        uploadedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            let previewContent = `<span>${file.name}</span>`;
            if (file.mimeType.startsWith('image/')) {
                previewContent = `<img src="${file.data}" alt="${file.name}">` + previewContent;
            }

            previewItem.innerHTML = `${previewContent}<button class="remove-preview-btn" data-index="${index}" title="Remove file">×</button>`;
            filePreviewContainer.appendChild(previewItem);
        });
    };
    
    const addFilesToUpload = (files) => {
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                alert(`File "${file.name}" is too large (max 10MB).`);
                continue;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                uploadedFiles.push({ data: reader.result, mimeType: file.type, name: file.name });
                renderPreviews();
            };
            reader.readAsDataURL(file);
        }
    };
    
    filePreviewContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-preview-btn')) {
            const index = parseInt(e.target.dataset.index, 10);
            uploadedFiles.splice(index, 1);
            renderPreviews();
        }
    });

    // --- Core Chat & History ---
    const getChatsFromStorage = () => JSON.parse(localStorage.getItem('gemini-chats')) || [];
    const saveChatsToStorage = (chats) => localStorage.setItem('gemini-chats', JSON.stringify(chats));

    const loadAndRenderSidebar = () => {
        const chats = getChatsFromStorage();
        recentChatsList.innerHTML = '';
        chats.forEach(chat => {
            const li = document.createElement('li');
            li.dataset.chatId = chat.id;
            if (chat.id === currentChatId) { li.classList.add('active'); }
            const titleSpan = document.createElement('span');
            titleSpan.className = 'chat-title';
            titleSpan.textContent = chat.title;
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-actions';
            actionsDiv.innerHTML = `<button data-action="rename" title="Rename"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.13,5.12L18.88,8.87M3,17.25V21H6.75L17.81,9.94L14.06,6.19L3,17.25Z" /></svg></button><button data-action="delete" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg></button>`;
            li.appendChild(titleSpan);
            li.appendChild(actionsDiv);
            recentChatsList.prepend(li);
        });
    };
    
    const renderChat = (messages) => {
        chatMessages.innerHTML = '';
        messages.forEach(msg => addMessageToDOM(msg.role === 'user' ? 'user' : 'model', msg.parts[0].text));
    };

    const loadChat = (chatId) => {
        if (chatId === currentChatId) return;
        const chats = getChatsFromStorage();
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            currentChatId = chat.id;
            conversationHistory = chat.messages;
            renderChat(conversationHistory);
            loadAndRenderSidebar();
        }
    };

    const startNewChat = () => {
        currentChatId = null;
        conversationHistory = [];
        chatMessages.innerHTML = '';
        chatMessages.appendChild(initialView);
        initialView.style.display = 'flex';
        userInput.value = '';
        userInput.focus();
        uploadedFiles = [];
        renderPreviews();
        loadAndRenderSidebar();
    };
    
    const addMessageToDOM = (sender, messageText, attachments = []) => {
        if (initialView.style.display !== 'none') { initialView.style.display = 'none'; }
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-content');
        let contentHTML = '';
        if (sender === 'user' && attachments.length > 0) {
            attachments.forEach(attachment => {
                if (attachment.mimeType.startsWith('image/')) {
                    contentHTML += `<img src="${attachment.data}" alt="${attachment.name}" class="sent-image-preview">`;
                }
            });
        }
        contentHTML += sender === 'model' ? marked.parse(messageText) : messageText.replace(/\n/g, '<br>');
        messageDiv.innerHTML = contentHTML;
        messageWrapper.appendChild(messageDiv);
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    
    const saveCurrentChat = () => {
        const chats = getChatsFromStorage();
        if (currentChatId) {
            const chatIndex = chats.findIndex(c => c.id === currentChatId);
            if (chatIndex !== -1) { chats[chatIndex].messages = conversationHistory; saveChatsToStorage(chats); }
        } else {
            const title = conversationHistory[0]?.parts[0]?.text.substring(0, 30) || "New Chat";
            currentChatId = Date.now().toString();
            const newChat = { id: currentChatId, title: title, messages: conversationHistory };
            chats.push(newChat);
            saveChatsToStorage(chats);
            loadAndRenderSidebar();
        }
    };
    
    const adjustTextareaHeight = () => {
        userInput.style.height = 'auto';
        userInput.style.height = `${userInput.scrollHeight}px`;
    };

    const handleRename = (li, chatId) => {
        const titleSpan = li.querySelector('.chat-title');
        const currentTitle = titleSpan.textContent;
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'rename-input'; input.value = currentTitle;
        li.replaceChild(input, titleSpan);
        input.focus(); input.select();
        const saveRename = () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== currentTitle) {
                const chats = getChatsFromStorage();
                const chatIndex = chats.findIndex(c => c.id === chatId);
                if (chatIndex !== -1) { chats[chatIndex].title = newTitle; saveChatsToStorage(chats); }
                titleSpan.textContent = newTitle;
            }
            li.replaceChild(titleSpan, input);
        };
        input.addEventListener('blur', saveRename);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') li.replaceChild(titleSpan, input); });
    };

    const handleDelete = (chatId) => {
        if (!confirm('Are you sure you want to delete this chat?')) return;
        let chats = getChatsFromStorage();
        chats = chats.filter(c => c.id !== chatId);
        saveChatsToStorage(chats);
        if (currentChatId === chatId) { startNewChat(); } 
        else { loadAndRenderSidebar(); }
    };

    // --- Event Listeners ---
    newChatButton.addEventListener('click', startNewChat);

    recentChatsList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const chatId = li.dataset.chatId;
        const actionButton = e.target.closest('[data-action]');
        if (actionButton) {
            const action = actionButton.dataset.action;
            if (action === 'rename') { handleRename(li, chatId); } 
            else if (action === 'delete') { handleDelete(chatId); }
        } else {
            loadChat(chatId);
        }
    });

    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; body.classList.add('drag-over'); });
    window.addEventListener('dragleave', (e) => { e.preventDefault(); dragCounter--; if (dragCounter === 0) { body.classList.remove('drag-over'); } });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
        e.preventDefault(); dragCounter = 0; body.classList.remove('drag-over');
        if (e.dataTransfer.files) { addFilesToUpload(e.dataTransfer.files); }
    });

    fileUploadInput.addEventListener('change', (e) => addFilesToUpload(e.target.files));
    
    userInput.addEventListener('paste', (e) => {
        if (e.clipboardData.files.length > 0) { e.preventDefault(); addFilesToUpload(e.clipboardData.files); }
    });
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatForm.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    userInput.addEventListener('input', adjustTextareaHeight);

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userMessage = userInput.value.trim();
        if (!userMessage && uploadedFiles.length === 0) return;
        addMessageToDOM('user', userMessage, uploadedFiles);
        conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
        saveCurrentChat();
        sendButton.disabled = true;
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage, history: conversationHistory.slice(0, -1), files: uploadedFiles })
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Request failed');
            const data = await response.json();
            const modelMessage = data.response;
            addMessageToDOM('model', modelMessage);
            conversationHistory.push({ role: 'model', parts: [{ text: modelMessage }] });
            saveCurrentChat();
        } catch (error) {
            addMessageToDOM('model', `[SYSTEM_ERROR]: ${error.message}`);
        } finally {
            userInput.value = '';
            adjustTextareaHeight();
            uploadedFiles = [];
            renderPreviews();
            sendButton.disabled = false;
        }
    });
    
    savePdfButton.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const source = document.getElementById('chat-messages');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        savePdfButton.textContent = 'Generating...';
        savePdfButton.disabled = true;
        const printStyles = ` body { background-color: #FFFFFF !important; font-family: 'Inter', sans-serif !important; } #chat-messages { color: #111827 !important; } .user-message .message-content { background-color: #f3f4f6 !important; } .model-message strong, .model-message b { color: #16a34a !important; font-weight: 700 !important; } .model-message li > strong:first-child, .model-message li > b:first-child { color: #d97706 !important; font-weight: 700 !important; } #sidebar, #chat-input-container, #app-header { display: none !important; } pre, code { font-family: 'Consolas', 'Menlo', 'Courier New', monospace !important; } `;
        const styleEl = document.createElement('style');
        styleEl.id = 'print-styles';
        styleEl.innerHTML = printStyles;
        document.head.appendChild(styleEl);
        setTimeout(() => {
            pdf.html(source, {
                callback: function (doc) {
                    document.getElementById('print-styles').remove();
                    doc.save('gemini-chat-light.pdf');
                    savePdfButton.textContent = 'Save PDF';
                    savePdfButton.disabled = false;
                },
                autoPaging: 'text', margin: [20, 20, 20, 20], width: pdfWidth - 40,
                windowWidth: source.scrollWidth
            }).catch(err => {
                document.getElementById('print-styles').remove();
                console.error("Error generating PDF:", err);
                savePdfButton.textContent = 'Save PDF';
                savePdfButton.disabled = false;
                alert('Sorry, there was a critical error creating the PDF.');
            });
        }, 100);
    });

    emojiButton.addEventListener('click', () => emojiPicker.classList.toggle('show'));

    startNewChat();
});
