# Makefile pour le serveur de chat modulaire
CC = gcc
CFLAGS = -Wall -Wextra -std=c99
LIBS = -lws2_32
TARGET = server
SRCDIR = .
OBJDIR = obj

# Fichiers sources
SOURCES = server.c client_manager.c room_manager.c message_handler.c
OBJECTS = $(SOURCES:%.c=$(OBJDIR)/%.o)

# Règle principale
$(TARGET): $(OBJECTS)
	$(CC) $(OBJECTS) -o $(TARGET) $(LIBS)

# Règle pour créer les fichiers objets
$(OBJDIR)/%.o: $(SRCDIR)/%.c
	@mkdir -p $(OBJDIR)
	$(CC) $(CFLAGS) -c $< -o $@

# Règles de nettoyage
clean:
	rm -rf $(OBJDIR) $(TARGET).exe

rebuild: clean $(TARGET)

# Règle pour exécuter le serveur
run: $(TARGET)
	./$(TARGET)

.PHONY: clean rebuild run
</btml:Action>