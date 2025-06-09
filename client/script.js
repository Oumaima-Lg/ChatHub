class ChatClient {
  constructor() {
    this.socket = null
    this.username = ""
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.manualDisconnect = false

    this.currentRoom = "general"
    this.currentRoomType = "public"
    this.availableRooms = []
    this.roomUsers = {} // Stocke les utilisateurs par salle

    // Sons de notification
    this.sendSound = null
    this.receiveSound = null
    this.initializeSounds()

    this.initializeElements()
    this.attachEventListeners()
  }

  initializeSounds() {
    this.audioContext = null

    document.addEventListener(
      "click",
      () => {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
          this.createNotificationSounds()
        }
      },
      { once: true },
    )
  }

  createNotificationSounds() {
    // Son d'envoi - ton plus aigu et court
    this.sendSound = () => {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1)

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.15)
    }

    // Son de réception - ton plus grave et doux
    this.receiveSound = () => {
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.2)

      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + 0.3)
    }
  }

  playSound(soundType) {
    const soundEnabled = this.soundEnabled?.checked ?? true
    const soundEnabledChat = this.soundEnabledChat?.checked ?? true

    if (!soundEnabled && !soundEnabledChat) return
    if (!this.audioContext) return

    try {
      if (soundType === "send" && this.sendSound) {
        this.sendSound()
      } else if (soundType === "receive" && this.receiveSound) {
        this.receiveSound()
      }
    } catch (error) {
      console.warn("Erreur lors de la lecture du son:", error)
    }
  }

  initializeElements() {
    // Écrans
    this.loginScreen = document.getElementById("loginScreen")
    this.roomScreen = document.getElementById("roomScreen")
    this.chatScreen = document.getElementById("chatScreen")

    // Éléments de connexion
    this.usernameInput = document.getElementById("usernameInput")
    this.serverInput = document.getElementById("serverInput")
    this.connectBtn = document.getElementById("connectBtn")
    this.connectionStatus = document.getElementById("connectionStatus")

    // Éléments de sélection de salle
    this.welcomeUsername = document.getElementById("welcomeUsername")
    this.joinPublicBtn = document.getElementById("joinPublicBtn")
    this.roomNameInput = document.getElementById("roomNameInput")
    this.roomPasswordInput = document.getElementById("roomPasswordInput")
    this.createRoomBtn = document.getElementById("createRoomBtn")
    this.joinRoomNameInput = document.getElementById("joinRoomNameInput")
    this.joinRoomPasswordInput = document.getElementById("joinRoomPasswordInput")
    this.joinPrivateBtn = document.getElementById("joinPrivateBtn")
    this.roomsList = document.getElementById("roomsList")
    this.refreshRoomsBtn = document.getElementById("refreshRoomsBtn")
    this.backToLoginBtn = document.getElementById("backToLoginBtn")

    // Éléments de chat
    this.roomTitle = document.getElementById("roomTitle")
    this.roomType = document.getElementById("roomType")
    this.onlineCount = document.getElementById("onlineCount")
    this.currentUser = document.getElementById("currentUser")
    this.leaveRoomBtn = document.getElementById("leaveRoomBtn")
    this.disconnectBtn = document.getElementById("disconnectBtn")
    this.usersList = document.getElementById("usersList")
    this.userCount = document.getElementById("userCount")
    this.messagesContainer = document.getElementById("messagesContainer")
    this.messageInput = document.getElementById("messageInput")
    this.sendBtn = document.getElementById("sendBtn")
    this.refreshUsers = document.getElementById("refreshUsers")

    // Contrôles sonores
    this.soundEnabled = document.getElementById("soundEnabled")
    this.soundEnabledChat = document.getElementById("soundEnabledChat")
  }

  attachEventListeners() {
    // Connexion
    this.connectBtn.addEventListener("click", () => this.connect())
    this.usernameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.connect()
    })
    this.serverInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.connect()
    })

    // Sélection de salle
    this.joinPublicBtn.addEventListener("click", () => this.joinPublicRoom())
    this.createRoomBtn.addEventListener("click", () => this.createPrivateRoom())
    this.joinPrivateBtn.addEventListener("click", () => this.joinPrivateRoom())
    this.refreshRoomsBtn.addEventListener("click", () => this.requestRoomList())
    this.backToLoginBtn.addEventListener("click", () => this.backToLogin())

    // Gestion des touches Enter dans les champs de salle
    this.roomPasswordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.createPrivateRoom()
    })
    this.joinRoomPasswordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.joinPrivateRoom()
    })

    // Chat
    this.leaveRoomBtn.addEventListener("click", () => this.leaveRoom())
    this.disconnectBtn.addEventListener("click", () => this.disconnect())
    this.sendBtn.addEventListener("click", () => this.sendMessage())
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendMessage()
    })
    this.refreshUsers.addEventListener("click", () => this.requestRoomUserList())

    // Contrôles sonores
    if (this.soundEnabled) {
      this.soundEnabled.addEventListener("change", (e) => {
        if (this.soundEnabledChat) {
          this.soundEnabledChat.checked = e.target.checked
        }
      })
    }

    if (this.soundEnabledChat) {
      this.soundEnabledChat.addEventListener("change", (e) => {
        if (this.soundEnabled) {
          this.soundEnabled.checked = e.target.checked
        }
      })
    }

    // Gestion de la fermeture de la fenêtre
    window.addEventListener("beforeunload", () => {
      if (this.isConnected) {
        this.disconnect()
      }
    })
  }

  connect() {
    const username = this.usernameInput.value.trim()
    const server = this.serverInput.value.trim() || "localhost:3000"

    if (!username) {
      this.showStatus("Veuillez entrer un pseudonyme", "error")
      return
    }

    if (username.length > 20) {
      this.showStatus("Le pseudonyme ne peut pas dépasser 20 caractères", "error")
      return
    }

    this.username = username
    this.connectBtn.disabled = true
    this.manualDisconnect = false
    this.showStatus("Connexion en cours...", "connecting")

    try {
      this.connectToServer(server)
    } catch (error) {
      this.showStatus("Erreur de connexion: " + error.message, "error")
      this.connectBtn.disabled = false
    }
  }

  connectToServer(server) {
    this.socket = new WebSocket(`ws://${server}`)

    this.socket.onopen = () => {
      console.log("Connexion WebSocket établie")
      this.socket.send(this.username)
    }

    this.socket.onmessage = (event) => {
      console.log("Message reçu:", event.data)
      this.handleMessage(event.data)
    }

    this.socket.onclose = (event) => {
      console.log("Connexion fermée:", event.code, event.reason)
      this.handleDisconnection()
    }

    this.socket.onerror = (error) => {
      console.error("Erreur WebSocket:", error)
      this.showStatus("Erreur de connexion au serveur", "error")
      this.connectBtn.disabled = false
    }

    setTimeout(() => {
      if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close()
        this.showStatus("Timeout de connexion", "error")
        this.connectBtn.disabled = false
      }
    }, 10000)
  }

  disconnect() {
    this.manualDisconnect = true
    if (this.socket) {
      this.socket.close()
    }
    this.isConnected = false
    this.switchToLogin()
    this.showStatus("Déconnecté", "error")
  }

  handleDisconnection() {
    this.isConnected = false

    if (this.manualDisconnect) {
      console.log("Déconnexion manuelle - pas de reconnexion automatique")
      return
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.showStatus(`Reconnexion... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, "connecting")

      setTimeout(() => {
        this.connectToServer(this.serverInput.value.trim() || "localhost:3000")
      }, 2000)
    } else {
      this.switchToLogin()
      this.showStatus("Connexion perdue. Veuillez vous reconnecter.", "error")
      this.reconnectAttempts = 0
    }
  }

  // Méthodes pour la gestion des salles
  joinPublicRoom() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send("JOIN_ROOM:general:")
      this.currentRoomType = "public"
    }
  }

  createPrivateRoom() {
    const roomName = this.roomNameInput.value.trim()
    const password = this.roomPasswordInput.value.trim()

    if (!roomName) {
      alert("Veuillez entrer un nom de salle")
      return
    }

    if (!password) {
      alert("Veuillez entrer un mot de passe pour la salle privée")
      return
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(`CREATE_ROOM:${roomName}:${password}`)
      this.currentRoomType = "private"
    }
  }

  joinPrivateRoom() {
    const roomName = this.joinRoomNameInput.value.trim()
    const password = this.joinRoomPasswordInput.value.trim()

    if (!roomName) {
      alert("Veuillez entrer le nom de la salle")
      return
    }

    if (!password) {
      alert("Veuillez entrer le mot de passe de la salle")
      return
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(`JOIN_ROOM:${roomName}:${password}`)
      this.currentRoomType = "private"
    }
  }

  leaveRoom() {
    // Envoyer une commande pour quitter la salle actuelle
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(`LEAVE_ROOM:${this.currentRoom}`)
    }

    // Retourner à l'écran de sélection de salle
    this.switchToRoomSelection()
    this.clearRoomInputs()
  }

  backToLogin() {
    this.disconnect()
  }

  clearRoomInputs() {
    this.roomNameInput.value = ""
    this.roomPasswordInput.value = ""
    this.joinRoomNameInput.value = ""
    this.joinRoomPasswordInput.value = ""
  }

  sendMessage() {
    const message = this.messageInput.value.trim()

    if (!message || !this.isConnected) {
      return
    }

    if (message.length > 500) {
      alert("Le message ne peut pas dépasser 500 caractères")
      return
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Envoyer le message avec le préfixe de la salle actuelle
      this.socket.send(`ROOM_MSG:${this.currentRoom}:${message}`)

      // Afficher immédiatement notre propre message
      this.addMessage("own", this.username, message)
      this.playSound("send")
    }

    this.messageInput.value = ""
    this.messageInput.focus()
  }

  requestUserList() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send("LIST")
    }
  }

  requestRoomUserList() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log(`Demande de liste des utilisateurs pour la salle: ${this.currentRoom}`)
      this.socket.send(`ROOM_USERS:${this.currentRoom}`)
    }
  }

  requestRoomList() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send("ROOMS")
    }
  }

  handleMessage(data) {
    console.log("Traitement du message:", data)

    if (data.startsWith("CLIENTS:")) {
      const clientsData = data.substring(8)
      const clients = clientsData ? clientsData.split(",").filter((c) => c.trim()) : []

      // Mise à jour de la liste globale des utilisateurs (pour l'écran de sélection)
      if (!this.isConnected) {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.showStatus("Connecté avec succès!", "success")
        this.switchToRoomSelection()
      }
    } else if (data.startsWith("ROOM_USERS:")) {
      // Nouveau format pour les utilisateurs d'une salle spécifique
      const parts = data.substring(11).split(":")
      const roomName = parts[0]
      const usersData = parts[1]
      const users = usersData ? usersData.split(",").filter((u) => u.trim()) : []

      console.log(`Liste des utilisateurs reçue pour la salle ${roomName}:`, users)

      // Mettre à jour la liste des utilisateurs pour cette salle
      this.roomUsers[roomName] = users

      // Si c'est la salle actuelle, mettre à jour l'affichage
      if (roomName === this.currentRoom) {
        this.updateUsersList(users)
      }
    } else if (data.startsWith("MESSAGE:")) {
      const parts = data.substring(8).split(":")
      const sender = parts[0]
      const message = parts.slice(1).join(":")

      if (sender !== this.username) {
        this.addMessage("other", sender, message)
        this.playSound("receive")
      }
    } else if (data.startsWith("ROOM_MSG:")) {
      // Nouveau format pour les messages de salle
      const parts = data.substring(9).split(":")
      const roomName = parts[0]
      const sender = parts[1]
      const message = parts.slice(2).join(":")

      console.log(`Message reçu pour la salle ${roomName} de ${sender}: ${message}`)

      // Vérifier si le message est pour la salle actuelle
      if (roomName === this.currentRoom && sender !== this.username) {
        this.addMessage("other", sender, message)
        this.playSound("receive")
      }
    } else if (data.startsWith("SYSTEM:")) {
      const message = data.substring(7)
      this.addMessage("system", "", message)
    } else if (data.startsWith("ERROR:")) {
      const error = data.substring(6)
      this.showStatus(error, "error")

      if (error.includes("Pseudonyme déjà utilisé")) {
        this.connectBtn.disabled = false
        if (this.socket) {
          this.socket.close()
        }
      }
    } else if (data.startsWith("ROOMS:")) {
      const roomsData = data.substring(6)
      const rooms = roomsData ? roomsData.split(",").filter((r) => r.trim()) : []
      this.updateRoomsList(rooms)
    } else if (data.startsWith("ROOM_CREATED:")) {
      const roomName = data.substring(13)
      this.currentRoom = roomName
      this.switchToChat()
      this.addMessage("system", "", `Salle '${roomName}' créée avec succès`)
      this.updateRoomDisplay()
      // Demander la liste des utilisateurs après un court délai
      setTimeout(() => {
        this.requestRoomUserList()
      }, 500)
    } else if (data.startsWith("ROOM_JOINED:")) {
      const roomName = data.substring(12)
      this.currentRoom = roomName
      this.switchToChat()
      this.messagesContainer.innerHTML = "" // Vider les messages précédents
      this.addMessage("system", "", `Vous avez rejoint la salle '${roomName}'`)
      this.updateRoomDisplay()

      // CORRECTION PRINCIPALE : Demander la liste des utilisateurs après avoir rejoint la salle
      console.log(`Salle rejointe: ${roomName}, demande de la liste des utilisateurs...`)
      setTimeout(() => {
        this.requestRoomUserList()
      }, 500) // Délai pour s'assurer que le serveur a fini de traiter l'ajout
    } else if (data.startsWith("ROOM_LEFT:")) {
      const roomName = data.substring(10)
      if (roomName === this.currentRoom) {
        this.currentRoom = "general" // Revenir à la salle générale par défaut
        this.switchToRoomSelection()
      }
    }
  }

  addMessage(type, sender, content) {
    const messageDiv = document.createElement("div")
    messageDiv.className = `message message-${type}`

    const time = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    let html = ""

    if (type === "system") {
      html = `<div class="message-content">${this.escapeHtml(content)}</div>`;
    } else {
      if (type === "other") {
        html += `<div class="message-sender">${sender}</div>`;
      } else if (type === "own") {
        html += `<div class="message-sender">Vous</div>`;
      }

      // hna anst3mlo markdown
      html += `<div class="message-content">${formatMessageWithMarkdown(content)}</div>`;
      html += `<div class="message-time">${time}</div>`;
    }

    messageDiv.innerHTML = html
    this.messagesContainer.appendChild(messageDiv)
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
  }

  updateUsersList(users) {
    console.log("Mise à jour de la liste des utilisateurs:", users)
    this.usersList.innerHTML = ""
    this.userCount.textContent = users.length
    this.onlineCount.textContent = `${users.length} en ligne`

    users.forEach((user) => {
      const li = document.createElement("li")
      li.textContent = user
      if (user === this.username) {
        li.classList.add("current-user")
        li.title = "Vous"
      }
      this.usersList.appendChild(li)
    })
  }

  updateRoomsList(rooms) {
    this.availableRooms = rooms

    if (rooms.length === 0) {
      this.roomsList.innerHTML = '<div class="no-rooms">Aucune salle disponible</div>'
      return
    }

    let html = ""
    rooms.forEach((room) => {
      const isPrivate = room.includes("(private)")
      const roomName = room.replace("(private)", "").trim()

      html += `
        <div class="room-item">
          <div class="room-item-info">
            <div class="room-item-name">${roomName} ${isPrivate ? "🔒" : "🌍"}</div>
            <div class="room-item-users">${isPrivate ? "Privée" : "Publique"}</div>
          </div>
          <button class="room-item-btn" onclick="chatClient.quickJoinRoom('${roomName}', ${isPrivate})">
            Rejoindre
          </button>
        </div>
      `
    })

    this.roomsList.innerHTML = html
  }

  quickJoinRoom(roomName, isPrivate) {
    if (isPrivate) {
      const password = prompt(`Mot de passe pour la salle "${roomName}" :`)
      if (password) {
        this.socket.send(`JOIN_ROOM:${roomName}:${password}`)
        this.currentRoomType = "private"
      }
    } else {
      this.socket.send(`JOIN_ROOM:${roomName}:`)
      this.currentRoomType = "public"
    }
  }

  updateRoomDisplay() {
    this.roomTitle.textContent = this.currentRoom === "general" ? "Salle Générale" : this.currentRoom
    this.roomType.textContent = this.currentRoomType === "private" ? "🔒 Privée" : "🌍 Publique"
  }

  switchToLogin() {
    this.loginScreen.classList.remove("hidden")
    this.roomScreen.classList.add("hidden")
    this.chatScreen.classList.add("hidden")
    this.connectBtn.disabled = false
    this.clearRoomInputs()
  }

  switchToRoomSelection() {
    this.loginScreen.classList.add("hidden")
    this.roomScreen.classList.remove("hidden")
    this.chatScreen.classList.add("hidden")
    this.welcomeUsername.textContent = this.username
    this.requestRoomList()
  }

  switchToChat() {
    this.loginScreen.classList.add("hidden")
    this.roomScreen.classList.add("hidden")
    this.chatScreen.classList.remove("hidden")
    this.currentUser.textContent = this.username
    this.messageInput.focus()
    this.updateRoomDisplay()
  }

  showStatus(message, type) {
    this.connectionStatus.textContent = message
    this.connectionStatus.className = `status-${type}`

    if (type === "success") {
      setTimeout(() => {
        this.connectionStatus.textContent = ""
        this.connectionStatus.className = ""
      }, 2000)
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }
}

// Initialiser l'application
let chatClient
document.addEventListener("DOMContentLoaded", () => {
  chatClient = new ChatClient()
})

// ici pour les emojis
const toggleBtn = document.getElementById('toggle-emoji');
const pickerContainer = document.getElementById('emoji-picker-container');
const picker = pickerContainer.querySelector('emoji-picker');
const messageInput = document.getElementById('messageInput');

//ici pour afficher et masquer la liste des emojis
toggleBtn.addEventListener('click', (e) => {
    e.preventDefault(); 
    pickerContainer.style.display =
    pickerContainer.style.display === 'none' ? 'block' : 'none';
});

// ici pour insérer l'emoji choisi dans le texte
picker.addEventListener('emoji-click', event => {
    const emoji = event.detail.unicode;
    const cursorPos = messageInput.selectionStart;
    const text = messageInput.value;
    
    messageInput.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
    messageInput.focus();
    messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
});

// ici pour masquer palette si on a cliquer ailleurs que le btn (ze3ma fshi blassa akhra anhydoha)
document.addEventListener('click', (e) => {
    if (!pickerContainer.contains(e.target) && !toggleBtn.contains(e.target)) {
    pickerContainer.style.display = 'none';
    }
});
// hadi deyal formattage 
function formatMessageWithMarkdown(rawMessage) {
  const html = marked.parseInline(rawMessage); 
  return DOMPurify.sanitize(html);    
}