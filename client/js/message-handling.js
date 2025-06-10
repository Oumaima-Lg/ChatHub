// Gestion des messages et des utilisateurs
class MessageHandler {
    constructor(chatClient) {
        this.chatClient = chatClient;
    }

    handleMessage(data) {
        console.log("Traitement du message:", data);

        if (data.startsWith("CLIENTS:")) {
            const clientsData = data.substring(8);
            const clients = clientsData ? clientsData.split(",").filter((c) => c.trim()) : [];

            if (!this.chatClient.isConnected) {
                this.chatClient.isConnected = true;
                this.chatClient.reconnectAttempts = 0;
                this.chatClient.showStatus("Connecté avec succès!", "success");
                this.chatClient.switchToRoomSelection();
            }
        } else if (data.startsWith("ROOM_USERS:")) {
            const parts = data.substring(11).split(":");
            const roomName = parts[0];
            const usersData = parts[1];
            const users = usersData ? usersData.split(",").filter((u) => u.trim()) : [];

            console.log(`Liste des utilisateurs reçue pour la salle ${roomName}:`, users);
            this.chatClient.roomUsers[roomName] = users;

            if (roomName === this.chatClient.currentRoom) {
                this.updateUsersList(users);
            }
        } else if (data.startsWith("MESSAGE:")) {
            const parts = data.substring(8).split(":");
            const sender = parts[0];
            const message = parts.slice(1).join(":");

            if (sender !== this.chatClient.username) {
                this.addMessage("other", sender, message);
                this.chatClient.playSound("receive");
            }
        } else if (data.startsWith("ROOM_MSG:")) {
            const parts = data.substring(9).split(":");
            const roomName = parts[0];
            const sender = parts[1];
            const message = parts.slice(2).join(":");

            console.log(`Message reçu pour la salle ${roomName} de ${sender}: ${message}`);

            if (roomName === this.chatClient.currentRoom && sender !== this.chatClient.username) {
                this.addMessage("other", sender, message);
                this.chatClient.playSound("receive");
            }
        } else if (data.startsWith("SYSTEM:")) {
            const message = data.substring(7);
            this.addMessage("system", "", message);
        } else if (data.startsWith("ERROR:")) {
            const error = data.substring(6);
            this.chatClient.showStatus(error, "error");

            if (error.includes("Pseudonyme déjà utilisé")) {
                this.chatClient.connectBtn.disabled = false;
                if (this.chatClient.socket) {
                    this.chatClient.socket.close();
                }
            }
        } else if (data.startsWith("ROOMS:")) {
            const roomsData = data.substring(6);
            const rooms = roomsData ? roomsData.split(",").filter((r) => r.trim()) : [];
            this.chatClient.roomManager.updateRoomsList(rooms);
        } else if (data.startsWith("ROOM_CREATED:")) {
            const roomName = data.substring(13);
            this.chatClient.currentRoom = roomName;
            this.chatClient.switchToChat();
            this.addMessage("system", "", `Salle '${roomName}' créée avec succès`);
            this.chatClient.roomManager.updateRoomDisplay();
            setTimeout(() => {
                this.chatClient.roomManager.requestRoomUserList();
            }, 500);
        } else if (data.startsWith("ROOM_JOINED:")) {
            const roomName = data.substring(12);
            this.chatClient.currentRoom = roomName;
            this.chatClient.switchToChat();
            this.chatClient.messagesContainer.innerHTML = "";
            this.addMessage("system", "", `Vous avez rejoint la salle '${roomName}'`);
            this.chatClient.roomManager.updateRoomDisplay();

            console.log(`Salle rejointe: ${roomName}, demande de la liste des utilisateurs...`);
            setTimeout(() => {
                this.chatClient.roomManager.requestRoomUserList();
            }, 500);
        } else if (data.startsWith("ROOM_LEFT:")) {
            const roomName = data.substring(10);
            if (roomName === this.chatClient.currentRoom) {
                this.chatClient.currentRoom = "general";
                this.chatClient.switchToRoomSelection();
            }
        }
    }

    sendMessage() {
        const message = this.chatClient.messageInput.value.trim();

        if (!message || !this.chatClient.isConnected) {
            return;
        }

        if (message.length > 500) {
            alert("Le message ne peut pas dépasser 500 caractères");
            return;
        }

        if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.OPEN) {
            this.chatClient.socket.send(`ROOM_MSG:${this.chatClient.currentRoom}:${message}`);
            this.addMessage("own", this.chatClient.username, message);
            this.chatClient.playSound("send");
        }

        this.chatClient.messageInput.value = "";
        this.chatClient.messageInput.focus();
    }

    addMessage(type, sender, content) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message message-${type}`;

        const time = new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });

        let html = "";

        if (type === "system") {
            html = `<div class="message-content">${this.chatClient.escapeHtml(content)}</div>`;
        } else {
            if (type === "other") {
                html += `<div class="message-sender">${sender}</div>`;
            } else if (type === "own") {
                html += `<div class="message-sender">Vous</div>`;
            }

            html += `<div class="message-content">${formatMessageWithMarkdown(content)}</div>`;
            html += `<div class="message-time">${time}</div>`;
        }

        messageDiv.innerHTML = html;
        this.chatClient.messagesContainer.appendChild(messageDiv);
        this.chatClient.messagesContainer.scrollTop = this.chatClient.messagesContainer.scrollHeight;
    }

    updateUsersList(users) {
        console.log("Mise à jour de la liste des utilisateurs:", users);
        this.chatClient.usersList.innerHTML = "";
        this.chatClient.userCount.textContent = users.length;
        this.chatClient.onlineCount.textContent = `${users.length} en ligne`;

        users.forEach((user) => {
            const li = document.createElement("li");
            li.textContent = user;
            if (user === this.chatClient.username) {
                li.classList.add("current-user");
                li.title = "Vous";
            }
            this.chatClient.usersList.appendChild(li);
        });
    }
}