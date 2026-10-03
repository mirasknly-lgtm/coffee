import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
// Добавлены импорты GoogleAuthProvider и signInWithPopup
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Твои ключи Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD1j0Y86ayy5w4sDWScDoS-EKPWy8jS0i4",
  authDomain: "craft-coffee-app.firebaseapp.com",
  projectId: "craft-coffee-app",
  storageBucket: "craft-coffee-app.firebasestorage.app",
  messagingSenderId: "886030226106",
  appId: "1:886030226106:web:7d97868d486b694de76883",
  measurementId: "G-YL2B4790ZC"
};

const app = initializeApp(firebaseConfig);
const dbFirestore = getFirestore(app);
const auth = getAuth(app);

class DatabaseService {
    async getProducts() {
        try {
            const productsCol = collection(dbFirestore, 'products');
            const snapshot = await getDocs(productsCol);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Ошибка загрузки:", error);
            return [];
        }
    }
}

class CartManager {
    constructor() { 
        this.items = []; 
        this.userId = null;
    }
    
    setUserId(uid) {
        this.userId = uid;
    }

    async loadCartFromDB() {
        if (!this.userId) return;
        try {
            const cartDoc = await getDoc(doc(dbFirestore, 'carts', this.userId));
            if (cartDoc.exists()) {
                this.items = cartDoc.data().items || [];
            } else {
                this.items = [];
            }
        } catch (error) {
            console.error("Ошибка загрузки корзины:", error);
        }
    }

    async syncCartWithDB() {
        if (!this.userId) return;
        try {
            await setDoc(doc(dbFirestore, 'carts', this.userId), { items: this.items });
        } catch (error) {
            console.error("Ошибка синхронизации корзины:", error);
        }
    }

    add(product) {
        const existing = this.items.find(item => item.product.id === product.id);
        if (existing) existing.quantity++;
        else this.items.push({ product, quantity: 1 });
        this.syncCartWithDB();
    }
    remove(productId) { 
        this.items = this.items.filter(item => item.product.id !== productId); 
        this.syncCartWithDB();
    }
    changeQuantity(productId, delta) {
        const item = this.items.find(i => i.product.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) this.remove(productId);
            else this.syncCartWithDB();
        }
    }
    getTotal() { return this.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0); }
    getCount() { return this.items.reduce((sum, item) => sum + item.quantity, 0); }
}

