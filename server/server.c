#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <process.h>
#include <signal.h>

#define PORT 8080
#define MAX_CLIENTS 100
#define BUFFER_SIZE 1024
#define NAME_SIZE 50
#define MAX_ROOMS 50
#define ROOM_NAME_SIZE 30
#define PASSWORD_SIZE 20

typedef struct
{
    SOCKET socket;
    char name[NAME_SIZE];
    int id;
} Client;

typedef struct
{
    char name[ROOM_NAME_SIZE];
    char password[PASSWORD_SIZE];
    int client_ids[MAX_CLIENTS];
    int client_count;
    int id;
    int is_private;
} Room;

// Variables globales
Client clients[MAX_CLIENTS];
int client_count = 0;
CRITICAL_SECTION clients_mutex;
int server_running = 1;

Room rooms[MAX_ROOMS];
int room_count = 0;
CRITICAL_SECTION rooms_mutex;

// DÉCLARATIONS DE TOUTES LES FONCTIONS
void cleanup_server();
BOOL WINAPI console_handler(DWORD signal);
void add_client(Client client);
void remove_client(int id);
void broadcast_message(char *message, int sender_id);
void send_client_list(SOCKET client_socket);

// Déclarations des fonctions pour les rooms
void init_rooms();
int find_room_by_name(const char *room_name);
int create_room(const char *room_name, const char *password, int creator_id);
int join_room(int client_id, const char *room_name, const char *password);
void leave_room(int client_id, int room_index);
void broadcast_to_room(char *message, int sender_id, int room_index);
void send_room_list(SOCKET client_socket);

// Nouvelles fonctions pour la gestion améliorée des salles
void send_room_users(SOCKET client_socket, int room_index);
void send_room_message(int sender_id, int room_index, const char *message);
void handle_leave_room(int client_id, const char *room_name);

// Thread pour gérer chaque client
unsigned __stdcall handle_client(void *arg);

// IMPLÉMENTATIONS DES FONCTIONS

void cleanup_server()
{
    server_running = 0;
    printf("\nArrêt du serveur...\n");

    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++)
    {
        closesocket(clients[i].socket);
    }
    client_count = 0;
    LeaveCriticalSection(&clients_mutex);

    DeleteCriticalSection(&rooms_mutex);
    DeleteCriticalSection(&clients_mutex);
    WSACleanup();
    exit(0);
}

BOOL WINAPI console_handler(DWORD signal)
{
    if (signal == CTRL_C_EVENT)
    {
        cleanup_server();
        return TRUE;
    }
    return FALSE;
}

void add_client(Client client)
{
    EnterCriticalSection(&clients_mutex);
    if (client_count < MAX_CLIENTS)
    {
        clients[client_count] = client;
        client_count++;
    }
    LeaveCriticalSection(&clients_mutex);
}

void remove_client(int id)
{
    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++)
    {
        if (clients[i].id == id)
        {
            for (int j = i; j < client_count - 1; j++)
            {
                clients[j] = clients[j + 1];
            }
            client_count--;
            break;
        }
    }
    LeaveCriticalSection(&clients_mutex);
}

void broadcast_message(char *message, int sender_id)
{
    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++)
    {
        if (clients[i].id != sender_id)
        {
            send(clients[i].socket, message, (int)strlen(message), 0);
        }
    }
    LeaveCriticalSection(&clients_mutex);
}

void send_client_list(SOCKET client_socket)
{
    char list[BUFFER_SIZE] = "CLIENTS:";

    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++)
    {
        strcat(list, clients[i].name);
        if (i < client_count - 1)
        {
            strcat(list, ",");
        }
    }
    LeaveCriticalSection(&clients_mutex);

    send(client_socket, list, (int)strlen(list), 0);
}

void init_rooms()
{
    InitializeCriticalSection(&rooms_mutex);

    EnterCriticalSection(&rooms_mutex);
    strcpy(rooms[0].name, "general");
    strcpy(rooms[0].password, "");
    rooms[0].client_count = 0;
    rooms[0].id = 0;
    rooms[0].is_private = 0;
    room_count = 1;
    LeaveCriticalSection(&rooms_mutex);
}

