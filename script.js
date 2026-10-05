import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Инициализация базы данных
let db;
try {
    const firebaseConfig = {
        apiKey: "AIzaSyCkg-3Boc0rkRHEc1ZHcdGc3ih4pE0Zyos",
        authDomain: "coffeeportfolio-160a7.firebaseapp.com",
        projectId: "coffeeportfolio-160a7",
        storageBucket: "coffeeportfolio-160a7.firebasestorage.app",
        messagingSenderId: "463097421957",
        appId: "1:463097421957:web:9db7ccc6eab7ace8d8c9ec"
    };
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.error("Ошибка подключения к Firebase:", error);
}

let products = [];
let cart = [];

const catalogContainer = document.getElementById('catalog');
const cartItemsContainer = document.getElementById('cart-items');
const cartCountElement = document.getElementById('cart-count');
const cartTotalPrice = document.getElementById('cart-total-price');

// Управление модальным окном авторизации
const authOpenBtn = document.getElementById('auth-open');
const authCloseBtn = document.getElementById('auth-close');
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');

function toggleAuth() { document.body.classList.toggle('auth-active'); }
authOpenBtn.addEventListener('click', toggleAuth);
authCloseBtn.addEventListener('click', toggleAuth);
authOverlay.addEventListener('click', toggleAuth);

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Успешная авторизация!');
    toggleAuth();
});

// Управление шторкой корзины
const cartOpenBtn = document.getElementById('cart-open');
const cartCloseBtn = document.getElementById('cart-close');
const cartOverlay = document.getElementById('cart-overlay');

function toggleCart() { document.body.classList.toggle('cart-active'); }
cartOpenBtn.addEventListener('click', toggleCart);
cartCloseBtn.addEventListener('click', toggleCart);
cartOverlay.addEventListener('click', toggleCart);

// Глобальный перехватчик кликов (решает проблемы с динамическими кнопками)
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('btn-add')) {
        addToCart(event.target.getAttribute('data-id'));
    }
    if (event.target.classList.contains('cart-item-remove')) {
        removeFromCart(event.target.getAttribute('data-index'));
    }
    if (event.target.classList.contains('checkout-btn')) {
        alert('Переход к оформлению заказа!');
    }
});

// Загрузка товаров из БД
async function loadProducts() {
    if (!db) {
        catalogContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">База данных не подключена.</p>';
        return;
    }

    catalogContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Загрузка меню...</p>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        if (products.length === 0) {
            catalogContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Каталог пуст.</p>';
            return;
        }

        renderCatalog();
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        catalogContainer.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: red;">Ошибка доступа к БД.</p>';
    }
}

// Отрисовка товаров
function renderCatalog() {
    catalogContainer.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-img-wrap">
                <img src="${product.img || ''}" alt="${product.name}" class="product-img">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-desc">${product.desc}</p>
                <div class="product-bottom">
                    <span class="product-price">${new Intl.NumberFormat('ru-RU').format(product.price)} ₸</span>
                    <button class="btn-add" data-id="${product.id}">В корзину</button>
                </div>
            </div>
        `;
        catalogContainer.appendChild(card);
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    cart.push(product);
    cartOpenBtn.style.transform = 'scale(1.05)';
    setTimeout(() => cartOpenBtn.style.transform = 'scale(1)', 200);
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    cartCountElement.textContent = cart.length;
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Ваша корзина пуста</p>';
        cartTotalPrice.textContent = '0 ₸';
        return;
    }

    let total = 0;
    cart.forEach((item, index) => {
        total += Number(item.price);
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${new Intl.NumberFormat('ru-RU').format(item.price)} ₸</p>
            </div>
            <button class="cart-item-remove" data-index="${index}">✕</button>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    cartTotalPrice.textContent = new Intl.NumberFormat('ru-RU').format(total) + ' ₸';
}

loadProducts();
