// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
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

    let conversationHistory = [];
    let currentChatId = null;

    // --- Core History Functions (No Changes) ---
    const getChatsFromStorage = () => JSON.parse(localStorage.getItem('gemini-chats')) || [];
    const saveChatsToStorage = (chats) => localStorage.setItem('gemini-chats', JSON.stringify(chats));

    const loadAndRenderSidebar = () => {
        const chats = getChatsFromStorage();
        recentChatsList.innerHTML = '';
        chats.forEach(chat => {
            const li = document.createElement('li');
            li.textContent = chat.title;
            li.dataset.chatId = chat.id;
            if (chat.id === currentChatId) { li.classList.add('active'); }
            li.addEventListener('click', () => loadChat(chat.id));
            recentChatsList.prepend(li);
        });
    };

    const renderChat = (messages) => {
        chatMessages.innerHTML = '';
        messages.forEach(msg => addMessageToDOM(msg.role === 'user' ? 'user' : 'model', msg.parts[0].text));
    };

    const loadChat = (chatId) => {
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
        initialView.style.display = 'flex'; // Use flex for centering
        userInput.value = '';
        userInput.focus();
        loadAndRenderSidebar();
    };

    const addMessageToDOM = (sender, messageText) => {
        if (initialView.style.display !== 'none') {
            initialView.style.display = 'none';
        }
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-content');
        messageDiv.innerHTML = sender === 'model' ? marked.parse(messageText) : messageText;
        messageWrapper.appendChild(messageDiv);
        chatMessages.appendChild(messageWrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    
    const saveCurrentChat = () => {
        const chats = getChatsFromStorage();
        if (currentChatId) {
            const chatIndex = chats.findIndex(c => c.id === currentChatId);
            if (chatIndex !== -1) {
                chats[chatIndex].messages = conversationHistory;
                saveChatsToStorage(chats);
            }
        } else {
            const title = conversationHistory[0]?.parts[0]?.text.substring(0, 30);
            if (title) {
                currentChatId = Date.now().toString();
                const newChat = { id: currentChatId, title: title, messages: conversationHistory };
                chats.push(newChat);
                saveChatsToStorage(chats);
                loadAndRenderSidebar();
            }
        }
    };

    // --- Event Listeners ---
    newChatButton.addEventListener('click', startNewChat);

    chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const userMessage = userInput.value.trim();
        if (!userMessage) return;
        addMessageToDOM('user', userMessage);
        conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });
        saveCurrentChat();
        const userMessageForApi = userInput.value;
        userInput.value = '';
        sendButton.disabled = true;
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessageForApi, history: conversationHistory.slice(0, -1) })
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
            sendButton.disabled = false;
        }
    });

    // --- PDF Logic ---
    savePdfButton.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const source = document.getElementById('chat-messages');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        savePdfButton.textContent = 'Generating...';
        savePdfButton.disabled = true;

        pdf.html(source, {
            callback: function (doc) {
                doc.save('gemini-chat.pdf');
                savePdfButton.textContent = 'Save PDF';
                savePdfButton.disabled = false;
            },
            autoPaging: 'text',
            margin: [20, 20, 20, 20],
            width: pdfWidth - 40,
            windowWidth: source.scrollWidth,
            html2canvas: {
                backgroundColor: '#131314', // The correct background color
                useCORS: true
            }
        }).catch(err => {
            console.error("Error generating PDF:", err);
            savePdfButton.textContent = 'Save PDF';
            savePdfButton.disabled = false;
            alert('Sorry, there was a critical error creating the PDF.');
        });
    });

    emojiButton.addEventListener('click', () => emojiPicker.classList.toggle('show'));

    // --- Initial Load ---
    startNewChat();
});