int find_room_by_name(const char *room_name)
{
    for (int i = 0; i < room_count; i++)
    {
        if (strcmp(rooms[i].name, room_name) == 0)
        {
            return i;
        }
    }
    return -1;
}

int create_room(const char *room_name, const char *password, int creator_id)
{
    EnterCriticalSection(&rooms_mutex);

    if (room_count >= MAX_ROOMS)
    {
        LeaveCriticalSection(&rooms_mutex);
        return -1;
    }

    if (find_room_by_name(room_name) != -1)
    {
        LeaveCriticalSection(&rooms_mutex);
        return -2;
    }

    int room_index = room_count;
    strcpy(rooms[room_index].name, room_name);
    strcpy(rooms[room_index].password, password);
    rooms[room_index].client_ids[0] = creator_id;
    rooms[room_index].client_count = 1;
    rooms[room_index].id = room_count;
    rooms[room_index].is_private = (strlen(password) > 0) ? 1 : 0;

    room_count++;
    LeaveCriticalSection(&rooms_mutex);

    return room_index;
}

int join_room(int client_id, const char *room_name, const char *password)
{
    EnterCriticalSection(&rooms_mutex);

    int room_index = find_room_by_name(room_name);
    if (room_index == -1)
    {
        LeaveCriticalSection(&rooms_mutex);
        return -1;
    }

    if (rooms[room_index].is_private && strcmp(rooms[room_index].password, password) != 0)
    {
        LeaveCriticalSection(&rooms_mutex);
        return -2;
    }

    // CORRECTION : Vérifier si le client est déjà dans cette salle
    for (int i = 0; i < rooms[room_index].client_count; i++)
    {
        if (rooms[room_index].client_ids[i] == client_id)
        {
            printf("DEBUG: Client %d déjà dans la room '%s'\n", client_id, room_name);
            LeaveCriticalSection(&rooms_mutex);
            return room_index; // Déjà dans la salle, retourner l'index
        }
    }

    // Ajouter le client à la salle seulement s'il n'y est pas déjà
    if (rooms[room_index].client_count < MAX_CLIENTS)
    {
        rooms[room_index].client_ids[rooms[room_index].client_count] = client_id;
        rooms[room_index].client_count++;
        printf("DEBUG: Client %d ajouté à la room '%s'. Total: %d utilisateurs\n", 
               client_id, room_name, rooms[room_index].client_count);
    }

    LeaveCriticalSection(&rooms_mutex);
    return room_index;
}

void leave_room(int client_id, int room_index)
{
    if (room_index < 0 || room_index >= room_count)
        return;

    EnterCriticalSection(&rooms_mutex);

    for (int i = 0; i < rooms[room_index].client_count; i++)
    {
        if (rooms[room_index].client_ids[i] == client_id)
        {
            for (int j = i; j < rooms[room_index].client_count - 1; j++)
            {
                rooms[room_index].client_ids[j] = rooms[room_index].client_ids[j + 1];
            }
            rooms[room_index].client_count--;
            printf("DEBUG: Client %d retiré de la room '%s'. Total: %d utilisateurs\n", 
                   client_id, rooms[room_index].name, rooms[room_index].client_count);
            break;
        }
    }

    LeaveCriticalSection(&rooms_mutex);
}

void broadcast_to_room(char *message, int sender_id, int room_index)
{
    if (room_index < 0 || room_index >= room_count)
        return;

    EnterCriticalSection(&rooms_mutex);
    EnterCriticalSection(&clients_mutex);

    printf("DEBUG: Diffusion dans room '%s' (index %d) à %d utilisateurs\n", 
           rooms[room_index].name, room_index, rooms[room_index].client_count);

    for (int i = 0; i < rooms[room_index].client_count; i++)
    {
        int client_id = rooms[room_index].client_ids[i];
        if (client_id != sender_id)
        {
            for (int j = 0; j < client_count; j++)
            {
                if (clients[j].id == client_id)
                {
                    send(clients[j].socket, message, (int)strlen(message), 0);
                    printf("DEBUG: Message envoyé à %s (ID: %d)\n", clients[j].name, client_id);
                    break;
                }
            }
        }
    }

    LeaveCriticalSection(&clients_mutex);
    LeaveCriticalSection(&rooms_mutex);
}

