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

    static logout() {
        sessionStorage.removeItem('chatHubUser');
        window.location.href = 'auth.html';
    }
}

// Vérifier l'authentification au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    if (!AuthCheck.isAuthenticated() && !window.location.href.includes('auth.html')) {
        window.location.href = 'auth.html';
    }
});