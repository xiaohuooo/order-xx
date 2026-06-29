/**
 * 女友端 - 点单页面逻辑
 */

let currentCategory = 'all';
let cart = [];

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', async () => {
    loadCartFromStorage();
    renderCategories();
    await initDefaultProducts();
    renderProducts();
});

// ========== 分类渲染 ==========
function renderCategories() {
    const container = document.getElementById('categoryList');
    container.innerHTML = Object.entries(CATEGORIES).map(([key, cat]) =>
        `<button class="cat-btn ${key === currentCategory ? 'active' : ''}" onclick="switchCategory('${key}')">
            ${cat.icon} ${cat.name}
        </button>`
    ).join('');
}

function switchCategory(cat) {
    currentCategory = cat;
    renderCategories();
    renderProducts();
}

// ========== 商品渲染 ==========
async function renderProducts() {
    const products = await getProducts();
    const filtered = currentCategory === 'all'
        ? products
        : products.filter(p => p.category === currentCategory);

    const container = document.getElementById('productsGrid');

    if (filtered.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">这个分类还没有商品哦~</p>';
        return;
    }

    container.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="addToCart(${p.id}, event)">
            <div class="product-emoji-wrap">
                <span class="product-emoji">${p.emoji || '🎁'}</span>
            </div>
            <div class="product-name">${p.name}</div>
            <div class="product-price">${p.price}</div>
            <div class="product-desc">${p.desc || ''}</div>
            <button class="product-add-btn" onclick="event.stopPropagation(); addToCart(${p.id}, event)">
                <i class="fas fa-plus"></i> 加入购物车
            </button>
        </div>
    `).join('');
}

// ========== 浮动爱心特效 ==========
function spawnHearts(x, y, count = 5) {
    const container = document.getElementById('heartsContainer');
    if (!container) return;

    const heartIcons = ['🍯', '✨', '⭐', '🌟', '🍋'];
    for (let i = 0; i < count; i++) {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.textContent = heartIcons[Math.floor(Math.random() * heartIcons.length)];
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 30;
        heart.style.left = (x + offsetX) + 'px';
        heart.style.top = (y + offsetY) + 'px';
        heart.style.fontSize = (16 + Math.random() * 14) + 'px';
        heart.style.animationDuration = (2 + Math.random() * 1.5) + 's';
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 3500);
    }
}

// ========== 购物车操作 ==========
async function addToCart(productId, event) {
    const products = await getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            emoji: product.emoji,
            qty: 1
        });
    }

    saveCartToStorage();
    updateCartUI();

    if (event && event.clientX) {
        spawnHearts(event.clientX, event.clientY, 4);
    }

    showToast(`已添加 ${product.emoji || ''} ${product.name}`, 'success');
}

function removeFromCart(index, event) {
    cart.splice(index, 1);
    saveCartToStorage();
    updateCartUI();
    if (event && event.clientX) {
        spawnHearts(event.clientX, event.clientY, 3);
    }
}

function changeQty(index, delta, event) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    saveCartToStorage();
    updateCartUI();
}

function toggleCart() {
    const overlay = document.getElementById('cartOverlay');
    const sidebar = document.getElementById('cartSidebar');
    const isOpen = sidebar.classList.contains('show');

    if (isOpen) {
        overlay.classList.remove('show');
        sidebar.classList.remove('show');
    } else {
        overlay.classList.add('show');
        sidebar.classList.add('show');
        updateCartUI();
    }
}

function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    badge.textContent = count;

    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty-state">
                <div class="cart-empty-emoji">🛍️</div>
                <p class="cart-empty-text">购物车空空如也~</p>
                <p class="cart-empty-sub">快去选点什么吧！</p>
            </div>
        `;
        cartFooter.style.display = 'none';
    } else {
        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-emoji-wrap">
                    <span class="cart-item-emoji">${item.emoji || '🎁'}</span>
                </div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price}</div>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeQty(${index}, -1, event)">−</button>
                    <span class="qty-num">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1, event)">+</button>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index}, event)">
                    <i class="fas fa-heart-crack"></i>
                </button>
            </div>
        `).join('');

        document.getElementById('cartCount').textContent = count;
        cartFooter.style.display = 'block';
    }
}

// ========== 下单 ==========
async function submitOrder() {
    if (cart.length === 0) {
        showToast('购物车还是空的哦~', 'error');
        return;
    }

    const note = document.getElementById('cartNote').value.trim();

    const order = {
        items: JSON.parse(JSON.stringify(cart)),
        note: note
    };

    await addOrder(order);

    showSuccessAnimation(() => {
        cart = [];
        document.getElementById('cartNote').value = '';
        saveCartToStorage();
        updateCartUI();
        toggleCart();
    });
}

function showSuccessAnimation(callback) {
    const div = document.createElement('div');
    div.className = 'success-animation';
    div.innerHTML = `
        <div class="success-icon">💖</div>
        <div class="success-text">下单成功！</div>
    `;

    document.body.appendChild(div);

    const rect = div.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setTimeout(() => spawnHearts(centerX, centerY - 50, 12), 200);
    setTimeout(() => spawnHearts(centerX - 80, centerY, 8), 450);
    setTimeout(() => spawnHearts(centerX + 80, centerY, 8), 600);

    div.onclick = () => {
        div.remove();
        if (callback) callback();
    };

    setTimeout(() => {
        div.remove();
        if (callback) callback();
    }, 3000);
}

// ========== 存储 ==========
function saveCartToStorage() {
    localStorage.setItem('menu_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const data = localStorage.getItem('menu_cart');
    if (data) {
        cart = JSON.parse(data);
    }
    updateCartUI();
}

// ========== Toast ==========
function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.innerHTML = `
        <span class="toast-icon">
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}"></i>
        </span>
        <span class="toast-text">${msg}</span>
    `;
    toast.className = 'toast ' + (type || '') + ' show';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}
