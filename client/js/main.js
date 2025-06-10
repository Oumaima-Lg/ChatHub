// Classe principale ChatClient
class ChatClient {
    constructor() {
        this.socket = null;
        this.username = AuthCheck.getUsername(); // Utiliser le nom d'utilisateur Firebase
        this.userId = AuthCheck.getUserId(); // Utiliser l'ID utilisateur Firebase
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.manualDisconnect = false;

        this.currentRoom = "general";
        this.currentRoomType = "public";
        this.availableRooms = [];
        this.roomUsers = {};

        // Initialiser les gestionnaires
        this.uiUtils = new UIUtils(this);
        this.connectionManager = new ConnectionManager(this);
        this.roomManager = new RoomManager(this);
        this.messageHandler = new MessageHandler(this);
        this.emojiHandler = new EmojiHandler();

        // Sons de notification
        this.sendSound = null;
        this.receiveSound = null;
        this.uiUtils.initializeSounds();

        this.initializeElements();
        this.attachEventListeners();
        
        // Connecter automatiquement l'utilisateur
        if (this.username) {
            this.autoConnect();
        }
    }

    initializeElements() {
        // Écrans (plus besoin de loginScreen)
        this.roomScreen = document.getElementById("roomScreen");
        this.chatScreen = document.getElementById("chatScreen");

        // Éléments de sélection de salle
        this.welcomeUsername = document.getElementById("welcomeUsername");
        this.joinPublicBtn = document.getElementById("joinPublicBtn");
        this.roomNameInput = document.getElementById("roomNameInput");
        this.roomPasswordInput = document.getElementById("roomPasswordInput");
        this.createRoomBtn = document.getElementById("createRoomBtn");
        this.joinRoomNameInput = document.getElementById("joinRoomNameInput");
        this.joinRoomPasswordInput = document.getElementById("joinRoomPasswordInput");
        this.joinPrivateBtn = document.getElementById("joinPrivateBtn");
        this.roomsList = document.getElementById("roomsList");
        this.refreshRoomsBtn = document.getElementById("refreshRoomsBtn");
        this.backToLoginBtn = document.getElementById("backToLoginBtn");

        // Éléments de chat
        this.roomTitle = document.getElementById("roomTitle");
        this.roomType = document.getElementById("roomType");
        this.onlineCount = document.getElementById("onlineCount");
        this.currentUser = document.getElementById("currentUser");
        this.leaveRoomBtn = document.getElementById("leaveRoomBtn");
        this.disconnectBtn = document.getElementById("disconnectBtn");
        this.usersList = document.getElementById("usersList");
        this.userCount = document.getElementById("userCount");
        this.messagesContainer = document.getElementById("messagesContainer");
        this.messageInput = document.getElementById("messageInput");
        this.sendBtn = document.getElementById("sendBtn");
        this.refreshUsers = document.getElementById("refreshUsers");

        // Contrôles sonores
        this.soundEnabled = document.getElementById("soundEnabled");
        this.soundEnabledChat = document.getElementById("soundEnabledChat");
    }

    attachEventListeners() {
        // Sélection de salle
        this.joinPublicBtn?.addEventListener("click", () => this.roomManager.joinPublicRoom());
        this.createRoomBtn?.addEventListener("click", () => this.roomManager.createPrivateRoom());
        this.joinPrivateBtn?.addEventListener("click", () => this.roomManager.joinPrivateRoom());
        this.refreshRoomsBtn?.addEventListener("click", () => this.roomManager.requestRoomList());
        this.backToLoginBtn?.addEventListener("click", () => this.logout());

        // Gestion des touches Enter dans les champs de salle
        this.roomPasswordInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.roomManager.createPrivateRoom();
        });
        this.joinRoomPasswordInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.roomManager.joinPrivateRoom();
        });

        // Chat
        this.leaveRoomBtn?.addEventListener("click", () => this.roomManager.leaveRoom());
        this.disconnectBtn?.addEventListener("click", () => this.logout());
        this.sendBtn?.addEventListener("click", () => this.messageHandler.sendMessage());
        this.messageInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.messageHandler.sendMessage();
        });
        this.refreshUsers?.addEventListener("click", () => this.roomManager.requestRoomUserList());

        // Contrôles sonores
        if (this.soundEnabledChat) {
            this.soundEnabledChat.addEventListener("change", (e) => {
                if (this.soundEnabled) {
                    this.soundEnabled.checked = e.target.checked;
                }
            });
        }

        // Gestion de la fermeture de la fenêtre
        window.addEventListener("beforeunload", () => {
            if (this.isConnected) {
                this.connectionManager.disconnect();
            }
        });
    }

    // Méthode pour se connecter automatiquement
    autoConnect() {
        // Utiliser le serveur par défaut ou celui stocké dans les préférences
        const server = localStorage.getItem('chatHubServer') || "localhost:3000";
        this.connectionManager.connectToServer(server, this.username);
    }

    // Méthode pour se déconnecter et revenir à l'authentification
    logout() {
        this.connectionManager.disconnect();
        AuthCheck.logout();
    }

    // Méthodes déléguées pour maintenir la compatibilité
    switchToRoomSelection() { this.uiUtils.switchToRoomSelection(); }
    switchToChat() { this.uiUtils.switchToChat(); }
    showStatus(message, type) { this.uiUtils.showStatus(message, type); }
    escapeHtml(text) { return this.uiUtils.escapeHtml(text); }
    playSound(soundType) { this.uiUtils.playSound(soundType); }
}

// Variable globale pour maintenir la compatibilité
let chatClient;