#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <process.h>
#include <signal.h>

// Suppression du pragma comment - on utilise -lws2_32 à la compilation

#define PORT 8080
#define MAX_CLIENTS 100
#define BUFFER_SIZE 1024
#define NAME_SIZE 50

typedef struct {
    SOCKET socket;
    char name[NAME_SIZE];
    int id;
} Client;

Client clients[MAX_CLIENTS];
int client_count = 0;
CRITICAL_SECTION clients_mutex;
int server_running = 1;

// Fonction pour nettoyer et fermer le serveur
void cleanup_server() {
    server_running = 0;
    printf("\nArrêt du serveur...\n");
    
    // Fermer toutes les connexions clients
    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++) {
        closesocket(clients[i].socket);
    }
    client_count = 0;
    LeaveCriticalSection(&clients_mutex);
    
    DeleteCriticalSection(&clients_mutex);
    WSACleanup();
    exit(0);
}

// Gestionnaire de signal pour Ctrl+C
BOOL WINAPI console_handler(DWORD signal) {
    if (signal == CTRL_C_EVENT) {
        cleanup_server();
        return TRUE;
    }
    return FALSE;
}

// Ajouter un client à la liste
void add_client(Client client) {
    EnterCriticalSection(&clients_mutex);
    if (client_count < MAX_CLIENTS) {
        clients[client_count] = client;
        client_count++;
    }
    LeaveCriticalSection(&clients_mutex);
}

// Supprimer un client de la liste
void remove_client(int id) {
    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++) {
        if (clients[i].id == id) {
            for (int j = i; j < client_count - 1; j++) {
                clients[j] = clients[j + 1];
            }
            client_count--;
            break;
        }
    }
    LeaveCriticalSection(&clients_mutex);
}

// Diffuser un message à tous les clients
void broadcast_message(char* message, int sender_id) {
    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++) {
        if (clients[i].id != sender_id) {
            send(clients[i].socket, message, (int)strlen(message), 0);
        }
    }
    LeaveCriticalSection(&clients_mutex);
}

// Envoyer la liste des clients connectés
void send_client_list(SOCKET client_socket) {
    char list[BUFFER_SIZE] = "CLIENTS:";
    
    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++) {
        strcat(list, clients[i].name);
        if (i < client_count - 1) {
            strcat(list, ",");
        }
    }
    LeaveCriticalSection(&clients_mutex);
    
    send(client_socket, list, (int)strlen(list), 0);
}

// Thread pour gérer chaque client
unsigned __stdcall handle_client(void* arg) {
    Client* client = (Client*)arg;
    char buffer[BUFFER_SIZE];
    char message[BUFFER_SIZE + NAME_SIZE + 10];
    
    printf("Client %s connecté (ID: %d)\n", client->name, client->id);
    
    // Notifier les autres clients de la nouvelle connexion
    snprintf(message, sizeof(message), "SYSTEM:%s a rejoint le chat", client->name);
    broadcast_message(message, client->id);
    
    // Envoyer la liste des clients au nouveau client
    send_client_list(client->socket);
    
    while (server_running) {
        int bytes_received = recv(client->socket, buffer, BUFFER_SIZE - 1, 0);
        
        if (bytes_received <= 0) {
            break;
        }
        
        buffer[bytes_received] = '\0';
        
        // Traiter les différents types de messages
        if (strncmp(buffer, "LIST", 4) == 0) {
            send_client_list(client->socket);
        } else {
            // Message normal - diffuser à tous
            snprintf(message, sizeof(message), "MESSAGE:%s:%s", client->name, buffer);
            broadcast_message(message, client->id);
            printf("[%s]: %s\n", client->name, buffer);
        }
    }
    
    // Client déconnecté
    printf("Client %s déconnecté\n", client->name);
    snprintf(message, sizeof(message), "SYSTEM:%s a quitté le chat", client->name);
    broadcast_message(message, client->id);
    
    remove_client(client->id);
    closesocket(client->socket);
    free(client);
    
    return 0;
}

