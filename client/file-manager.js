class FileManager {
    constructor(chatClient) {
        this.chatClient = chatClient;
        this.files = {}; // Stockage des fichiers par salle
        this.maxFileSize = 50 * 1024 * 1024; // 50 MB
        this.uploadInProgress = false;
        this.fileServerUrl = 'http://localhost:3001'; // URL du serveur de fichiers

        this.initElements();
        this.attachEventListeners();

        // Test de connexion au serveur de fichiers
        this.testFileServer();
    }

    testFileServer() {
        console.log('Test de connexion au serveur de fichiers...');
        fetch(this.fileServerUrl)
            .then(response => response.json())
            .then(data => {
                console.log('✅ Serveur de fichiers connecté:', data);
            })
            .catch(error => {
                console.error('❌ Erreur de connexion au serveur de fichiers:', error);
                alert('Le serveur de fichiers n\'est pas accessible. Assurez-vous qu\'il est démarré sur le port 3001.');
            });
    }


    initElements() {
        this.fileInput = document.getElementById('fileInput');
        this.attachBtn = document.getElementById('attachBtn');
        this.toggleFilesBtn = document.getElementById('toggleFilesBtn');
        this.filesContainer = document.getElementById('filesContainer');
        this.filesList = document.getElementById('filesList');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.progressBar = document.getElementById('progressBar');
    }

    attachEventListeners() {
        // Bouton d'attachement dans la zone de message
        if (this.attachBtn) {
            this.attachBtn.addEventListener('click', () => {
                this.fileInput.click();
            });
        }

        // Input de fichier
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
        }

        // Bouton pour afficher/masquer le panneau de fichiers
        if (this.toggleFilesBtn) {
            this.toggleFilesBtn.addEventListener('click', () => {
                this.toggleFilesPanel();
            });
        }
    }

    toggleFilesPanel() {
        this.filesContainer.classList.toggle('hidden');
        this.toggleFilesBtn.innerHTML = this.filesContainer.classList.contains('hidden') ? '<i>🔽</i>' : '<i>🔼</i>';
    }

    handleFileUpload(file) {
        if (this.uploadInProgress) {
            alert('Un téléchargement est déjà en cours. Veuillez patienter.');
            return;
        }

        if (file.size > this.maxFileSize) {
            alert(`Le fichier est trop volumineux. La taille maximale est de ${this.maxFileSize / (1024 * 1024)} MB.`);
            this.fileInput.value = '';
            return;
        }

        // Vérifier si l'utilisateur est connecté et dans une salle
        if (!this.chatClient.isConnected || !this.chatClient.currentRoom) {
            alert('Vous devez être connecté et dans une salle pour partager des fichiers.');
            return;
        }

        this.uploadInProgress = true;
        this.uploadProgress.style.display = 'block';
        this.progressBar.style.width = '0%';

        // Télécharger le fichier vers le serveur de fichiers
        this.uploadFileToServer(file);
    }

    uploadFileToServer(file) {
        console.log('🚀 Début upload vers le serveur de fichiers...');
        console.log('Fichier:', file.name, 'Taille:', file.size, 'Type:', file.type);
        console.log('Room:', this.chatClient.currentRoom, 'User:', this.chatClient.username);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('roomId', this.chatClient.currentRoom);
        formData.append('username', this.chatClient.username);

        // Log du FormData
        for (let pair of formData.entries()) {
            console.log('FormData:', pair[0], pair[1]);
        }

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                this.progressBar.style.width = percentComplete + '%';
                console.log(`📊 Progression: ${percentComplete.toFixed(2)}%`);
            }
        });

        xhr.addEventListener('load', () => {
            console.log('📥 Réponse du serveur:', xhr.status, xhr.responseText);

            if (xhr.status === 200) {
                try {
                    const fileInfo = JSON.parse(xhr.responseText);
                    console.log('✅ Fichier uploadé avec succès:', fileInfo);

                    fileInfo.fullUrl = `${this.fileServerUrl}${fileInfo.url}`;

                    this.addFileToRoom(fileInfo, this.chatClient.currentRoom);
                    this.sendFileNotification(fileInfo);

                    this.chatClient.addMessage('own', this.chatClient.username, `a partagé un fichier: ${fileInfo.name}`, {
                        id: fileInfo.id,
                        name: fileInfo.name,
                        type: fileInfo.type,
                        size: fileInfo.size,
                        data: fileInfo.fullUrl
                    });

                    this.chatClient.playSound('send');
                } catch (error) {
                    console.error('❌ Erreur lors du parsing de la réponse:', error);
                    alert('Erreur lors du traitement de la réponse du serveur.');
                }
            } else {
                console.error('❌ Erreur HTTP:', xhr.status, xhr.responseText);
                alert(`Erreur lors du téléchargement du fichier: ${xhr.status}`);
            }

            setTimeout(() => {
                this.uploadProgress.style.display = 'none';
                this.progressBar.style.width = '0%';
                this.uploadInProgress = false;
                this.fileInput.value = '';
            }, 500);
        });

        xhr.addEventListener('error', (error) => {
            console.error('❌ Erreur XHR:', error);
            alert('Erreur lors du téléchargement du fichier.');
            this.uploadProgress.style.display = 'none';
            this.uploadInProgress = false;
            this.fileInput.value = '';
        });

        console.log(`🌐 Envoi vers: ${this.fileServerUrl}/upload`);
        xhr.open('POST', `${this.fileServerUrl}/upload`, true);
        xhr.send(formData);
    }


    sendFileNotification(fileInfo) {
        // Créer un message de notification pour les autres utilisateurs
        const notification = {
            type: 'file_notification',
            fileId: fileInfo.id,
            fileName: fileInfo.name,
            fileSize: fileInfo.size,
            fileType: fileInfo.type,
            fileUrl: fileInfo.url,
            fullUrl: fileInfo.fullUrl
        };

        // Envoyer la notification via WebSocket
        if (this.chatClient.socket && this.chatClient.socket.readyState === WebSocket.OPEN) {
            const message = `FILE_NOTIFICATION:${this.chatClient.currentRoom}:${JSON.stringify(notification)}`;
            this.chatClient.socket.send(message);
        }
    }

    receiveFileNotification(sender, notification) {
        // Créer un objet de fichier à partir de la notification
        const fileData = {
            id: notification.fileId,
            name: notification.fileName,
            type: notification.fileType,
            size: notification.fileSize,
            data: `${this.fileServerUrl}${notification.fileUrl}`,
            sender: sender,
            timestamp: Date.now()
        };

        // Ajouter le fichier à la liste locale
        this.addFileToRoom(fileData, this.chatClient.currentRoom);

        // Afficher le message de fichier reçu
        this.chatClient.addMessage('other', sender, `a partagé un fichier: ${fileData.name}`, fileData);
        this.chatClient.playSound('receive');
    }

    addFileToRoom(fileData, roomName) {
        // Initialiser le tableau de fichiers pour la salle si nécessaire
        if (!this.files[roomName]) {
            this.files[roomName] = [];
        }

        // Ajouter le fichier à la salle
        this.files[roomName].push(fileData);

        // Mettre à jour l'affichage des fichiers
        this.updateFilesList(roomName);
    }

    updateFilesList(roomName) {
        // Vérifier si nous sommes dans la bonne salle
        if (roomName !== this.chatClient.currentRoom) {
            return;
        }

        // Récupérer les fichiers de la salle actuelle
        const roomFiles = this.files[roomName] || [];

        // Mettre à jour l'affichage
        if (roomFiles.length === 0) {
            this.filesList.innerHTML = '<div class="no-files">Aucun fichier partagé dans cette salle</div>';
            return;
        }

        // Trier les fichiers par date (plus récent en premier)
        roomFiles.sort((a, b) => b.timestamp - a.timestamp);

        // Générer le HTML pour chaque fichier
        let html = '';
        roomFiles.forEach(file => {
            html += this.createFileItemHTML(file);
        });

        this.filesList.innerHTML = html;
    }

    createFileItemHTML(file) {
        const fileSize = this.formatFileSize(file.size);
        const fileDate = new Date(file.timestamp).toLocaleString();
        const fileIcon = this.getFileIcon(file.type);

        return `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-info">
                    <div class="file-icon">${fileIcon}</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">
                            <span class="file-size">${fileSize}</span>
                            <span class="file-sender">Par: ${file.sender || 'Inconnu'}</span>
                            <span class="file-date">${fileDate}</span>
                        </div>
                    </div>
                </div>
                <div class="file-actions">
                    <a href="${file.data}" download="${file.name}" class="file-action-btn" title="Télécharger" target="_blank">
                        <i>📥</i>
                    </a>
                </div>
            </div>
        `;
    }

    getFileIcon(fileType) {
        if (!fileType) return '📁';

        if (typeof fileType === 'string') {
            if (fileType.startsWith('image/')) {
                return '🖼️';
            } else if (fileType.startsWith('video/')) {
                return '🎬';
            } else if (fileType.startsWith('audio/')) {
                return '🎵';
            } else if (fileType.includes('pdf')) {
                return '📄';
            } else if (fileType.includes('word') || fileType.includes('document')) {
                return '📝';
            } else if (fileType.includes('excel') || fileType.includes('sheet')) {
                return '📊';
            } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) {
                return '🗜️';
            }
        }

        return '📁';
    }

    formatFileSize(bytes) {
        if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else if (bytes < 1024 * 1024 * 1024) {
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        } else {
            return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        }
    }

    changeRoom(roomName) {
        // Mettre à jour l'affichage des fichiers pour la nouvelle salle
        this.updateFilesList(roomName);
    }

    // Charger les fichiers existants depuis le serveur
    loadFilesFromServer(roomName) {
        fetch(`${this.fileServerUrl}/files/${roomName}`)
            .then(response => response.json())
            .then(files => {
                // Convertir les fichiers au format attendu
                const formattedFiles = files.map(file => ({
                    id: file.id,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: `${this.fileServerUrl}${file.url}`,
                    sender: file.uploadedBy,
                    timestamp: new Date(file.uploadedAt).getTime()
                }));

                // Remplacer les fichiers de la salle
                this.files[roomName] = formattedFiles;

                // Mettre à jour l'affichage
                this.updateFilesList(roomName);
            })
            .catch(error => {
                console.error('Erreur lors du chargement des fichiers:', error);
            });
    }
}