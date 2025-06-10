import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut, 
    updateProfile 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// hadi configuration existe sur Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCS3gEH0z0Sd-md38fRIbIWColGguVSrrY",
  authDomain: "chat-hub-a2d03.firebaseapp.com",
  projectId: "chat-hub-a2d03",
  storageBucket: "chat-hub-a2d03.firebasestorage.app",
  messagingSenderId: "573233866453",
  appId: "1:573233866453:web:849c63685074f8fad7e45c",
  measurementId: "G-ST8E7DZ00C"
};

// ici on va initialiser firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

class AuthManager {
    constructor() {
        this.auth = auth;
        this.googleProvider = googleProvider;
        this.authStateListenerActive = false;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        // Attendre un peu avant de configurer l'observateur pour éviter les conflits
        setTimeout(() => {
            this.setupAuthStateObserver();
        }, 100);
        console.log('AuthManager initialisé avec Firebase');
    }

    setupEventListeners() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
        });

        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        document.getElementById('google-auth').addEventListener('click', () => {
            this.handleGoogleAuth();
        });
    }

    setupAuthStateObserver() {
        // Éviter de créer plusieurs observateurs
        if (this.authStateListenerActive) {
            return;
        }
        
        this.authStateListenerActive = true;
        
        onAuthStateChanged(this.auth, (user) => {
            console.log('Auth state changed:', user ? 'connecté' : 'déconnecté');
            
            // Vérifier si on est sur la page d'authentification
            const isOnAuthPage = window.location.href.includes('auth.html') || 
                                 window.location.pathname.endsWith('auth.html') ||
                                 window.location.pathname === '/';
            
            if (user) {
                console.log('Utilisateur connecté:', user.email);
                
                // Vérifier si c'est une déconnexion manuelle en cours
                const isManualLogout = sessionStorage.getItem('manualLogout') === 'true';
                
                if (isManualLogout) {
                    console.log('Déconnexion manuelle en cours - forcer la déconnexion Firebase');
                    // Ne pas sauvegarder les données utilisateur
                    // Ne pas rediriger
                    // Forcer la déconnexion Firebase
                    signOut(this.auth).then(() => {
                        console.log('Déconnexion Firebase forcée réussie');
                        sessionStorage.removeItem('manualLogout');
                        this.clearUserData();
                    }).catch(error => {
                        console.error('Erreur lors de la déconnexion forcée:', error);
                        // Même en cas d'erreur, nettoyer les données locales
                        sessionStorage.removeItem('manualLogout');
                        this.clearUserData();
                    });
                    return;
                }
                
                // Si on est sur la page d'auth et que ce n'est pas une déconnexion manuelle,
                // alors c'est une vraie connexion
                if (isOnAuthPage) {
                    this.saveUserData(user);
                    this.redirectToChat();
                }
            } else {
                console.log('Utilisateur déconnecté');
                this.clearUserData();
                // Nettoyer le flag de déconnexion manuelle
                sessionStorage.removeItem('manualLogout');
            }
        });
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const submitBtn = document.querySelector('#login-form .auth-btn');

        if (!email || !password) {
            this.showError('Veuillez remplir tous les champs');
            return;
        }

        this.setLoading(submitBtn, true);
        this.clearError();

        try {
            // Nettoyer le flag de déconnexion manuelle avant la connexion
            sessionStorage.removeItem('manualLogout');
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            this.showSuccess('Connexion réussie ! Redirection...');
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const submitBtn = document.querySelector('#register-form .auth-btn');
        
        if (!name || !email || !password) {
            this.showError('Veuillez remplir tous les champs !');
            return;
        }
        if (password.length < 6) {
            this.showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        
        this.setLoading(submitBtn, true);
        this.clearError();

        try {
            // Nettoyer le flag de déconnexion manuelle avant l'inscription
            sessionStorage.removeItem('manualLogout');
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            this.showSuccess('Inscription réussie ! Redirection...');
        } catch (error) {
            this.handleAuthError(error);
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    async handleGoogleAuth() {
        const googleBtn = document.getElementById('google-auth');
        this.setLoading(googleBtn, true);
        this.clearError();

        try {
            // Nettoyer le flag de déconnexion manuelle avant la connexion Google
            sessionStorage.removeItem('manualLogout');
            
            // Configuration du provider Google
            this.googleProvider.addScope('email');
            this.googleProvider.addScope('profile');
            
            console.log('Tentative de connexion Google...');
            const result = await signInWithPopup(this.auth, this.googleProvider);
            
            // Obtenir les informations d'identification Google
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            const user = result.user;
            
            console.log('Connexion Google réussie:', user.email);
            this.showSuccess('Connexion Google réussie ! Redirection...');
            
            // Les données utilisateur seront sauvegardées automatiquement 
            // par l'observateur onAuthStateChanged
            
        } catch (error) {
            console.error('Erreur Google Auth:', error);
            
            // Gestion des erreurs spécifiques à Google
            if (error.code === 'auth/popup-closed-by-user') {
                this.showError('Connexion annulée par l\'utilisateur');
            } else if (error.code === 'auth/popup-blocked') {
                this.showError('Popup bloqué. Autorisez les popups et réessayez');
            } else if (error.code === 'auth/cancelled-popup-request') {
                this.showError('Demande de popup annulée');
            } else {
                this.handleAuthError(error);
            }
        } finally {
            this.setLoading(googleBtn, false);
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`.auth-tab[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(`${tabName}-form`).classList.add('active');
    }

    setLoading(btn, isLoading) {
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');
        
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('loading');
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline';
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('auth-error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.color = '#dc2626'; 
        errorElement.style.backgroundColor = '#fee2e2'; 
        errorElement.style.borderColor = '#dc2626';
    }

    clearError() {
        const errorElement = document.getElementById('auth-error');
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        errorElement.style.color = '';
        errorElement.style.backgroundColor = '';
        errorElement.style.borderColor = '';
    }

    showSuccess(message) {
        const errorElement = document.getElementById('auth-error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.style.color = '#10b981'; 
        errorElement.style.backgroundColor = '#d1fae5'; 
        errorElement.style.borderColor = '#10b981';
    }

    handleAuthError(error) {
        console.error('Erreur auth:', error); 
        let message = "Une erreur est survenue.";
        
        switch(error.code) {
            case "auth/user-not-found":
                message = "Utilisateur introuvable.";
                break;
            case "auth/wrong-password":
                message = "Mot de passe incorrect.";
                break;
            case "auth/email-already-in-use":
                message = "Cette adresse email est déjà utilisée.";
                break;
            case "auth/invalid-email":
                message = "Adresse email invalide.";
                break;
            case "auth/weak-password":
                message = "Le mot de passe est trop faible.";
                break;
            case "auth/invalid-credential":
                message = "Email ou mot de passe incorrect.";
                break;
            case "auth/too-many-requests":
                message = "Trop de tentatives. Réessayez plus tard.";
                break;
            case "auth/network-request-failed":
                message = "Erreur de connexion. Vérifiez votre internet.";
                break;
            default:
                message = `Erreur: ${error.message}`;
        }
        
        this.showError(message);
    }

    redirectToChat() {
        // Ajouter un petit délai pour s'assurer que les données sont sauvegardées
        setTimeout(() => {
            window.location.href = "chat.html";
        }, 500);
    }
    
    saveUserData(user) {
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null
        };
        sessionStorage.setItem('chatHubUser', JSON.stringify(userData));
    }

    clearUserData() {
        sessionStorage.removeItem('chatHubUser');
    }
}

// ici on va initialiser le gestionnaire d'auth ^-^
document.addEventListener('DOMContentLoaded', () => {
    // Nettoyer le flag de déconnexion manuelle au chargement de la page d'auth
    // mais seulement si on est vraiment sur la page d'auth
    const isOnAuthPage = window.location.href.includes('auth.html') || 
                         window.location.pathname.endsWith('auth.html') ||
                         window.location.pathname === '/';
    
    if (isOnAuthPage) {
        console.log('Chargement de la page d\'authentification');
        // Ne pas nettoyer immédiatement le flag pour permettre la déconnexion complète
        setTimeout(() => {
            new AuthManager();
        }, 100);
    }
});