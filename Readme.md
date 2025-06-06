# 🚀 ChatHub - Application de Chat en Temps Réel

ChatHub est une application de chat moderne et complète permettant la communication en temps réel avec support des salles publiques et privées. Le projet comprend un serveur C robuste et une interface web responsive.

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [Structure du Projet](#-structure-du-projet)
- [API et Protocoles](#-api-et-protocoles)
- [Développement](#-développement)
- [Dépannage](#-dépannage)
- [Contribution](#-contribution)
- [Licence](#-licence)


## ✨ Fonctionnalités

- ✅ Serveur robuste en C utilisant la programmation système
- ✅ Client web responsive avec interface moderne
- ✅ Connexion avec pseudonyme unique
- ✅ Liste des utilisateurs connectés en temps réel
- ✅ Échange de messages instantané
- ✅ Notifications de connexion/déconnexion
- ✅ Reconnexion automatique en cas de perte de connexion
- ✅ Indicateur de frappe (qui est en train d'écrire)
- ✅ Sons de notification pour les messages


### 🌟 Fonctionnalités Principales

- **Chat en temps réel** : Communication instantanée entre utilisateurs
- **Salles publiques** : Accès libre pour tous les utilisateurs
- **Salles privées** : Salles sécurisées par mot de passe
- **Interface moderne** : Design responsive et intuitive
- **Gestion des utilisateurs** : Liste des utilisateurs connectés en temps réel
- **Notifications sonores** : Sons personnalisables pour les messages
- **Reconnexion automatique** : Gestion intelligente des déconnexions

### 🔧 Fonctionnalités Techniques

- **Serveur C haute performance** : Gestion multi-thread des connexions
- **WebSocket** : Communication bidirectionnelle en temps réel
- **Sécurité** : Validation des entrées et gestion des erreurs
- **Scalabilité** : Support jusqu'à 100 clients simultanés
- **Cross-platform** : Compatible Windows, Linux, macOS


## 🏗️ Architecture

![alt text](<_- visual selection (7).png>)


┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Client Web    │ ◄──────────────► │   Serveur C     │
│   (JavaScript)  │                 │   (Multi-thread)│
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
    ┌─────────┐                         ┌─────────┐
    │ Browser │                         │ Sockets │
    │   UI    │                         │ Manager │
    └─────────┘                         └─────────┘


### Composants

1. **Serveur C** (`server.c`)
   - Gestion des connexions WebSocket
   - Routage des messages
   - Gestion des salles et utilisateurs
   - Thread pool pour les performances

2. **Client Web** (`script.js`)
   - Interface utilisateur interactive
   - Gestion des états de connexion
   - Communication WebSocket
   - Notifications et sons

3. **Interface** (`index.html` + `style.css`)
   - Design responsive moderne
   - Écrans de connexion et sélection de salle
   - Interface de chat intuitive



## 📋 Prérequis

### Système d'Exploitation
- **Windows** : Windows 10/11 (recommandé)
- **Linux** : Ubuntu 18.04+ ou équivalent
- **macOS** : macOS 10.14+

### Outils de Développement
- **Compilateur C** : GCC 7.0+ ou MSVC 2019+
- **Navigateur Web** : Chrome 80+, Firefox 75+, Safari 13+
- **Proxy WebSocket** : Node.js 14+ (pour le développement)

### Bibliothèques
- **Windows** : Winsock2 (inclus dans Windows SDK)
- **Linux/macOS** : pthread, socket (généralement inclus)

### Pour le serveur C
- Windows (testé sur Windows 11)
- MinGW-w64 (GCC pour Windows)
- Make (optionnel)

### Pour le proxy WebSocket
- Node.js (v14.0.0 ou supérieur)
- npm

### Pour le client web
- Navigateur web moderne (Chrome, Firefox, Edge, Safari)

## Installation

### 1. Cloner le dépôt
git clone https://github.com/Oumaima-Lg/ChatHub.git
cd chat-application


### Compiler le serveur C

cd server
gcc -Wall -Wextra -std=c99 -o server.exe server.c -lws2_32

ou 
gcc server.c -o server -lws2_32

Ou avec Make :
make


### 3. Installer les dépendances du proxy WebSocket

cd server
npm install


## Utilisation

### 1. Démarrer le serveur C

cd server
./server.exe


### 2. Démarrer le proxy WebSocket

Dans un autre terminal :

cd server
node websocket-proxy.js


### 3. Ouvrir le client web

Ouvrez le fichier `client/index.html` dans votre navigateur.

Ou utilisez un serveur web local :

cd client
python -m http.server 8000

ou
npx live-server


Puis accédez à `http://localhost:8000` dans votre navigateur.

### 4. Se connecter au chat

- Entrez votre pseudonyme
- Assurez-vous que l'adresse du serveur est correcte (par défaut: `localhost:3000`)
- Cliquez sur "Se connecter"


### Guide d'Utilisation de l'application

#### 1. Connexion
- Entrer un pseudonyme unique (max 20 caractères)
- Configurer l'adresse du serveur si nécessaire
- Activer/désactiver les notifications sonores
- Cliquer sur "Se connecter"

#### 2. Sélection de Salle
- **Salle publique** : Accès libre, visible par tous
- **Créer salle privée** : Définir nom et mot de passe
- **Rejoindre salle privée** : Entrer nom et mot de passe
- **Liste des salles** : Voir les salles disponibles

#### 3. Chat
- Taper des messages (max 500 caractères)
- Voir la liste des utilisateurs connectés
- Utiliser le bouton "Actualiser" pour mettre à jour
- Quitter la salle ou se déconnecter


## Structure du projet

chat-application/
├── server/
│   ├── server.c          # Serveur principal en C
│   ├── Makefile          # Configuration de compilation
│   ├── websocket-proxy.js # Proxy WebSocket pour le client web
│   └── package.json      # Dépendances Node.js
└── client/
    ├── index.html        # Interface utilisateur HTML
    ├── style.css         # Styles CSS
    ├── script.js         # Logique client JavaScript


## Fonctionnement technique

### Architecture

L'application utilise une architecture client-serveur avec trois composants principaux :

1. **Serveur C** : Gère les connexions TCP, les clients et la diffusion des messages
2. **Proxy WebSocket** : Convertit les connexions WebSocket du navigateur en connexions TCP pour le serveur C
3. **Client Web** : Interface utilisateur en HTML/CSS/JavaScript qui se connecte au proxy WebSocket



## 🔌 API et Protocoles

### Messages Client → Serveur

| Commande | Format | Description |
|----------|--------|-------------|
| Connexion | `username` | Connexion avec pseudonyme |
| Liste utilisateurs | `LIST` | Demander la liste des utilisateurs |
| Liste salles | `ROOMS` | Demander la liste des salles |
| Créer salle | `CREATE_ROOM:nom:password` | Créer une nouvelle salle |
| Rejoindre salle | `JOIN_ROOM:nom:password` | Rejoindre une salle |
| Quitter salle | `LEAVE_ROOM:nom` | Quitter une salle |
| Message salle | `ROOM_MSG:salle:message` | Envoyer un message |
| Utilisateurs salle | `ROOM_USERS:salle` | Liste des utilisateurs d'une salle |

### Messages Serveur → Client

| Type | Format | Description |
|------|--------|-------------|
| Liste clients | `CLIENTS:user1,user2,...` | Liste des utilisateurs |
| Liste salles | `ROOMS:room1,room2(private),...` | Liste des salles |
| Salle créée | `ROOM_CREATED:nom` | Confirmation de création |
| Salle rejointe | `ROOM_JOINED:nom` | Confirmation d'entrée |
| Salle quittée | `ROOM_LEFT:nom` | Confirmation de sortie |
| Message | `ROOM_MSG:salle:user:message` | Message reçu |
| Utilisateurs salle | `ROOM_USERS:salle:user1,user2` | Utilisateurs d'une salle |
| Système | `SYSTEM:message` | Message système |
| Erreur | `ERROR:message` | Message d'erreur |


## Dépannage

### Le serveur ne démarre pas

- Vérifiez que le port 8080 n'est pas déjà utilisé
- Assurez-vous que les bibliothèques Winsock sont disponibles


### Impossible de se connecter au serveur

- Vérifiez que le serveur C est en cours d'exécution
- Vérifiez que le proxy WebSocket est en cours d'exécution
- Assurez-vous que l'adresse du serveur est correcte


### Les messages ne s'affichent pas

- Vérifiez la console du navigateur pour les erreurs
- Assurez-vous que la connexion WebSocket est établie


## Améliorations possibles

- Chiffrement des communications
- Authentification des utilisateurs
- Partage de fichiers
- Historique des messages
- Interface administrateur
- Support des emojis et du formatage de texte
- Version mobile native


## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Auteur

OIO

---

**ChatHub** - Connecter les gens, une conversation à la fois. 💬✨
