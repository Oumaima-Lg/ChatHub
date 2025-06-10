#include "server.h"
#include "client_manager.h"
#include "room_manager.h"
#include "message_handler.h"

// Variables globales
Client clients[MAX_CLIENTS];
int client_count = 0;
CRITICAL_SECTION clients_mutex;
int server_running = 1;

Room rooms[MAX_ROOMS];
int room_count = 0;
CRITICAL_SECTION rooms_mutex;

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