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
        this.init();
    }
    init() {
        this.setupEventListeners();
        this.setupAuthStateObserver();
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
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                console.log('Utilisateur connecté:', user.email);
                this.saveUserData(user);
                this.redirectToChat();
            } else {
                console.log('Utilisateur déconnecté');
                this.clearUserData();
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
        // ici juste bash ntestiw
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
            const result = await signInWithPopup(this.auth, this.googleProvider);
            this.showSuccess('Connexion Google réussie !');
        } catch (error) {
            this.handleAuthError(error);
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
        btn.classList.toggle('loading', isLoading);
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
        window.location.href = "../chat.html";
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
    new AuthManager();
});