void send_room_list(SOCKET client_socket)
{
    char list[BUFFER_SIZE] = "ROOMS:";

    EnterCriticalSection(&rooms_mutex);
    for (int i = 0; i < room_count; i++)
    {
        strcat(list, rooms[i].name);
        if (rooms[i].is_private)
        {
            strcat(list, "(private)");
        }
        if (i < room_count - 1)
        {
            strcat(list, ",");
        }
    }
    LeaveCriticalSection(&rooms_mutex);

    send(client_socket, list, (int)strlen(list), 0);
}

void send_room_users(SOCKET client_socket, int room_index)
{
    if (room_index < 0 || room_index >= room_count)
        return;

    char list[BUFFER_SIZE] = "";
    snprintf(list, sizeof(list), "ROOM_USERS:%s:", rooms[room_index].name);

    EnterCriticalSection(&rooms_mutex);
    EnterCriticalSection(&clients_mutex);

    printf("DEBUG: Envoi liste utilisateurs pour room '%s' (index %d)\n", 
           rooms[room_index].name, room_index);

    int count = 0;
    for (int i = 0; i < rooms[room_index].client_count; i++)
    {
        int client_id = rooms[room_index].client_ids[i];
        for (int j = 0; j < client_count; j++)
        {
            if (clients[j].id == client_id)
            {
                if (count > 0)
                {
                    strcat(list, ",");
                }
                strcat(list, clients[j].name);
                printf("DEBUG: Utilisateur ajouté à la liste: %s\n", clients[j].name);
                count++;
                break;
            }
        }
    }

    printf("DEBUG: Liste finale envoyée: %s\n", list);

    LeaveCriticalSection(&clients_mutex);
    LeaveCriticalSection(&rooms_mutex);

    send(client_socket, list, (int)strlen(list), 0);
}

void send_room_message(int sender_id, int room_index, const char *message)
{
    if (room_index < 0 || room_index >= room_count)
        return;

    EnterCriticalSection(&rooms_mutex);
    EnterCriticalSection(&clients_mutex);

    // Trouver le nom de l'expéditeur
    char sender_name[NAME_SIZE] = "";
    for (int i = 0; i < client_count; i++)
    {
        if (clients[i].id == sender_id)
        {
            strncpy(sender_name, clients[i].name, NAME_SIZE - 1);
            sender_name[NAME_SIZE - 1] = '\0';
            break;
        }
    }

    // Préparer le message avec le préfixe de la salle
    char formatted_message[BUFFER_SIZE + NAME_SIZE + ROOM_NAME_SIZE + 20];
    snprintf(formatted_message, sizeof(formatted_message), "ROOM_MSG:%s:%s:%s",
             rooms[room_index].name, sender_name, message);

    printf("DEBUG: Message formaté pour room '%s': %s\n", rooms[room_index].name, formatted_message);

    // Envoyer à tous les clients dans la salle
    for (int i = 0; i < rooms[room_index].client_count; i++)
    {
        int client_id = rooms[room_index].client_ids[i];
        if (client_id != sender_id)
        {
            for (int j = 0; j < client_count; j++)
            {
                if (clients[j].id == client_id)
                {
                    send(clients[j].socket, formatted_message, (int)strlen(formatted_message), 0);
                    printf("DEBUG: Message ROOM_MSG envoyé à %s\n", clients[j].name);
                    break;
                }
            }
        }
    }

    LeaveCriticalSection(&clients_mutex);
    LeaveCriticalSection(&rooms_mutex);
}

