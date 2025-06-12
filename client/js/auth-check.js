// Vérification de l'authentification
class AuthCheck {
    static isAuthenticated() {
        const userData = sessionStorage.getItem('chatHubUser');
        return userData !== null;
    }

    static getUserData() {
        if (!this.isAuthenticated()) {
            return null;
        }
        return JSON.parse(sessionStorage.getItem('chatHubUser'));
    }

    static getUsername() {
        const userData = this.getUserData();
        return userData ? userData.displayName : null;
    }

    static getUserId() {
        const userData = this.getUserData();
        return userData ? userData.uid : null;
    }

    static getUserEmail() {
        const userData = this.getUserData();
        return userData ? userData.email : null;
    }

    static getUserPhoto() {
        const userData = this.getUserData();
        return userData ? userData.photoURL : null;
    }

    static async logout() {
        console.log('Début de la déconnexion manuelle');
        
        // Marquer que l'utilisateur se déconnecte manuellement
        sessionStorage.setItem('manualLogout', 'true');
        
        // Supprimer les données utilisateur immédiatement
        sessionStorage.removeItem('chatHubUser');
        
        // Déconnecter de Firebase
        try {
            // Importer Firebase auth dynamiquement
            const { getAuth, signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const auth = getAuth();
            await signOut(auth);
            console.log('Déconnexion Firebase réussie');
        } catch (error) {
            console.error('Erreur lors de la déconnexion Firebase:', error);
        }
        
        // Attendre un peu pour s'assurer que la déconnexion Firebase est complète
        setTimeout(() => {
            console.log('Redirection vers la page d\'authentification');
            window.location.href = 'auth.html';
        }, 200);
    }

    static isManualLogout() {
        return sessionStorage.getItem('manualLogout') === 'true';
    }

    static clearManualLogout() {
        sessionStorage.removeItem('manualLogout');
    }
}

// Vérifier l'authentification au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si on est sur la page d'authentification
    const isOnAuthPage = window.location.href.includes('auth.html') || 
                         window.location.pathname.endsWith('auth.html') ||
                         window.location.pathname === '/';
    
    // Si on n'est pas authentifié et qu'on n'est pas sur la page d'auth, rediriger
    if (!AuthCheck.isAuthenticated() && !isOnAuthPage) {
        console.log('Utilisateur non authentifié, redirection vers auth.html');
        window.location.href = 'auth.html';
    }
    
    // Si on est authentifié et qu'on est sur la page d'auth (sans déconnexion manuelle), rediriger vers le chat
    if (AuthCheck.isAuthenticated() && isOnAuthPage && !AuthCheck.isManualLogout()) {
        console.log('Utilisateur déjà authentifié, redirection vers chat.html');
        window.location.href = 'chat.html';
    }
});