class UIManager {
    constructor(db, cart) {
        this.db = db;
        this.cart = cart;
        this.products = [];
        this.currentCategory = 'all';
        this.isLoginMode = true; 

        // Элементы
        this.grid = document.getElementById('products-grid');
        this.cartBtn = document.getElementById('cart-btn');
        this.loginBtn = document.getElementById('login-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        
        this.cartSidebar = document.getElementById('cart-sidebar');
        this.cartOverlay = document.getElementById('cart-overlay');
        this.closeCartBtn = document.getElementById('close-cart');
        this.cartItemsList = document.getElementById('cart-items');
        this.cartCount = document.getElementById('cart-count');
        this.totalPrice = document.getElementById('total-price');
        
        this.authOverlay = document.getElementById('auth-overlay');
        this.authModal = document.getElementById('auth-modal');
        this.authForm = document.getElementById('auth-form');
        this.closeAuthBtn = document.getElementById('close-auth');
        this.authToggleBtn = document.getElementById('auth-toggle-btn');
        this.authTitle = document.getElementById('auth-title');
        this.authSubmit = document.getElementById('auth-submit');
        this.authToggleText = document.getElementById('auth-toggle-text');
        
        // Новые элементы
        this.togglePasswordBtn = document.getElementById('toggle-password');
        this.passwordInput = document.getElementById('auth-password');
        this.googleLoginBtn = document.getElementById('google-login-btn');

        this.init();
    }

    async init() {
        this.bindEvents();
        this.products = await this.db.getProducts();
        this.renderProducts();
        
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.loginBtn.style.display = 'none';
                this.logoutBtn.style.display = 'block';
                this.cart.setUserId(user.uid);
                await this.cart.loadCartFromDB();
                this.updateCartUI();
                
                // Проверяем имя из Google или берем email
                const displayName = user.displayName || user.email;
                this.showToast(`Добро пожаловать, ${displayName}!`);
            } else {
                this.loginBtn.style.display = 'block';
                this.logoutBtn.style.display = 'none';
                this.cart.setUserId(null);
                this.cart.items = [];
                this.updateCartUI();
            }
        });
    }

    bindEvents() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.renderProducts();
            });
        });

        this.cartBtn.addEventListener('click', () => this.toggleCart(true));
        this.closeCartBtn.addEventListener('click', () => this.toggleCart(false));
        this.cartOverlay.addEventListener('click', () => this.toggleCart(false));

        this.loginBtn.addEventListener('click', () => this.toggleAuth(true));
        this.closeAuthBtn.addEventListener('click', () => this.toggleAuth(false));
        this.authOverlay.addEventListener('click', () => this.toggleAuth(false));
        
        this.authToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.isLoginMode = !this.isLoginMode;
            this.updateAuthModalUI();
        });

        // Логика глазка для пароля
        this.togglePasswordBtn.addEventListener('click', () => {
            const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            this.passwordInput.setAttribute('type', type);
            // Меняем иконку (закрытые / открытые глаза)
            this.togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
        });

        // Логика входа через Google
        this.googleLoginBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                this.toggleAuth(false);
            } catch (error) {
                console.error("Ошибка входа Google:", error);
                this.showToast("Ошибка при входе через Google.");
            }
        });

        // Стандартная форма (Email + Пароль)
        this.authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;

            try {
                if (this.isLoginMode) {
                    await signInWithEmailAndPassword(auth, email, password);
                } else {
                    await createUserWithEmailAndPassword(auth, email, password);
                }
                this.toggleAuth(false);
                this.authForm.reset();
            } catch (error) {
                console.error("Ошибка авторизации:", error);
                this.showToast(this.isLoginMode ? "Ошибка входа. Проверьте данные." : "Ошибка регистрации.");
            }
        });

        this.logoutBtn.addEventListener('click', () => {
            signOut(auth);
            this.showToast("Вы вышли из аккаунта");
        });
    }

    updateAuthModalUI() {
        this.authTitle.textContent = this.isLoginMode ? "Вход" : "Регистрация";
        this.authSubmit.textContent = this.isLoginMode ? "Войти" : "Зарегистрироваться";
        this.authToggleText.textContent = this.isLoginMode ? "Нет аккаунта?" : "Уже есть аккаунт?";
        this.authToggleBtn.textContent = this.isLoginMode ? "Зарегистрироваться" : "Войти";
    }

    toggleCart(show) {
        if (show) {
            this.cartSidebar.classList.add('active');
            this.cartOverlay.classList.add('active');
        } else {
            this.cartSidebar.classList.remove('active');
            this.cartOverlay.classList.remove('active');
        }
    }

    toggleAuth(show) {
        if (show) {
            this.authModal.classList.add('active');
            this.authOverlay.classList.add('active');
        } else {
            this.authModal.classList.remove('active');
            this.authOverlay.classList.remove('active');
            // Сбрасываем пароль в скрытый режим при закрытии модалки
            this.passwordInput.setAttribute('type', 'password');
            this.togglePasswordBtn.textContent = '👁️';
        }
    }

    formatPrice(price) { return price.toLocaleString('ru-RU') + ' ₸'; }

    renderProducts() {
        this.grid.innerHTML = '';
        const filtered = this.currentCategory === 'all' 
            ? this.products : this.products.filter(p => p.category === this.currentCategory);

        filtered.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="product-img">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.description}</p>
                    <div class="product-footer">
                        <span class="product-price">${this.formatPrice(product.price)}</span>
                        <button class="add-to-cart" data-id="${product.id}">+</button>
                    </div>
                </div>
            `;
            
            card.querySelector('.add-to-cart').addEventListener('click', () => {
                if (!auth.currentUser) {
                    this.showToast("Пожалуйста, войдите в аккаунт");
                    this.toggleAuth(true);
                    return;
                }
                this.cart.add(product);
                this.updateCartUI();
                this.showToast(`${product.name} добавлен в корзину`);
            });
            this.grid.appendChild(card);
        });
    }

    updateCartUI() {
        this.cartCount.textContent = this.cart.getCount();
        this.cartItemsList.innerHTML = '';
        
        if (this.cart.items.length === 0) {
            this.cartItemsList.innerHTML = '<p style="text-align:center; color:#888; margin-top:2rem;">Корзина пуста</p>';
        } else {
            this.cart.items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'cart-item';
                div.innerHTML = `
                    <img src="${item.product.image}" class="cart-item-img" alt="${item.product.name}">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.product.name}</div>
                        <div class="cart-item-price">${this.formatPrice(item.product.price)}</div>
                    </div>
                    <div class="cart-actions">
                        <button class="qty-btn minus" data-id="${item.product.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn plus" data-id="${item.product.id}">+</button>
                    </div>
                `;
                this.cartItemsList.appendChild(div);
            });

            this.cartItemsList.querySelectorAll('.minus').forEach(btn => 
                btn.addEventListener('click', (e) => { this.cart.changeQuantity(e.target.dataset.id, -1); this.updateCartUI(); })
            );
            this.cartItemsList.querySelectorAll('.plus').forEach(btn => 
                btn.addEventListener('click', (e) => { this.cart.changeQuantity(e.target.dataset.id, 1); this.updateCartUI(); })
            );
        }
        this.totalPrice.textContent = this.formatPrice(this.cart.getTotal());
    }

    showToast(message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const db = new DatabaseService();
    const cart = new CartManager();
    const ui = new UIManager(db, cart);
    
    document.getElementById('checkout-btn').addEventListener('click', () => {
        if (cart.items.length > 0) {
            ui.showToast('Заказ оформлен! Мы скоро с вами свяжемся.');
            cart.items = [];
            cart.syncCartWithDB();
            ui.updateCartUI();
            ui.toggleCart(false);
        } else {
            ui.showToast('Добавьте товары в корзину');
        }
    });
});