void handle_leave_room(int client_id, const char *room_name)
{
    int room_index = find_room_by_name(room_name);
    if (room_index < 0)
        return;

    leave_room(client_id, room_index);

    // Trouver le socket du client
    SOCKET client_socket = INVALID_SOCKET;
    EnterCriticalSection(&clients_mutex);
    for (int i = 0; i < client_count; i++)
    {
        if (clients[i].id == client_id)
        {
            client_socket = clients[i].socket;
            break;
        }
    }
    LeaveCriticalSection(&clients_mutex);

    if (client_socket != INVALID_SOCKET)
    {
        char response[BUFFER_SIZE];
        snprintf(response, sizeof(response), "ROOM_LEFT:%s", room_name);
        send(client_socket, response, (int)strlen(response), 0);

        // Notifier les autres utilisateurs de la salle
        char system_msg[BUFFER_SIZE];

        EnterCriticalSection(&clients_mutex);
        char username[NAME_SIZE] = "";
        for (int i = 0; i < client_count; i++)
        {
            if (clients[i].id == client_id)
            {
                strncpy(username, clients[i].name, NAME_SIZE - 1);
                username[NAME_SIZE - 1] = '\0';
                break;
            }
        }
        LeaveCriticalSection(&clients_mutex);

        snprintf(system_msg, sizeof(system_msg), "SYSTEM:%s a quitté la salle", username);
        broadcast_to_room(system_msg, client_id, room_index);
    }
}

