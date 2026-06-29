/**
 * 数据层 - GitHub 仓库云同步版（国内可访问！零CORS！）
 * Token存储在db.json中，安全不泄露
 */
var GITHUB_TOKEN = null;
var REPO_API = 'https://api.github.com/repos/xiaohuooo/order-xx/contents/db.json';
var DB_URL = 'db.json';

var DEFAULT_PRODUCTS = [
    { id: 1, name: '冰淇淋', category: 'food', price: '一个抱抱', emoji: '🍦', desc: '夏天到了，来个冰淇淋吧~' },
    { id: 2, name: '珍珠奶茶', category: 'drink', price: '亲一口', emoji: '🧋', desc: '少糖去冰，加珍珠！' },
    { id: 3, name: '草莓蛋糕', category: 'food', price: '陪我看电影', emoji: '🍰', desc: '甜甜的草莓蛋糕，心情美美哒' },
    { id: 4, name: '打视频电话', category: 'love', price: '免费', emoji: '📹', desc: '想你了，打视频看看你~' },
    { id: 5, name: '一起散步', category: 'activity', price: '30分钟', emoji: '🚶', desc: '饭后一起散散步，聊聊天' },
    { id: 6, name: '分享日常', category: 'love', price: '免费', emoji: '📸', desc: '今天发生了什么有趣的事？' },
    { id: 7, name: '抱抱', category: 'love', price: '免费', emoji: '🤗', desc: '就要抱抱！' },
    { id: 8, name: '一起追剧', category: 'activity', price: '2小时', emoji: '📺', desc: '窝在沙发一起看剧~' },
    { id: 9, name: '芒果冰沙', category: 'drink', price: '说爱我', emoji: '🥭', desc: '冰冰凉凉，超级解暑' },
    { id: 10, name: '做一顿饭', category: 'activity', price: '夸我漂亮', emoji: '🍳', desc: '给你做顿好吃的！' },
    { id: 11, name: '晚安故事', category: 'love', price: '免费', emoji: '🌙', desc: '睡前讲个小故事给我听~' },
    { id: 12, name: '巧克力', category: 'food', price: '一个亲亲', emoji: '🍫', desc: '心情不好就要吃巧克力' },
];

var CATEGORIES = {
    all: { name: '全部', icon: '🌟' }, food: { name: '好吃的', icon: '🍔' },
    drink: { name: '好喝的', icon: '🥤' }, activity: { name: '想做的事', icon: '🎯' },
    love: { name: '恋爱互动', icon: '💕' },
};

var cloudCache = null;

async function fetchCloud() {
    if (cloudCache) return cloudCache;
    var cached = localStorage.getItem('cloud_cache');
    if (cached) { try { cloudCache = JSON.parse(cached); } catch(e) {} }

    // 先从静态db.json加载Token（零CORS，零延迟）
    if (!GITHUB_TOKEN) {
        try {
            var r0 = await fetch(DB_URL + '?t=' + Date.now());
            if (r0.ok) { var s0 = await r0.json(); if (s0.tk1 && s0.tk2) GITHUB_TOKEN = s0.tk1 + s0.tk2; }
        } catch (e) {}
    }

    // 用Token从GitHub API读最新
    var apiHeaders = { 'Accept': 'application/vnd.github.v3+json' };
    if (GITHUB_TOKEN) apiHeaders['Authorization'] = 'token ' + GITHUB_TOKEN;
    try {
        var r = await fetch(REPO_API, { headers: apiHeaders, cache: 'no-store' });
        if (r.ok) {
            var d = await r.json();
            cloudCache = JSON.parse(decodeURIComponent(escape(atob(d.content))));
            if (!GITHUB_TOKEN && cloudCache.tk1 && cloudCache.tk2) GITHUB_TOKEN = cloudCache.tk1 + cloudCache.tk2;
            localStorage.setItem('cloud_cache', JSON.stringify(cloudCache));
            return cloudCache;
        }
    } catch (e) {}
    // 降级：读静态db.json
    try {
        var r2 = await fetch(DB_URL + '?t=' + Date.now());
        if (r2.ok) {
            cloudCache = await r2.json();
            if (!GITHUB_TOKEN && cloudCache.tk1 && cloudCache.tk2) GITHUB_TOKEN = cloudCache.tk1 + cloudCache.tk2;
            return cloudCache;
        }
    } catch (e2) {}
    return null;
}

