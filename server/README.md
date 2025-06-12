# Serveur de Chat Modulaire

Ce projet divise le serveur de chat original en plusieurs modules pour améliorer l'organisation et la lisibilité du code.

## Structure du projet

```
server/
├── server.h              # Fichier d'en-tête principal avec les définitions communes
├── server.c              # Fichier principal avec main() et fonctions de base
├── client_manager.h      # En-tête pour la gestion des clients
├── client_manager.c      # Fonctions de gestion des clients
├── room_manager.h        # En-tête pour la gestion des salles
├── room_manager.c        # Fonctions de gestion des salles
├── message_handler.h     # En-tête pour la gestion des messages
├── message_handler.c     # Traitement des messages et thread client
├── Makefile             # Fichier de compilation
└── README.md            # Ce fichier
```

## Modules

### 1. server.h / server.c
- **Rôle** : Fichier principal contenant la fonction `main()` et les fonctions de base du serveur
- **Contient** :
  - Variables globales (clients, rooms, mutexes)
  - Fonction `main()` avec la boucle d'acceptation des connexions
  - Fonctions `cleanup_server()` et `console_handler()`
  - Initialisation du serveur et gestion des connexions

### 2. client_manager.h / client_manager.c
- **Rôle** : Gestion des clients connectés
- **Contient** :
  - `add_client()` : Ajouter un client à la liste
  - `remove_client()` : Supprimer un client de la liste
  - `broadcast_message()` : Diffuser un message à tous les clients
  - `send_client_list()` : Envoyer la liste des clients connectés

### 3. room_manager.h / room_manager.c
- **Rôle** : Gestion des salles de chat
- **Contient** :
  - `init_rooms()` : Initialiser les salles (créer la salle "general")
  - `find_room_by_name()` : Trouver une salle par son nom
  - `create_room()` : Créer une nouvelle salle
  - `join_room()` : Faire rejoindre un client à une salle
  - `leave_room()` : Faire quitter un client d'une salle
  - `broadcast_to_room()` : Diffuser un message dans une salle
  - `send_room_list()` : Envoyer la liste des salles
  - `send_room_users()` : Envoyer la liste des utilisateurs d'une salle
  - `send_room_message()` : Envoyer un message formaté dans une salle
  - `handle_leave_room()` : Gérer la sortie d'une salle

### 4. message_handler.h / message_handler.c
- **Rôle** : Traitement des messages et gestion des threads clients
- **Contient** :
  - `handle_client()` : Thread principal pour gérer chaque client
  - Traitement de tous les types de messages (LIST, ROOMS, CREATE_ROOM, JOIN_ROOM, etc.)
  - Logique de communication avec les clients

## Compilation

### Avec Makefile (recommandé)
```bash
# Compiler le projet
make

# Nettoyer les fichiers objets
make clean

# Recompiler complètement
make rebuild

# Compiler et exécuter
make run
```

### Compilation manuelle
```bash
# Créer le dossier obj
mkdir obj

# Compiler les fichiers objets
gcc -Wall -Wextra -std=c99 -c server.c -o obj/server.o
gcc -Wall -Wextra -std=c99 -c client_manager.c -o obj/client_manager.o
gcc -Wall -Wextra -std=c99 -c room_manager.c -o obj/room_manager.o
gcc -Wall -Wextra -std=c99 -c message_handler.c -o obj/message_handler.o

# Lier les fichiers objets
gcc obj/server.o obj/client_manager.o obj/room_manager.o obj/message_handler.o -o server -lws2_32
```

## Exécution

```bash
./server
```

Le serveur démarre sur le port 8080 par défaut.

## Avantages de cette structure modulaire

1. **Lisibilité** : Chaque module a une responsabilité claire
2. **Maintenabilité** : Plus facile de modifier ou déboguer une fonctionnalité spécifique
3. **Réutilisabilité** : Les modules peuvent être réutilisés dans d'autres projets
4. **Collaboration** : Plusieurs développeurs peuvent travailler sur différents modules
5. **Tests** : Plus facile de tester individuellement chaque module

## Notes importantes

- La logique originale est préservée à 100%
- Toutes les fonctionnalités restent identiques
- Les variables globales sont partagées entre les modules via `server.h`
- La synchronisation (mutexes) est maintenue correctement
- Le comportement du serveur reste exactement le même