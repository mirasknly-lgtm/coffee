import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Резервный массив товаров (если БД пуста или ключи не работают)
const fallbackProducts = [
    { id: "1", name: "Эфиопия Иргачеффе", desc: "Светлая обжарка. Ноты: бергамот, персик.", price: 5500, img: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=600&q=80" },
    { id: "2", name: "Фирменный Бленд", desc: "Средняя обжарка. Идеально для эспрессо.", price: 4000, img: "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=600&q=80" },
    { id: "3", name: "Миндальный Круассан", desc: "Свежая выпечка с миндальным кремом.", price: 1200, img: "https://images.unsplash.com/photo-1549903072-7e6e0d6594b4?auto=format&fit=crop&w=600&q=80" }
];

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
    console.error("Firebase init error:", error);
}

let products = [];
let cart = [];

// DOM Элементы
const overlay = document.getElementById('page-overlay');
const authModal = document.getElementById('auth-modal');
const cartSidebar = document.getElementById('cart-sidebar');
const catalogContainer = document.getElementById('catalog');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotalPrice = document.getElementById('cart-total-price');

// Управление интерфейсом
function toggleAuth() {
    authModal.classList.toggle('active');
    overlay.classList.toggle('active');
    cartSidebar.classList.remove('active'); // Закрываем корзину, если открыта
}

function toggleCart() {
    cartSidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    authModal.classList.remove('active'); // Закрываем авторизацию, если открыта
}

function closeAll() {
    authModal.classList.remove('active');
    cartSidebar.classList.remove('active');
    overlay.classList.remove('active');
}

// Привязка событий (Открытие/Закрытие окон)
document.getElementById('auth-open').addEventListener('click', toggleAuth);
document.getElementById('auth-close').addEventListener('click', closeAll);
document.getElementById('cart-open').addEventListener('click', toggleCart);
document.getElementById('cart-close').addEventListener('click', closeAll);
overlay.addEventListener('click', closeAll);

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Успешная авторизация!');
    closeAll();
});

// Глобальный перехватчик кликов для динамических кнопок
document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-add')) {
        addToCart(e.target.closest('.btn-add').dataset.id);
    }
    if (e.target.closest('.cart-item-remove')) {
        removeFromCart(Number(e.target.closest('.cart-item-remove').dataset.index));
    }
    if (e.target.id === 'checkout-btn') {
        alert(cart.length > 0 ? 'Переход к оплате!' : 'Корзина пуста');
    }
});

// Загрузка и рендер
async function loadProducts() {
    try {
        if (db) {
            const querySnapshot = await getDocs(collection(db, "products"));
            querySnapshot.forEach((doc) => { products.push({ id: doc.id, ...doc.data() }); });
        }
    } catch (error) {
        console.error("Ошибка Firebase:", error);
    }

    // Если база пуста или недоступна, используем резервный каталог
    if (products.length === 0) products = fallbackProducts;
    renderCatalog();
}

function renderCatalog() {
    catalogContainer.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.img}" alt="${product.
