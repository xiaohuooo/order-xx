/**
 * 后台管理页逻辑 - 订单管理 & 商品管理（云同步版，兼容所有浏览器）
 */

var currentTab = 'orders';
var orderFilter = 'all';
var editingProductId = null;
var unsubscribeOrders = null;

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    initDefaultProducts().then(function() {
        return renderOrders();
    }).then(function() {
        updateOrderBadge();
        startOrdersListener();
        renderProductsAdmin();
    });
});

// ========== Tab切换 ==========
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    document.querySelector('.tab-btn:has(i.fa-' + (tab === 'orders' ? 'list-check' : 'boxes') + ')').classList.add('active');
    document.getElementById(tab === 'orders' ? 'ordersPanel' : 'productsPanel').classList.add('active');
    if (tab === 'orders') renderOrders();
    if (tab === 'products') renderProductsAdmin();
}

// 实时监听订单
function startOrdersListener() {
    unsubscribeOrders = onOrdersSnapshot(function(orders) {
        renderOrdersFromData(orders);
        updateOrderBadge();
    });
}

function renderOrdersFromData(orders) {
    var filtered = orderFilter === 'all' ? orders : orders.filter(function(o) { return o.status === orderFilter; });
    renderOrderCards(filtered);
}

function renderOrders() {
    return getOrders().then(function(orders) {
        renderOrdersFromData(orders);
    });
}

function renderOrderCards(filtered) {
    var container = document.getElementById('ordersList');
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">📭 暂无订单~</p>';
        return;
    }
    container.innerHTML = filtered.map(function(order) {
        var itemsHTML = order.items.map(function(item) {
            return '<span class="order-item-tag">' + (item.emoji || '') + ' ' + item.name + ' ×' + item.qty + '</span>';
        }).join('');
        var noteHTML = order.note ? '<div class="order-note">💬 "' + order.note + '"</div>' : '';
        var doneBtn = order.status === 'pending' ?
            '<button class="btn-sm btn-done" onclick="doneOrder(\'' + order._firestoreId + '\')"><i class="fas fa-check"></i> 标记完成</button>' : '';
        return '<div class="order-card ' + order.status + '">' +
            '<div class="order-card-header">' +
                '<span class="order-time">🕐 ' + (order.timeDisplay || '') + '</span>' +
                '<span class="order-status ' + order.status + '">' + (order.status === 'pending' ? '⏳ 待处理' : '✅ 已完成') + '</span>' +
            '</div>' +
            '<div class="order-items">' + itemsHTML + '</div>' +
            noteHTML +
            '<div class="order-actions">' +
                doneBtn +
                '<button class="btn-sm btn-delete" onclick="removeOrder(\'' + order._firestoreId + '\')"><i class="fas fa-trash"></i> 删除</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function filterOrders(filter) {
    orderFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelector('.filter-btn[onclick*="' + filter + '"]').classList.add('active');
    renderOrders();
}

function doneOrder(id) {
    markOrderDone(id).then(function() {
        renderOrders();
        updateOrderBadge();
        showToast('已标记为完成 ✅', 'success');
    });
}

function removeOrder(id) {
    if (confirm('确定要删除这个订单吗？')) {
        deleteOrder(id).then(function() {
            renderOrders();
            updateOrderBadge();
            showToast('订单已删除', 'success');
        });
    }
}

function updateOrderBadge() {
    getPendingCount().then(function(count) {
        var badge = document.getElementById('orderBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    });
}

// ========== 商品管理 ==========
function renderProductsAdmin() {
    getProducts().then(function(products) {
        var container = document.getElementById('productsAdminList');
        container.innerHTML = products.map(function(p) {
            var catInfo = (CATEGORIES[p.category] ? CATEGORIES[p.category].icon + ' ' + CATEGORIES[p.category].name : p.category);
            return '<div class="product-admin-item">' +
                '<div class="product-admin-emoji">' + (p.emoji || '🎁') + '</div>' +
                '<div class="product-admin-info">' +
                    '<div class="product-admin-name">' + p.name + '</div>' +
                    '<div class="product-admin-meta">' + catInfo + '&nbsp;|&nbsp;' + p.price + '</div>' +
                '</div>' +
                '<div class="product-admin-actions">' +
                    '<button class="btn-icon" title="编辑" onclick="editProduct(' + p.id + ')"><i class="fas fa-edit"></i></button>' +
                    '<button class="btn-icon danger" title="删除" onclick="removeProduct(' + p.id + ')"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</div>';
        }).join('');
    });
}

// ========== 商品弹窗 ==========
function showAddProduct() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = '➕ 添加商品';
    document.getElementById('btnSaveProduct').textContent = '添加';
    clearProductForm();
    document.getElementById('productModal').classList.add('show');
}

function editProduct(id) {
    getProducts().then(function(products) {
        var product = products.find(function(p) { return p.id === id; });
        if (!product) return;
        editingProductId = id;
        document.getElementById('modalTitle').textContent = '✏️ 编辑商品';
        document.getElementById('btnSaveProduct').textContent = '保存修改';
        document.getElementById('editProductId').value = id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productEmoji').value = product.emoji || '';
        document.getElementById('productDesc').value = product.desc || '';
        document.getElementById('productModal').classList.add('show');
    });
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('show');
    clearProductForm();
}

function clearProductForm() {
    document.getElementById('editProductId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = 'food';
    document.getElementById('productPrice').value = '';
    document.getElementById('productEmoji').value = '';
    document.getElementById('productDesc').value = '';
}

function saveProduct() {
    var name = document.getElementById('productName').value.trim();
    var category = document.getElementById('productCategory').value;
    var price = document.getElementById('productPrice').value.trim();
    var emoji = document.getElementById('productEmoji').value.trim();
    var desc = document.getElementById('productDesc').value.trim();

    if (!name) { showToast('请输入商品名称', 'error'); return; }
    if (!price) { showToast('请输入价格或描述', 'error'); return; }

    var id = document.getElementById('editProductId').value;
    var promise;
    if (id) {
        promise = updateProduct(parseInt(id), { name: name, category: category, price: price, emoji: emoji, desc: desc });
    } else {
        promise = addProduct({ name: name, category: category, price: price, emoji: emoji, desc: desc });
    }
    promise.then(function() {
        showToast(id ? '商品已更新 ✅' : '商品已添加 🎉', 'success');
        closeProductModal();
        renderProductsAdmin();
    });
}

function removeProduct(id) {
    if (confirm('确定要删除这个商品吗？')) {
        deleteProduct(id).then(function() {
            renderProductsAdmin();
            showToast('商品已删除', 'success');
        });
    }
}

// ========== Toast ==========
function showToast(msg, type) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() {
        toast.classList.remove('show');
    }, 2000);
}

// 点击弹窗外部关闭
document.addEventListener('click', function(e) {
    var modal = document.getElementById('productModal');
    if (e.target === modal) closeProductModal();
});
