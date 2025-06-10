// Gestion des emojis
class EmojiHandler {
    constructor() {
        this.initializeEmojiPicker();
    }

    initializeEmojiPicker() {
        document.addEventListener('DOMContentLoaded', () => {
            const toggleBtn = document.getElementById('toggle-emoji');
            const pickerContainer = document.getElementById('emoji-picker-container');
            const picker = pickerContainer?.querySelector('emoji-picker');
            const messageInput = document.getElementById('messageInput');

            if (!toggleBtn || !pickerContainer || !picker || !messageInput) {
                console.warn('Éléments emoji non trouvés, réessai dans 1 seconde...');
                setTimeout(() => this.initializeEmojiPicker(), 1000);
                return;
            }

            // Afficher et masquer la liste des emojis
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                pickerContainer.style.display =
                    pickerContainer.style.display === 'none' ? 'block' : 'none';
            });

            // Insérer l'emoji choisi dans le texte
            picker.addEventListener('emoji-click', event => {
                const emoji = event.detail.unicode;
                const cursorPos = messageInput.selectionStart;
                const text = messageInput.value;

                messageInput.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
                messageInput.focus();
                messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
            });

            // Masquer palette si on clique ailleurs
            document.addEventListener('click', (e) => {
                if (!pickerContainer.contains(e.target) && !toggleBtn.contains(e.target)) {
                    pickerContainer.style.display = 'none';
                }
            });
        });
    }
}

// Fonction de formatage Markdown
function formatMessageWithMarkdown(rawMessage) {
    const html = marked.parseInline(rawMessage);
    return DOMPurify.sanitize(html);
}