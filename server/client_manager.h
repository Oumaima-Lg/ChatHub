#ifndef CLIENT_MANAGER_H
#define CLIENT_MANAGER_H

#include "server.h"

// Fonctions de gestion des clients
void add_client(Client client);
void remove_client(int id);
void broadcast_message(char *message, int sender_id);
void send_client_list(SOCKET client_socket);

#endif // CLIENT_MANAGER_H