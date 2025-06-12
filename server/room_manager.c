#include "room_manager.h"

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