// Gestion des salles de chat
class RoomManager {
    constructor(chatClient) {
        this.chatClient = chatClient;
    }

    joinPublicRoom() {
        if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.OPEN) {
            this.chatClient.socket.send("JOIN_ROOM:general:");
            this.chatClient.currentRoomType = "public";
        }
    }

    createPrivateRoom() {
        const roomName = this.chatClient.roomNameInput.value.trim();
        const password = this.chatClient.roomPasswordInput.value.trim();

        if (!roomName) {
            alert("Veuillez entrer un nom de salle");
            return;
        }

        if (!password) {
            alert("Veuillez entrer un mot de passe pour la salle privée");
            return;
        }

        if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.OPEN) {
            this.chatClient.socket.send(`CREATE_ROOM:${roomName}:${password}`);
            this.chatClient.currentRoomType = "private";
        }
    }

    joinPrivateRoom() {
        const roomName = this.chatClient.joinRoomNameInput.value.trim();
        const password = this.chatClient.joinRoomPasswordInput.value.trim();

        if (!roomName) {
            alert("Veuillez entrer le nom de la salle");
            return;
        }

        if (!password) {
            alert("Veuillez entrer le mot de passe de la salle");
            return;
        }

        if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.OPEN) {
            this.chatClient.socket.send(`JOIN_ROOM:${roomName}:${password}`);
            this.chatClient.currentRoomType = "private";
        }
    }

    leaveRoom() {
        if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.OPEN) {
            this.chatClient.socket.send(`LEAVE_ROOM:${this.chatClient.currentRoom}`);
        }

        this.chatClient.switchToRoomSelection();
        this.clearRoomInputs();
    }

    clearRoomInputs() {
        this.chatClient.roomNameInput.value = "";
        this.chatClient.roomPasswordInput.value = "";
        this.chatClient.joinRoomNameInput.value = "";
        this.chatClient.joinRoomPasswordInput.value = "";
    }

    requestRoomList() {
        if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.OPEN) {
            this.chatClient.socket.send("ROOMS");
        }
    }

    requestRoomUserList() {
        if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.OPEN) {
            console.log(`Demande de liste des utilisateurs pour la salle: ${this.chatClient.currentRoom}`);
            this.chatClient.socket.send(`ROOM_USERS:${this.chatClient.currentRoom}`);
        }
    }

    updateRoomsList(rooms) {
        this.chatClient.availableRooms = rooms;

        if (rooms.length === 0) {
            this.chatClient.roomsList.innerHTML = '<div class="no-rooms">Aucune salle disponible</div>';
            return;
        }

        let html = "";
        rooms.forEach((room) => {
            const isPrivate = room.includes("(private)");
            const roomName = room.replace("(private)", "").trim();

            html += `
                <div class="room-item">
                    <div class="room-item-info">
                        <div class="room-item-name">${roomName} ${isPrivate ? "🔒" : "🌍"}</div>
                        <div class="room-item-users">${isPrivate ? "Privée" : "Publique"}</div>
                    </div>
                    <button class="room-item-btn" onclick="chatClient.roomManager.quickJoinRoom('${roomName}', ${isPrivate})">
                        Rejoindre
                    </button>
                </div>
            `;
        });

        this.chatClient.roomsList.innerHTML = html;
    }

    quickJoinRoom(roomName, isPrivate) {
        if (isPrivate) {
            const password = prompt(`Mot de passe pour la salle "${roomName}" :`);
            if (password) {
                this.chatClient.socket.send(`JOIN_ROOM:${roomName}:${password}`);
                this.chatClient.currentRoomType = "private";
            }
        } else {
            this.chatClient.socket.send(`JOIN_ROOM:${roomName}:`);
            this.chatClient.currentRoomType = "public";
        }
    }

    updateRoomDisplay() {
        this.chatClient.roomTitle.textContent = this.chatClient.currentRoom === "general" ? "Salle Générale" : this.chatClient.currentRoom;
        this.chatClient.roomType.textContent = this.chatClient.currentRoomType === "private" ? "🔒 Privée" : "🌍 Publique";
    }
}