// Thread pour gérer chaque client
unsigned __stdcall handle_client(void *arg)
{
    Client *client = (Client *)arg;
    char buffer[BUFFER_SIZE];
    char message[BUFFER_SIZE + NAME_SIZE + 10];
    int current_room = 0; // Room générale par défaut

    printf("Client %s connecté (ID: %d)\n", client->name, client->id);

    // Ajouter le client à la room générale
    join_room(client->id, "general", "");

    // Notifier les autres clients de la nouvelle connexion
    snprintf(message, sizeof(message), "SYSTEM:%s a rejoint le chat", client->name);
    broadcast_message(message, client->id);

    // Envoyer la liste des clients au nouveau client
    send_client_list(client->socket);

    while (server_running)
    {
        int bytes_received = recv(client->socket, buffer, BUFFER_SIZE - 1, 0);

        if (bytes_received <= 0)
        {
            break;
        }

        buffer[bytes_received] = '\0';
        printf("DEBUG: Message reçu de %s: %s\n", client->name, buffer);

        // Traiter les différents types de messages
        if (strncmp(buffer, "LIST", 4) == 0)
        {
            send_client_list(client->socket);
        }
        else if (strncmp(buffer, "ROOMS", 5) == 0)
        {
            send_room_list(client->socket);
        }
        else if (strncmp(buffer, "CREATE_ROOM:", 12) == 0)
        {
            char *room_data = buffer + 12;
            char *room_name = strtok(room_data, ":");
            char *password = strtok(NULL, ":");

            if (room_name)
            {
                if (!password)
                    password = "";

                int result = create_room(room_name, password, client->id);
                char response[BUFFER_SIZE];

                if (result >= 0)
                {
                    leave_room(client->id, current_room); // Quitter l'ancienne room
                    current_room = result;
                    snprintf(response, sizeof(response), "ROOM_CREATED:%s", room_name);
                    send(client->socket, response, (int)strlen(response), 0);

                    snprintf(message, sizeof(message), "SYSTEM:%s a créé la room '%s'", client->name, room_name);
                    broadcast_to_room(message, client->id, current_room);
                }
                else if (result == -1)
                {
                    snprintf(response, sizeof(response), "ERROR:Nombre maximum de rooms atteint");
                    send(client->socket, response, (int)strlen(response), 0);
                }
                else if (result == -2)
                {
                    snprintf(response, sizeof(response), "ERROR:Room déjà existante");
                    send(client->socket, response, (int)strlen(response), 0);
                }
            }
        }
        else if (strncmp(buffer, "JOIN_ROOM:", 10) == 0)
        {
            char *room_data = buffer + 10;
            char *room_name = strtok(room_data, ":");
            char *password = strtok(NULL, ":");

            if (room_name)
            {
                if (!password)
                    password = "";

                printf("DEBUG: Tentative de rejoindre room '%s' par %s\n", room_name, client->name);

                int result = join_room(client->id, room_name, password);
                char response[BUFFER_SIZE];

                if (result >= 0)
                {
                    // CORRECTION PRINCIPALE : Ne quitter l'ancienne room que si c'est une room différente
                    if (current_room != result)
                    {
                        printf("DEBUG: Changement de room %d vers %d\n", current_room, result);
                        leave_room(client->id, current_room); // Quitter l'ancienne room
                        current_room = result;
                    }
                    else
                    {
                        printf("DEBUG: Déjà dans la room %d, pas de changement\n", current_room);
                    }

                    snprintf(response, sizeof(response), "ROOM_JOINED:%s", room_name);
                    send(client->socket, response, (int)strlen(response), 0);
                    printf("DEBUG: ROOM_JOINED envoyé à %s pour room '%s'\n", client->name, room_name);

                    snprintf(message, sizeof(message), "SYSTEM:%s a rejoint la room", client->name);
                    broadcast_to_room(message, client->id, current_room);
                }
                else if (result == -1)
                {
                    snprintf(response, sizeof(response), "ERROR:Room inexistante");
                    send(client->socket, response, (int)strlen(response), 0);
                }
                else if (result == -2)
                {
                    snprintf(response, sizeof(response), "ERROR:Mot de passe incorrect");
                    send(client->socket, response, (int)strlen(response), 0);
                }
            }
        }
        else if (strncmp(buffer, "ROOM_USERS:", 11) == 0)
        {
            char *room_name = buffer + 11;
            printf("DEBUG: Demande liste utilisateurs pour room '%s' par %s\n", room_name, client->name);
            int room_index = find_room_by_name(room_name);
            if (room_index >= 0)
            {
                send_room_users(client->socket, room_index);
            }
            else
            {
                printf("DEBUG: Room '%s' non trouvée\n", room_name);
            }
        }
        else if (strncmp(buffer, "LEAVE_ROOM:", 11) == 0)
        {
            char *room_name = buffer + 11;
            handle_leave_room(client->id, room_name);
            current_room = 0; // Retourner à la room générale
        }
        else if (strncmp(buffer, "ROOM_MSG:", 9) == 0)
        {
            char *room_data = buffer + 9;
            char *room_name = strtok(room_data, ":");
            char *message_content = strtok(NULL, "");

            if (room_name && message_content)
            {
                printf("DEBUG: Message ROOM_MSG de %s pour room '%s': %s\n", 
                       client->name, room_name, message_content);
                int room_index = find_room_by_name(room_name);
                if (room_index >= 0)
                {
                    send_room_message(client->id, room_index, message_content);
                    printf("[%s] dans room %s: %s\n", client->name, room_name, message_content);
                }
                else
                {
                    printf("DEBUG: Room '%s' non trouvée pour le message\n", room_name);
                }
            }
        }
        else
        {
            // Message normal - diffuser dans la room actuelle
            printf("DEBUG: Message normal de %s dans room actuelle (index %d)\n", client->name, current_room);
            snprintf(message, sizeof(message), "MESSAGE:%s:%s", client->name, buffer);
            broadcast_to_room(message, client->id, current_room);
            printf("[%s] dans room %s: %s\n", client->name, rooms[current_room].name, buffer);
        }
    }

    // Client déconnecté
    printf("Client %s déconnecté\n", client->name);
    snprintf(message, sizeof(message), "SYSTEM:%s a quitté le chat", client->name);
    broadcast_message(message, client->id);

    leave_room(client->id, current_room);
    remove_client(client->id);
    closesocket(client->socket);
    free(client);

    return 0;
}

