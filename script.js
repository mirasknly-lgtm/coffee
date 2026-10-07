import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// --- ШАГ 1: ЕДИНАЯ КОНФИГУРАЦИЯ FIREBASE ---
const firebaseConfig = {
    apiKey: "ТВОЙ_API_KEY", // Убедитесь, что вставили сюда ключ, если он требуется
    authDomain: "craft-coffee-app.firebaseapp.com",
    projectId: "craft-coffee-app",
    storageBucket: "craft-coffee-app.firebasestorage.app",
    messagingSenderId: "886030226106",
    appId: "1:886030226106:web:7d97868d486b694de76883"
};

let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.error("Ошибка инициализации Firebase:", error);
}

let products = [];
let cart = [];

// Резервный массив (адаптирован под новые поля image и description)
const fallbackProducts = [
    { id: "1", name: "Эфиопия Иргачеффе", description: "Светлая обжарка. Ноты: бергамот, персик.", price: 5500, image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=600&q=80" },
    { id: "2", name: "Фирменный Бленд", description: "Средняя обжарка. Идеально для эспрессо.", price: 4000, image: "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=600&q=80" }
];

// --- ДОСТУП К DOM ЭЛЕМЕНТАМ (ID синхронизированы с index-2.html) ---
const overlay = document.getElementById('global-overlay');
const authModal = document.getElementById('modal-auth');
const cartSidebar = document.getElementById('cart-sidebar');
const catalogContainer = document.getElementById('catalog-container');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotalPrice = document.getElementById('cart-total-price');

// --- УПРАВЛЕНИЕ ИНТЕРФЕЙСОМ ---
function toggleAuth() {
    authModal.classList.toggle('active');
    overlay.classList.toggle('active');
    cartSidebar.classList.remove('active');
}

function toggleCart() {
    cartSidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    authModal.classList.remove('active');
}

function closeAll() {
    authModal.classList.remove('active');
    cartSidebar.classList.remove('active');
    overlay.classList.remove('active');
}

// Привязка событий окон
document.getElementById('btn-login').addEventListener('click', toggleAuth);
document.getElementById('close-auth').addEventListener('click', closeAll);
document.getElementById('btn-cart').addEventListener('click', toggleCart);
document.getElementById('close-cart').addEventListener('click', closeAll);
overlay.addEventListener('click', closeAll);

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Успешная авторизация!');
    closeAll();
});

// Глобальный перехватчик кликов
document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-add')) {
        addToCart(e.target.closest('.btn-add').dataset.id);
    }
    if (e.target.closest('.btn-remove')) {
        removeFromCart(Number(e.target.closest('.btn-remove').dataset.index));
    }
    if (e.target.id === 'btn-checkout') {
        checkout();
    }
});

// --- ЗАГРУЗКА И РЕНДЕР КАТАЛОГА ---
async function loadProducts() {
    try {
        if (db) {
            const querySnapshot = await getDocs(collection(db, "products"));
            querySnapshot.forEach((doc) => { 
                products.push({ id: doc.id, ...doc.data() }); 
            });
        }
    } catch (error) {
        console.error("Ошибка чтения Firebase:", error);
    }

    if (products.length === 0) products = fallbackProducts;
    renderCatalog();
}

// --- ШАГ 2 и 3: Исправленный рендер и синхронизация полей ---
function renderCatalog() {
    catalogContainer.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-img">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <div class="card-bottom">
                    <span class="price">${product.price} ₸</span>
                    <button class="btn-add" data-id="${product.id}">В корзину</button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- ШАГ 4: ЛОГИКА КОРЗИНЫ ---
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        cart.push(product);
        renderCart();
        
        // Визуальный отклик кнопки
        const btnCart = document.getElementById('btn-cart');
        btnCart.style.transform = 'scale(1.1)';
        setTimeout(() => btnCart.style.transform = 'scale(1)', 200);
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function renderCart() {
    cartCount.textContent = cart.length;
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-msg">Ваша корзина пуста</p>';
        cartTotalPrice.textContent = '0 ₸';
        return;
    }

    let total = 0;
    cart.forEach((item, index) => {
        total += Number(item.price);
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="item-info">
                <h4>${item.name}</h4>
                <p>${item.price} ₸</p>
            </div>
            <button class="btn-remove" data-index="${index}">✕</button>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    cartTotalPrice.textContent = total + ' ₸';
}

// --- ШАГ 5: ОТПРАВКА ЗАКАЗА (Checkout) ---
async function checkout() {
    if (cart.length === 0) {
        alert('Ваша корзина пуста!');
        return;
    }

    try {
        // Группировка товаров для админки (вычисление quantity)
        const itemsMap = {};
        let total = 0;
        
        cart.forEach(p => {
            if (!itemsMap[p.id]) {
                itemsMap[p.id] = { product: { name: p.name }, quantity: 0 };
            }
            itemsMap[p.id].quantity += 1;
            total += Number(p.price);
        });

        // Структура, которую ожидает loadOrders() в админке
        const orderData = {
            items: Object.values(itemsMap),
            status: 'new',
            createdAt: new Date(), 
            total: total,
            userEmail: 'Гость' // Можно заменить на реальный email после интеграции авторизации
        };

        // Отправка в Firestore
        await addDoc(collection(db, 'orders'), orderData);
        
        alert('Заказ успешно оформлен! Вы можете отследить его статус.');
        cart = []; // Очистка корзины
        renderCart();
        closeAll(); // Закрываем шторку
    } catch (error) {
        console.error("Ошибка при оформлении заказа:", error);
        alert('Произошла ошибка при отправке заказа. Попробуйте позже.');
    }
}

// Запускаем инициализацию при старте
loadProducts();
