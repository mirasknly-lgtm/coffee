import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

class DatabaseService {
    constructor() {
        this.fallbackProducts = [
            { id: "c1", name: "Карамельный Маккиато", price: 1800, category: "coffee", description: "Двойной эспрессо с ванильным сиропом, горячим молоком и карамельной сеточкой.", image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80" },
            { id: "c2", name: "Флэт Уайт", price: 1500, category: "coffee", description: "Насыщенный кофейный вкус с тонким слоем микропены.", image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80" },
            { id: "c3", name: "Айс Латте", price: 1600, category: "coffee", description: "Охлаждающий классический латте со льдом.", image: "https://images.unsplash.com/photo-1517701550927-30cfcb64db10?auto=format&fit=crop&w=600&q=80" },
            { id: "d1", name: "Чизкейк Нью-Йорк", price: 2200, category: "dessert", description: "Классический сливочный чизкейк на песочной основе.", image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80" },
            { id: "d2", name: "Тирамису", price: 2400, category: "dessert", description: "Воздушный итальянский десерт с маскарпоне и эспрессо.", image: "https://images.unsplash.com/photo-1571115177098-24de14c7c8c3?auto=format&fit=crop&w=600&q=80" }
        ];
    }

    async getProducts() {
        try {
            const productsCol = collection(dbFirestore, 'products');
            const snapshot = await getDocs(productsCol);
            
            if (snapshot.empty) {
                console.warn("В Firestore нет товаров. Загружаю локальные данные...");
                return this.fallbackProducts;
            }

            const productsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            return productsList;
        } catch (error) {
            console.error("Ошибка при подключении к Firestore:", error);
            return this.fallbackProducts;
        }
    }

    // Функция для первоначальной загрузки данных в пустую БД
    async seedDatabase() {
        try {
            const productsCol = collection(dbFirestore, 'products');
            for (const item of this.fallbackProducts) {
                // Создаем копию без id, чтобы Firebase сгенерировал свой уникальный ID
                const { id, ...itemData } = item; 
                await addDoc(productsCol, itemData);
            }
            console.log("Товары успешно загружены в облако Firebase!");
            alert("Товары успешно загружены в базу данных! Обновите страницу.");
        } catch (error) {
            console.error("Ошибка при загрузке:", error);
        }
    }
}

class CartManager {
    constructor() { this.items = []; }
    add(product) {
        const existing = this.items.find(item => item.product.id === product.id);
        if (existing) existing.quantity++;
        else this.items.push({ product, quantity: 1 });
    }
    remove(productId) { this.items = this.items.filter(item => item.product.id !== productId); }
    changeQuantity(productId, delta) {
        const item = this.items.find(i => i.product.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) this.remove(productId);
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

        this.grid = document.getElementById('products-grid');
        this.cartBtn = document.getElementById('cart-btn');
        this.cartSidebar = document.getElementById('cart-sidebar');
        this.cartOverlay = document.getElementById('cart-overlay');
        this.closeCartBtn = document.getElementById('close-cart');
        this.cartItemsList = document.getElementById('cart-items');
        this.cartCount = document.getElementById('cart-count');
        this.totalPrice = document.getElementById('total-price');
        this.filterBtns = document.querySelectorAll('.filter-btn');

        this.init();
    }

    async init() {
        this.bindEvents();
        this.products = await this.db.getProducts();
        this.renderProducts();
        this.updateCartUI();
        
        // Делаем db доступным глобально, чтобы мы могли вызвать функцию seed из консоли
        window.coffeeDB = this.db; 
    }

    bindEvents() {
        this.cartBtn.addEventListener('click', () => this.toggleCart(true));
        this.closeCartBtn.addEventListener('click', () => this.toggleCart(false));
        this.cartOverlay.addEventListener('click', () => this.toggleCart(false));

        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.renderProducts();
            });
        });
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
            ui.updateCartUI();
            ui.toggleCart(false);
        } else {
            ui.showToast('Добавьте товары в корзину');
        }
    });
});
