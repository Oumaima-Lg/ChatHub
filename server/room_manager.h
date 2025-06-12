#ifndef ROOM_MANAGER_H
#define ROOM_MANAGER_H

#include "server.h"

// Fonctions de gestion des salles
void init_rooms();
int find_room_by_name(const char *room_name);
int create_room(const char *room_name, const char *password, int creator_id);
int join_room(int client_id, const char *room_name, const char *password);
void leave_room(int client_id, int room_index);
void broadcast_to_room(char *message, int sender_id, int room_index);
void send_room_list(SOCKET client_socket);
void send_room_users(SOCKET client_socket, int room_index);
void send_room_message(int sender_id, int room_index, const char *message);
void handle_leave_room(int client_id, const char *room_name);

#endif // ROOM_MANAGER_H