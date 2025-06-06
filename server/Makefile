CC=gcc
CFLAGS=-Wall -Wextra -std=c99
LIBS=-lws2_32
TARGET=server
SOURCE=server.c

all: $(TARGET)

$(TARGET): $(SOURCE)
	$(CC) $(CFLAGS) -o $(TARGET).exe $(SOURCE) $(LIBS)

clean:
	if exist $(TARGET).exe del $(TARGET).exe

run: $(TARGET)
	./$(TARGET).exe

.PHONY: all clean run
