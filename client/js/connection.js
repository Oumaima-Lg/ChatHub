// Gestion des connexions WebSocket
class ConnectionManager {
    constructor(chatClient) {
        this.chatClient = chatClient;
    }

    // Méthode modifiée pour se connecter directement avec le nom d'utilisateur Firebase
    connectToServer(server, username) {
        if (!username) {
            console.error("Erreur: Nom d'utilisateur manquant");
            AuthCheck.logout(); // Rediriger vers l'authentification si pas de nom d'utilisateur
            return;
        }

        // Sauvegarder le serveur dans les préférences
        localStorage.setItem('chatHubServer', server);

        this.chatClient.socket = new WebSocket(`ws://${server}`);

        this.chatClient.socket.onopen = () => {
            console.log("Connexion WebSocket établie");
            this.chatClient.socket.send(username);
        };

        this.chatClient.socket.onmessage = (event) => {
            console.log("Message reçu:", event.data);
            this.chatClient.messageHandler.handleMessage(event.data);
        };

        this.chatClient.socket.onclose = (event) => {
            console.log("Connexion fermée:", event.code, event.reason);
            this.handleDisconnection();
        };

        this.chatClient.socket.onerror = (error) => {
            console.error("Erreur WebSocket:", error);
            this.chatClient.showStatus("Erreur de connexion au serveur", "error");
        };

        setTimeout(() => {
            if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.CONNECTING) {
                this.chatClient.socket.close();
                this.chatClient.showStatus("Timeout de connexion", "error");
            }
        }, 10000);
    }

    disconnect() {
        this.chatClient.manualDisconnect = true;
        if (this.chatClient.socket) {
            this.chatClient.socket.close();
        }
        this.chatClient.isConnected = false;
    }

    handleDisconnection() {
        this.chatClient.isConnected = false;

        if (this.chatClient.manualDisconnect) {
            console.log("Déconnexion manuelle - pas de reconnexion automatique");
            return;
        }

        if (this.chatClient.reconnectAttempts < this.chatClient.maxReconnectAttempts) {
            this.chatClient.reconnectAttempts++;
            this.chatClient.showStatus(`Reconnexion... (${this.chatClient.reconnectAttempts}/${this.chatClient.maxReconnectAttempts})`, "connecting");

            setTimeout(() => {
                const server = localStorage.getItem('chatHubServer') || "localhost:3000";
                this.connectToServer(server, this.chatClient.username);
            }, 2000);
        } else {
            this.chatClient.showStatus("Connexion perdue. Veuillez vous reconnecter.", "error");
            this.chatClient.reconnectAttempts = 0;
            setTimeout(() => {
                AuthCheck.logout(); // Rediriger vers l'authentification après échec de reconnexion
            }, 3000);
        }
    }
}