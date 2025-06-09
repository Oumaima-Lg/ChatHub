const WebSocket = require("ws")
const net = require("net")

const WS_PORT = 3000
const TCP_SERVER = "localhost"
const TCP_PORT = 8080

console.log("Démarrage du proxy WebSocket...")

const wss = new WebSocket.Server({ 
  port: WS_PORT,
  maxPayload: 50 * 1024 * 1024 // 50 MB
})

console.log(`Serveur WebSocket proxy démarré sur le port ${WS_PORT}`)
console.log(`Redirection vers le serveur TCP ${TCP_SERVER}:${TCP_PORT}`)

wss.on("connection", (ws) => {
  console.log("Nouvelle connexion WebSocket")

  const tcpClient = new net.Socket()
  let tcpBuffer = Buffer.alloc(0)
  
  tcpClient.connect(TCP_PORT, TCP_SERVER, () => {
    console.log("Connecté au serveur TCP")
  })

  // WebSocket vers TCP
  ws.on("message", (message) => {
    const data = message.toString()
    console.log("WS -> TCP:", data.substring(0, 100) + (data.length > 100 ? "..." : ""))
    tcpClient.write(data + '\0') // Ajouter un délimiteur
  })

  // TCP vers WebSocket avec gestion des messages fragmentés
  tcpClient.on("data", (data) => {
    tcpBuffer = Buffer.concat([tcpBuffer, data])
    
    let nullIndex
    while ((nullIndex = tcpBuffer.indexOf(0)) !== -1) {
      const message = tcpBuffer.slice(0, nullIndex).toString()
      tcpBuffer = tcpBuffer.slice(nullIndex + 1)
      
      if (message.length > 0) {
        console.log("TCP -> WS:", message.substring(0, 100) + (message.length > 100 ? "..." : ""))
        ws.send(message)
      }
    }
  })

  ws.on("close", () => {
    console.log("Connexion WebSocket fermée")
    tcpClient.destroy()
  })

  tcpClient.on("close", () => {
    console.log("Connexion TCP fermée")
    ws.close()
  })

  tcpClient.on("error", (err) => {
    console.error("Erreur TCP:", err)
    ws.close()
  })

  ws.on("error", (err) => {
    console.error("Erreur WebSocket:", err)
    tcpClient.destroy()
  })
})