class ChatClient {
  constructor() {
    this.socket = null
    this.username = ""
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.manualDisconnect = false // Nouveau flag pour déconnexion manuelle

    this.currentRoom = "general"
    this.availableRooms = []

    // Sons de notification
    this.sendSound = null
    this.receiveSound = null
    this.initializeSounds()

    this.initializeElements()
    this.attachEventListeners()
  }

  initializeSounds() {
    // Créer les sons de notification avec l'API Web Audio
    this.audioContext = null

    // Initialiser le contexte audio au premier clic utilisateur
    document.addEventListener('click', () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
        this.createNotificationSounds()
      }
    }, { once: true })
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
    // Vérifier si les sons sont activés
    const soundEnabled = this.soundEnabled?.checked ?? true
    const soundEnabledChat = this.soundEnabledChat?.checked ?? true

    if (!soundEnabled && !soundEnabledChat) return
    if (!this.audioContext) return

    try {
      if (soundType === 'send' && this.sendSound) {
        this.sendSound()
      } else if (soundType === 'receive' && this.receiveSound) {
        this.receiveSound()
      }
    } catch (error) {
      console.warn('Erreur lors de la lecture du son:', error)
    }
  }

  initializeElements() {
    // Écrans
    this.loginScreen = document.getElementById("loginScreen")
    this.chatScreen = document.getElementById("chatScreen")

    // Éléments de connexion
    this.usernameInput = document.getElementById("usernameInput")
    this.serverInput = document.getElementById("serverInput")
    this.connectBtn = document.getElementById("connectBtn")
    this.connectionStatus = document.getElementById("connectionStatus")

    // Éléments de chat
    this.currentUser = document.getElementById("currentUser")
    this.disconnectBtn = document.getElementById("disconnectBtn")
    this.usersList = document.getElementById("usersList")
    this.userCount = document.getElementById("userCount")
    this.messagesContainer = document.getElementById("messagesContainer")
    this.messageInput = document.getElementById("messageInput")
    this.sendBtn = document.getElementById("sendBtn")
    this.refreshBtn = document.getElementById("refreshUsers")
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

    // Déconnexion
    this.disconnectBtn.addEventListener("click", () => this.disconnect())

    // Envoi de messages
    this.sendBtn.addEventListener("click", () => this.sendMessage())
    this.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.sendMessage()
    })

    // Actualiser la liste des utilisateurs
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener("click", () => this.requestUserList())
    }




    const createRoomBtn = document.getElementById("createRoomBtn")
    const joinRoomBtn = document.getElementById("joinRoomBtn")
    const roomListBtn = document.getElementById("roomListBtn")
    
    if (createRoomBtn) {
        createRoomBtn.addEventListener("click", () => this.createRoom())
    }
    
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener("click", () => this.joinRoom())
    }
    
    if (roomListBtn) {
        roomListBtn.addEventListener("click", () => this.requestRoomList())
    }

    

    // Contrôles sonores
    this.soundEnabled = document.getElementById("soundEnabled")
    this.soundEnabledChat = document.getElementById("soundEnabledChat")

    // Synchroniser les deux checkboxes
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
    this.manualDisconnect = false // Réinitialiser le flag lors d'une nouvelle connexion
    this.showStatus("Connexion en cours...", "connecting")

    try {
      this.connectToServer(server)
    } catch (error) {
      this.showStatus("Erreur de connexion: " + error.message, "error")
      this.connectBtn.disabled = false
    }
  }

  connectToServer(server) {
    // Connexion WebSocket réelle au proxy
    this.socket = new WebSocket(`ws://${server}`)

    this.socket.onopen = () => {
      console.log("Connexion WebSocket établie")
      // Envoyer le pseudonyme au serveur
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

    // Timeout de connexion
    setTimeout(() => {
      if (this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close()
        this.showStatus("Timeout de connexion", "error")
        this.connectBtn.disabled = false
      }
    }, 10000)
  }

  disconnect() {
    this.manualDisconnect = true // Marquer comme déconnexion manuelle
    if (this.socket) {
      this.socket.close()
    }
    this.isConnected = false
    this.switchToLogin()
    this.showStatus("Déconnecté", "error")
  }

  handleDisconnection() {
    this.isConnected = false

    // Ne pas reconnecter si c'est une déconnexion manuelle
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

  sendMessage() {
    const message = this.messageInput.value.trim()

    if (!message || !this.isConnected) {
      return
    }

    if (message.length > 500) {
      alert("Le message ne peut pas dépasser 500 caractères")
      return
    }

    // Envoyer le message au serveur
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message)

      // Afficher immédiatement notre propre message
      this.addMessage("own", this.username, message)

      // Jouer le son d'envoi
      this.playSound('send')
    }

    this.messageInput.value = ""
    this.messageInput.focus()
  }

  requestUserList() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send("LIST")
    }
  }

  handleMessage(data) {
    console.log("Traitement du message:", data)

    // Parser les différents types de messages du serveur C
    if (data.startsWith("CLIENTS:")) {
      const clientsData = data.substring(8)
      const clients = clientsData ? clientsData.split(",").filter((c) => c.trim()) : []
      this.updateUsersList(clients)

      // Si c'est la première fois qu'on reçoit la liste, on est connecté
      if (!this.isConnected) {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.showStatus("Connecté avec succès!", "success")
        this.switchToChat()
      }
    } else if (data.startsWith("MESSAGE:")) {
      const parts = data.substring(8).split(":")
      const sender = parts[0]
      const message = parts.slice(1).join(":")

      // Ne pas afficher nos propres messages (ils sont déjà affichés localement)
      if (sender !== this.username) {
        this.addMessage("other", sender, message)
        // Jouer le son de réception pour les messages des autres
        this.playSound('receive')
      }
    } else if (data.startsWith("SYSTEM:")) {
      const message = data.substring(7)
      this.addMessage("system", "", message)
    } else if (data.startsWith("ERROR:")) {
      const error = data.substring(6)
      this.showStatus(error, "error")
      this.connectBtn.disabled = false
      if (this.socket) {
        this.socket.close()
      }
    }


    if (data.startsWith("ROOMS:")) {
        const roomsData = data.substring(6)
        const rooms = roomsData ? roomsData.split(",").filter(r => r.trim()) : []
        this.updateRoomsList(rooms)
    } else if (data.startsWith("ROOM_CREATED:")) {
        const roomName = data.substring(13)
        this.currentRoom = roomName
        this.addMessage("system", "", `Room '${roomName}' créée avec succès`)
        this.updateRoomDisplay()
    } else if (data.startsWith("ROOM_JOINED:")) {
        const roomName = data.substring(12)
        this.currentRoom = roomName
        this.addMessage("system", "", `Vous avez rejoint la room '${roomName}'`)
        this.updateRoomDisplay()
        this.messagesContainer.innerHTML = "" // Vider les anciens messages
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
      html = `<div class="message-content">${content}</div>`
    } else {
      if (type === "other") {
        html += `<div class="message-sender">${sender}</div>`
      } else if (type === "own") {
        html += `<div class="message-sender">Vous</div>`
      }
      html += `<div class="message-content">${this.escapeHtml(content)}</div>`
      html += `<div class="message-time">${time}</div>`
    }

    messageDiv.innerHTML = html
    this.messagesContainer.appendChild(messageDiv)
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
  }

  updateUsersList(users) {
    this.usersList.innerHTML = ""
    this.userCount.textContent = users.length

    users.forEach((user) => {
      const li = document.createElement("li")
      li.textContent = user
      if (user === this.username) {
        li.style.fontWeight = "bold"
        li.style.color = "#667eea"
        li.title = "Vous"
      }
      this.usersList.appendChild(li)
    })
  }

  switchToChat() {
    this.loginScreen.classList.add("hidden")
    this.chatScreen.classList.remove("hidden")
    this.currentUser.textContent = this.username
    this.messageInput.focus()
  }

  switchToLogin() {
    this.chatScreen.classList.add("hidden")
    this.loginScreen.classList.remove("hidden")
    this.connectBtn.disabled = false
    this.messagesContainer.innerHTML = ""
    this.usersList.innerHTML = ""
    this.userCount.textContent = "0"
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


  createRoom() {
    const roomName = prompt("Nom de la room :")
    if (!roomName || roomName.trim() === "") return

    const isPrivate = confirm("Room privée ?")
    let password = ""

    if (isPrivate) {
      password = prompt("Mot de passe de la room :")
      if (!password) return
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(`CREATE_ROOM:${roomName.trim()}:${password}`)
    }
  }

  joinRoom() {
    const roomName = prompt("Nom de la room à rejoindre :")
    if (!roomName || roomName.trim() === "") return

    const password = prompt("Mot de passe (laisser vide si room publique) :")

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(`JOIN_ROOM:${roomName.trim()}:${password || ""}`)
    }
  }

  requestRoomList() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send("ROOMS")
    }
  }

  updateRoomsList(rooms) {
    this.availableRooms = rooms
    // Mettre à jour l'affichage si nécessaire
    console.log("Rooms disponibles:", rooms)
  }

  updateRoomDisplay() {
    // Mettre à jour l'affichage de la room actuelle
    const roomDisplay = document.getElementById("currentRoom")
    if (roomDisplay) {
      roomDisplay.textContent = this.currentRoom
    }
  }
}

// Initialiser l'application quand la page est chargée
document.addEventListener("DOMContentLoaded", () => {
  new ChatClient()
})