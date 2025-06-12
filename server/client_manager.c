#include "client_manager.h"

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