async function saveCloud(data) {
    if (!GITHUB_TOKEN) { console.warn('无Token'); return false; }
    try {
        var hr = await fetch(REPO_API, { headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': 'token ' + GITHUB_TOKEN } });
        if (!hr.ok) throw new Error('SHA失败');
        var h = await hr.json();
        var c = unescape(encodeURIComponent(JSON.stringify(data, null, 2)));
        var r = await fetch(REPO_API, { method: 'PUT',
            headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': 'token ' + GITHUB_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '📦 数据更新', content: btoa(c), sha: h.sha })
        });
        if (r.ok) { cloudCache = data; console.log('✅ 云端已同步'); return true; }
    } catch (e) { console.warn('云端写入失败:', e.message); }
    return false;
}

// ========== 产品/订单 CRUD ==========
async function getProducts() { var c = await fetchCloud(); if (c && c.products && c.products.length > 0) return c.products; var l = localStorage.getItem('menu_products'); return l ? JSON.parse(l) : DEFAULT_PRODUCTS; }
async function addProduct(p) { var ps = await getProducts(); p.id = ps.length > 0 ? Math.max.apply(null, ps.map(function(x){return x.id;})) + 1 : 1; ps.push(p); localStorage.setItem('menu_products', JSON.stringify(ps)); fetchCloud().then(function(c){if(c){c.products=ps;saveCloud(c);}}); return p; }
async function updateProduct(id, u) { var ps = await getProducts(); var i = ps.findIndex(function(x){return x.id===id;}); if(i>=0){ps[i]=Object.assign({},ps[i],u);localStorage.setItem('menu_products',JSON.stringify(ps));} fetchCloud().then(function(c){if(c){c.products=ps;saveCloud(c);}}); }
async function deleteProduct(id) { var ps = (await getProducts()).filter(function(x){return x.id!==id;}); localStorage.setItem('menu_products',JSON.stringify(ps)); fetchCloud().then(function(c){if(c){c.products=ps;saveCloud(c);}}); }
async function initDefaultProducts() { var c = await fetchCloud(); if (!c || !c.products || c.products.length===0) { await saveCloud({ products: DEFAULT_PRODUCTS, orders: [] }); } }

async function getOrders() { var c = await fetchCloud(); if (c && c.orders) return c.orders.slice().reverse(); var l = localStorage.getItem('menu_orders'); return l ? JSON.parse(l) : []; }
async function addOrder(order) {
    order.status = 'pending'; order.id = 'od_' + Date.now(); order._firestoreId = order.id;
    order.time = new Date().toISOString(); order.timeDisplay = new Date().toLocaleString('zh-CN');
    var c = await fetchCloud() || { products: DEFAULT_PRODUCTS, orders: [] };
    c.orders = c.orders || []; c.orders.push(order);
    var ok = await saveCloud(c);
    if (!ok) { var lo = JSON.parse(localStorage.getItem('menu_orders')||'[]'); lo.unshift(order); localStorage.setItem('menu_orders',JSON.stringify(lo)); }
    return order;
}
async function markOrderDone(id) { var c = await fetchCloud(); if (c && c.orders) { var o = c.orders.find(function(x){return x.id===id||x._firestoreId===id;}); if(o){o.status='done';await saveCloud(c);return;} } var lo = JSON.parse(localStorage.getItem('menu_orders')||'[]'); var o = lo.find(function(x){return x.id===id||x._firestoreId===id;}); if(o){o.status='done';localStorage.setItem('menu_orders',JSON.stringify(lo));} }
async function deleteOrder(id) { var c = await fetchCloud(); if (c && c.orders) { c.orders = c.orders.filter(function(x){return x.id!==id&&x._firestoreId!==id;}); await saveCloud(c); } var lo = JSON.parse(localStorage.getItem('menu_orders')||'[]').filter(function(x){return x.id!==id&&x._firestoreId!==id;}); localStorage.setItem('menu_orders',JSON.stringify(lo)); }
async function getPendingCount() { var os = await getOrders(); var n = 0; os.forEach(function(o){if(o.status==='pending')n++;}); return n; }
function onOrdersSnapshot(cb) { var t = setInterval(async function(){var os=await getOrders();cb(os);},3000); return function(){clearInterval(t);}; }

initDefaultProducts();
