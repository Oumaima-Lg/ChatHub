// Gestion des emojis
class EmojiHandler {
    constructor() {
        this.isInitialized = false;
        this.initializeEmojiPicker();
    }

    initializeEmojiPicker() {
        this.tryInitialize();
    }

    tryInitialize() {
        const toggleBtn = document.getElementById('toggle-emoji');
        const pickerContainer = document.getElementById('emoji-picker-container');
        const picker = pickerContainer?.querySelector('emoji-picker');
        const messageInput = document.getElementById('messageInput');

        if (!toggleBtn || !pickerContainer || !picker || !messageInput) {
            console.warn('Éléments emoji non trouvés, réessai dans 500ms...');
            setTimeout(() => this.tryInitialize(), 500);
            return;
        }
        if (this.isInitialized) {
            return;
        }

        console.log('Initialisation du sélecteur d\'emojis...');
        pickerContainer.classList.remove('show');
        
        // hadi pour afficher et masquer la liste des emojis
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isVisible = pickerContainer.classList.contains('show');
            
            if (isVisible) {
                pickerContainer.classList.remove('show');
            } else {
                pickerContainer.classList.add('show');
                setTimeout(() => {
                    const emojiPicker = pickerContainer.querySelector('emoji-picker');
                    if (emojiPicker && !emojiPicker.hasAttribute('data-loaded')) {
                        emojiPicker.setAttribute('data-loaded', 'true');
                        console.log('Emoji picker loaded');
                    }
                }, 100);
            }
            
            console.log('Toggle emoji picker:', !isVisible);
            console.log('Container classes:', pickerContainer.className);
        });

        // insérer l'emoji  dans txt
        picker.addEventListener('emoji-click', event => {
            console.log('Emoji sélectionné:', event.detail.unicode);
            
            const emoji = event.detail.unicode;
            const cursorPos = messageInput.selectionStart || messageInput.value.length;
            const text = messageInput.value;
            
            messageInput.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
            messageInput.focus();
            
            const newCursorPos = cursorPos + emoji.length;
            messageInput.setSelectionRange(newCursorPos, newCursorPos);
        });

        // pour masquer palette si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!pickerContainer.contains(e.target) && !toggleBtn.contains(e.target)) {
                pickerContainer.classList.remove('show');
            }
        });

        // masquer avec la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && pickerContainer.classList.contains('show')) {
                pickerContainer.classList.remove('show');
                messageInput.focus();
            }
        });

        this.isInitialized = true;
    }

    // nréinitialiser ila mabantch
    reset() {
        this.isInitialized = false;
        this.initializeEmojiPicker();
    }
}

// Fonction de formatage Markdown
function formatMessageWithMarkdown(rawMessage) {
    const html = marked.parseInline(rawMessage);
    return DOMPurify.sanitize(html);
}