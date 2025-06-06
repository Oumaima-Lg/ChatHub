const WebSocket = require("ws")
const net = require("net")

const WS_PORT = 3000
const TCP_SERVER = "localhost"
const TCP_PORT = 8080

const wss = new WebSocket.Server({ port: WS_PORT })

console.log(`Serveur WebSocket proxy démarré sur le port ${WS_PORT}`)
console.log(`Redirection vers le serveur TCP ${TCP_SERVER}:${TCP_PORT}`)

wss.on("connection", (ws) => {
  console.log("Nouvelle connexion WebSocket")

  // Créer une connexion TCP vers le serveur C
  const tcpClient = new net.Socket()

  tcpClient.connect(TCP_PORT, TCP_SERVER, () => {
    console.log("Connecté au serveur TCP")
  })

  // Transférer les messages WebSocket vers TCP
  ws.on("message", (message) => {
    const data = message.toString()
    console.log("WS -> TCP:", data)
    tcpClient.write(data)
  })

  // Transférer les messages TCP vers WebSocket
  tcpClient.on("data", (data) => {
    const message = data.toString()
    console.log("TCP -> WS:", message)
    ws.send(message)
  })

  // Gérer les déconnexions
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
