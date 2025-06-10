#include "message_handler.h"

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