#ifndef SERVER_H
#define SERVER_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <process.h>
#include <signal.h>
#include <windows.h>
#include <stdint.h>

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
extern Client clients[MAX_CLIENTS];
extern int client_count;
extern CRITICAL_SECTION clients_mutex;
extern int server_running;

extern Room rooms[MAX_ROOMS];
extern int room_count;
extern CRITICAL_SECTION rooms_mutex;

// Déclarations des fonctions principales
void cleanup_server();
BOOL WINAPI console_handler(DWORD signal);

#endif // SERVER_H