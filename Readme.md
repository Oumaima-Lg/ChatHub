
# Application de Chat en Temps Réel

Une application de chat en temps réel avec un serveur en C et un client web. Ce projet permet à plusieurs utilisateurs de se connecter simultanément, d'échanger des messages et de voir la liste des utilisateurs connectés.

![Capture d'écran de l'application](screenshots/chat-screenshot.png)

## Fonctionnalités

- ✅ Serveur robuste en C utilisant la programmation système
- ✅ Client web responsive avec interface moderne
- ✅ Connexion avec pseudonyme unique
- ✅ Liste des utilisateurs connectés en temps réel
- ✅ Échange de messages instantané
- ✅ Notifications de connexion/déconnexion
- ✅ Reconnexion automatique en cas de perte de connexion
- ✅ Indicateur de frappe (qui est en train d'écrire)
- ✅ Sons de notification pour les messages

## Prérequis

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
git clone https://github.com/Oumaima_lg/chat-application.git
cd chat-application


### Compiler le serveur C

cd server
gcc -Wall -Wextra -std=c99 -o server.exe server.c -lws2_32

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


Puis accédez à `http://localhost:8000` dans votre navigateur.

### 4. Se connecter au chat

- Entrez votre pseudonyme
- Assurez-vous que l'adresse du serveur est correcte (par défaut: `localhost:3000`)
- Cliquez sur "Se connecter"


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


### Protocole de communication

Le serveur et les clients communiquent via un protocole texte simple :

- `CLIENTS:user1,user2,user3` - Liste des clients connectés
- `MESSAGE:username:contenu` - Message d'un utilisateur
- `SYSTEM:message` - Message système (connexion/déconnexion)
- `ERROR:message` - Message d'erreur
- `TYPING:username` - Indication qu'un utilisateur est en train d'écrire


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
- Salles de discussion multiples
- Messages privés
- Partage de fichiers
- Historique des messages
- Interface administrateur
- Support des emojis et du formatage de texte
- Version mobile native


## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Auteur

OIO
