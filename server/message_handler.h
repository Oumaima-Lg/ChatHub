#ifndef MESSAGE_HANDLER_H
#define MESSAGE_HANDLER_H

#include "server.h"
#include "client_manager.h"
#include "room_manager.h"

// Fonction de gestion des messages des clients
unsigned __stdcall handle_client(void *arg);

#endif // MESSAGE_HANDLER_H