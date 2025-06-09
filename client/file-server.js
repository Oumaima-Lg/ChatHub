const express = require('express')
const multer = require('multer')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 3001

// Configuration CORS pour permettre les requêtes depuis le client
app.use(cors({
  origin: ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Créer le dossier uploads dans le dossier client
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log(`Dossier uploads créé: ${uploadsDir}`)
}

// Configuration multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const roomId = req.body.roomId || 'general'
    const dir = path.join(__dirname, 'uploads', roomId)
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`Dossier créé pour la room: ${dir}`)
    }
    
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const filename = uniqueSuffix + '-' + file.originalname
    console.log(`Nom de fichier généré: ${filename}`)
    cb(null, filename)
  }
})

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: function (req, file, cb) {
    console.log(`Fichier reçu: ${file.originalname}, taille: ${file.size}, type: ${file.mimetype}`)
    cb(null, true)
  }
})

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'Serveur de fichiers ChatHub actif', 
    port: PORT,
    uploadsDir: uploadsDir
  })
})

// Route pour télécharger un fichier
app.post('/upload', (req, res) => {
  console.log('=== DÉBUT UPLOAD ===')
  console.log('Headers:', req.headers)
  console.log('Body avant multer:', req.body)
  
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Erreur multer:', err)
      return res.status(400).json({ error: err.message })
    }
    
    console.log('Body après multer:', req.body)
    console.log('File après multer:', req.file)
    
    if (!req.file) {
      console.log('Aucun fichier fourni')
      return res.status(400).json({ error: 'Aucun fichier fourni' })
    }
    
    const roomId = req.body.roomId || 'general'
    
    const fileInfo = {
      id: path.basename(req.file.filename, path.extname(req.file.filename)),
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      url: `/files/${roomId}/${req.file.filename}`,
      uploadedBy: req.body.username || 'Anonyme',
      uploadedAt: new Date().toISOString(),
      fullPath: req.file.path
    }
    
    console.log('Fichier uploadé avec succès:', fileInfo)
    console.log('=== FIN UPLOAD ===')
    res.json(fileInfo)
  })
})

// Route pour servir les fichiers
app.use('/files', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    console.log(`Fichier demandé: ${path}`)
  }
}))

// Route pour lister les fichiers
app.get('/files/:roomId', (req, res) => {
  const roomId = req.params.roomId
  const dir = path.join(__dirname, 'uploads', roomId)
  
  console.log(`Liste des fichiers demandée pour la room: ${roomId}`)
  console.log(`Dossier: ${dir}`)
  
  if (!fs.existsSync(dir)) {
    console.log('Dossier inexistant, retour liste vide')
    return res.json([])
  }
  
  try {
    const files = fs.readdirSync(dir).map(filename => {
      const filePath = path.join(dir, filename)
      const stats = fs.statSync(filePath)
      
      const parts = filename.split('-')
      const originalName = parts.slice(2).join('-')
      
      return {
        id: parts[0] + '-' + parts[1],
        name: originalName,
        size: stats.size,
        type: path.extname(originalName).substring(1),
        url: `/files/${roomId}/${filename}`,
        uploadedAt: stats.birthtime.toISOString()
      }
    })
    
    console.log(`${files.length} fichiers trouvés`)
    res.json(files)
  } catch (error) {
    console.error('Erreur lors de la lecture du dossier:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.listen(PORT, () => {
  console.log(`Serveur de fichiers démarré sur http://localhost:${PORT}`)
  console.log(`Dossier uploads: ${uploadsDir}`)
})

// Gestion des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error)
  res.status(500).json({ error: 'Erreur interne du serveur' })
})