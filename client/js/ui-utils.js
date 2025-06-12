// Utilitaires pour l'interface utilisateur
class UIUtils {
    constructor(chatClient) {
        this.chatClient = chatClient;
    }

    // Suppression de switchToLogin car nous utilisons maintenant auth.html

    switchToRoomSelection() {
        this.chatClient.roomScreen.classList.remove("hidden");
        this.chatClient.chatScreen.classList.add("hidden");
        this.chatClient.welcomeUsername.textContent = this.chatClient.username;
        this.chatClient.roomManager.requestRoomList();
    }

    switchToChat() {
        this.chatClient.roomScreen.classList.add("hidden");
        this.chatClient.chatScreen.classList.remove("hidden");
        this.chatClient.currentUser.textContent = this.chatClient.username;
        this.chatClient.messageInput.focus();
        this.chatClient.roomManager.updateRoomDisplay();
    }

    showStatus(message, type) {
        // Créer un élément de notification flottant
        const notification = document.createElement('div');
        notification.className = `status-notification status-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Afficher puis masquer après un délai
        setTimeout(() => {
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        }, 10);
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // Gestion des sons de notification
    initializeSounds() {
        this.audioContext = null;

        document.addEventListener(
            "click",
            () => {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.createNotificationSounds();
                }
            },
            { once: true },
        );
    }

    createNotificationSounds() {
        // Son d'envoi - ton plus aigu et court
        this.sendSound = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        };

        // Son de réception - ton plus grave et doux
        this.receiveSound = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.2);

            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }

    playSound(soundType) {
        const soundEnabledChat = this.chatClient.soundEnabledChat?.checked ?? true;

        if (!soundEnabledChat) return;
        if (!this.audioContext) return;

        try {
            if (soundType === "send" && this.sendSound) {
                this.sendSound();
            } else if (soundType === "receive" && this.receiveSound) {
                this.receiveSound();
            }
        } catch (error) {
            console.warn("Erreur lors de la lecture du son:", error);
        }
    }
}