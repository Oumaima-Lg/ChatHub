#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <sys/types.h>
#include <netinet/in.h>
#include <errno.h>

int construirePointCommunication(int port, char* ip, int n);
int accepterConnexion(int sd);
void chater(int pcc);