int main()
{
    WSADATA wsa;
    SOCKET server_socket, client_socket;
    struct sockaddr_in server_addr, client_addr;
    int client_addr_len = sizeof(client_addr);
    int client_id = 0;

    printf("=== SERVEUR DE CHAT AVEC DEBUG ===\n");
    printf("Démarrage du serveur sur le port %d...\n", PORT);

    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0)
    {
        printf("Erreur WSAStartup: %d\n", WSAGetLastError());
        return 1;
    }

    InitializeCriticalSection(&clients_mutex);
    init_rooms();

    SetConsoleCtrlHandler(console_handler, TRUE);

    server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket == INVALID_SOCKET)
    {
        printf("Erreur création socket: %d\n", WSAGetLastError());
        WSACleanup();
        return 1;
    }

    int opt = 1;
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, (char *)&opt, sizeof(opt));

    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    if (bind(server_socket, (struct sockaddr *)&server_addr, sizeof(server_addr)) == SOCKET_ERROR)
    {
        printf("Erreur bind: %d\n", WSAGetLastError());
        printf("Le port %d est peut-être déjà utilisé.\n", PORT);
        closesocket(server_socket);
        WSACleanup();
        return 1;
    }

    if (listen(server_socket, MAX_CLIENTS) == SOCKET_ERROR)
    {
        printf("Erreur listen: %d\n", WSAGetLastError());
        closesocket(server_socket);
        WSACleanup();
        return 1;
    }

    printf("Serveur en écoute sur 0.0.0.0:%d\n", PORT);
    printf("Appuyez sur Ctrl+C pour arrêter le serveur\n\n");

    while (server_running)
    {
        client_socket = accept(server_socket, (struct sockaddr *)&client_addr, &client_addr_len);

        if (client_socket == INVALID_SOCKET)
        {
            if (server_running)
            {
                printf("Erreur accept: %d\n", WSAGetLastError());
            }
            continue;
        }

        if (client_count >= MAX_CLIENTS)
        {
            printf("Nombre maximum de clients atteint. Connexion refusée.\n");
            closesocket(client_socket);
            continue;
        }

        char name_buffer[NAME_SIZE];
        int name_len = recv(client_socket, name_buffer, NAME_SIZE - 1, 0);
        if (name_len <= 0)
        {
            printf("Erreur réception pseudonyme\n");
            closesocket(client_socket);
            continue;
        }
        name_buffer[name_len] = '\0';

        int name_exists = 0;
        EnterCriticalSection(&clients_mutex);
        for (int i = 0; i < client_count; i++)
        {
            if (strcmp(clients[i].name, name_buffer) == 0)
            {
                name_exists = 1;
                break;
            }
        }
        LeaveCriticalSection(&clients_mutex);

        if (name_exists)
        {
            printf("Pseudonyme '%s' déjà utilisé. Connexion refusée.\n", name_buffer);
            char error_msg[] = "ERROR:Pseudonyme déjà utilisé";
            send(client_socket, error_msg, (int)strlen(error_msg), 0);
            closesocket(client_socket);
            continue;
        }

        Client *new_client = malloc(sizeof(Client));
        if (new_client == NULL)
        {
            printf("Erreur allocation mémoire\n");
            closesocket(client_socket);
            continue;
        }

        new_client->socket = client_socket;
        strncpy(new_client->name, name_buffer, NAME_SIZE - 1);
        new_client->name[NAME_SIZE - 1] = '\0';
        new_client->id = client_id++;

        add_client(*new_client);

        uintptr_t thread_handle = _beginthreadex(NULL, 0, handle_client, new_client, 0, NULL);
        if (thread_handle == 0)
        {
            printf("Erreur création thread\n");
            remove_client(new_client->id);
            closesocket(client_socket);
            free(new_client);
        }
        else
        {
            CloseHandle((HANDLE)thread_handle);
        }
    }

    cleanup_server();
    return 0;
}