int main() {
    WSADATA wsa;
    SOCKET server_socket, client_socket;
    struct sockaddr_in server_addr, client_addr;
    int client_addr_len = sizeof(client_addr);
    int client_id = 0;
    
    printf("=== SERVEUR DE CHAT ===\n");
    printf("Démarrage du serveur sur le port %d...\n", PORT);
    
    // Initialiser Winsock
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        printf("Erreur WSAStartup: %d\n", WSAGetLastError());
        return 1;
    }
    
    // Initialiser le mutex
    InitializeCriticalSection(&clients_mutex);
    
    // Configurer le gestionnaire de signal
    SetConsoleCtrlHandler(console_handler, TRUE);
    
    // Créer le socket serveur
    server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket == INVALID_SOCKET) {
        printf("Erreur création socket: %d\n", WSAGetLastError());
        WSACleanup();
        return 1;
    }
    
    // Permettre la réutilisation de l'adresse
    int opt = 1;
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));
    
    // Configurer l'adresse du serveur
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);
    
    // Lier le socket
    if (bind(server_socket, (struct sockaddr*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        printf("Erreur bind: %d\n", WSAGetLastError());
        printf("Le port %d est peut-être déjà utilisé.\n", PORT);
        closesocket(server_socket);
        WSACleanup();
        return 1;
    }
    
    // Écouter les connexions
    if (listen(server_socket, MAX_CLIENTS) == SOCKET_ERROR) {
        printf("Erreur listen: %d\n", WSAGetLastError());
        closesocket(server_socket);
        WSACleanup();
        return 1;
    }
    
    printf("Serveur en écoute sur 0.0.0.0:%d\n", PORT);
    printf("Appuyez sur Ctrl+C pour arrêter le serveur\n\n");
    
    // Boucle principale du serveur
    while (server_running) {
        client_socket = accept(server_socket, (struct sockaddr*)&client_addr, &client_addr_len);
        
        if (client_socket == INVALID_SOCKET) {
            if (server_running) {
                printf("Erreur accept: %d\n", WSAGetLastError());
            }
            continue;
        }
        
        // Vérifier si on a atteint le maximum de clients
        if (client_count >= MAX_CLIENTS) {
            printf("Nombre maximum de clients atteint. Connexion refusée.\n");
            closesocket(client_socket);
            continue;
        }
        
        // Recevoir le pseudonyme du client
        char name_buffer[NAME_SIZE];
        int name_len = recv(client_socket, name_buffer, NAME_SIZE - 1, 0);
        if (name_len <= 0) {
            printf("Erreur réception pseudonyme\n");
            closesocket(client_socket);
            continue;
        }
        name_buffer[name_len] = '\0';
        
        // Vérifier que le pseudonyme n'est pas déjà utilisé
        int name_exists = 0;
        EnterCriticalSection(&clients_mutex);
        for (int i = 0; i < client_count; i++) {
            if (strcmp(clients[i].name, name_buffer) == 0) {
                name_exists = 1;
                break;
            }
        }
        LeaveCriticalSection(&clients_mutex);
        
        if (name_exists) {
            printf("Pseudonyme '%s' déjà utilisé. Connexion refusée.\n", name_buffer);
            char error_msg[] = "ERROR:Pseudonyme déjà utilisé";
            send(client_socket, error_msg, (int)strlen(error_msg), 0);
            closesocket(client_socket);
            continue;
        }
        
        // Créer une nouvelle structure client
        Client* new_client = malloc(sizeof(Client));
        if (new_client == NULL) {
            printf("Erreur allocation mémoire\n");
            closesocket(client_socket);
            continue;
        }
        
        new_client->socket = client_socket;
        strncpy(new_client->name, name_buffer, NAME_SIZE - 1);
        new_client->name[NAME_SIZE - 1] = '\0';
        new_client->id = client_id++;
        
        // Ajouter le client à la liste
        add_client(*new_client);
        
        // Créer un thread pour gérer ce client
        uintptr_t thread_handle = _beginthreadex(NULL, 0, handle_client, new_client, 0, NULL);
        if (thread_handle == 0) {
            printf("Erreur création thread\n");
            remove_client(new_client->id);
            closesocket(client_socket);
            free(new_client);
        } else {
            CloseHandle((HANDLE)thread_handle);
        }
    }
    
    cleanup_server();
    return 0;
}
