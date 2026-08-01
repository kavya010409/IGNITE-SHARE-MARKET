/**
 * ApexTrader Virtual Stock Exchange - Client Engine (app.js)
 * Features Real Trader Auth Gateway, Cross-Tab BroadcastChannel News Listener, Persistent Archive Feed, & 2-Minute Shock Anticipation Engine.
 */

const API_BASE_URL = "http://localhost:8000";
const WS_BASE_URL = "ws://localhost:8000";

let authToken = localStorage.getItem("apex_jwt_token") || "";
let traderId = localStorage.getItem("apex_trader_id") || null;
let currentBalance = parseFloat(localStorage.getItem("apex_cash_balance")) || 20000.00;

let stocksMap = new Map();
let prevPricesMap = new Map();
let demoNewsQueue = [];
let selectedTicker = "APEX";
let activeOrderType = "BUY";
let activeAuthMode = "login";
let stockChartInstance = null;
let wsInstance = null;
let isDemoMode = false;
let popupTimer = null;

const newsBroadcastChannel = new BroadcastChannel("apex_market_news");

const INITIAL_STOCKS_DEF = [
    ["APEX", "Apex Dynamics Corp"],
    ["CRPT", "Cryptonix Global Systems"],
    ["METV", "Metaverse Vision Ltd"],
    ["ROBO", "Robotech Automations"],
    ["NVRA", "Nova Era Technologies"],
    ["HYDR", "HydroClean Energy"],
    ["VRTX", "Vortex Aerospace"],
    ["QNTM", "Quantum Computing Labs"],
    ["PLSM", "Plasma Medical Devices"],
    ["ORBT", "Orbital Satellite Networks"],
    ["STRM", "StreamFlow Cloud Services"],
    ["AERO", "Aerovault Logistics"],
    ["SOLR", "Solaria Power Group"],
    ["CELL", "CelluGen BioLabs"],
    ["DATA", "DataSphere Analytics"],
    ["CYBR", "CyberFort Defense Systems"],
    ["GENM", "Genomix Research Inc"],
    ["PHOX", "Phox Photonics Corp"],
    ["NANO", "NanoScale Innovations"],
    ["AURA", "Aura Spatial Tech"],
    ["TITN", "Titan Heavy Machinery"],
    ["SYNX", "Synapse Neural Networks"],
    ["ZEUS", "Zeus Energy Grids"],
    ["LUNA", "Lunar Mining Resources"],
    ["EDGE", "Edge Compute Infrastructure"],
    ["FUSE", "Fusion Nuclear Labs"],
    ["FLUX", "Flux Power Dynamics"],
    ["HELI", "Helios Solar Tech"],
    ["ECHO", "Echo Media Streaming"],
    ["VIRT", "Virtualis Gaming Interactive"]
];

// ============================================================================
// 1. INITIALIZATION & SESSION VALIDATION
// ============================================================================
async function initApp() {
    updateBalanceDisplay(currentBalance);
    setupCrossTabNewsListeners();
    loadArchivedNewsFromStorage();

    if (authToken) {
        showTradingRoom();
        if (authToken.startsWith("demo_")) {
            enableDemoMode(localStorage.getItem("apex_trader_email") || "trader@example.com");
        } else {
            updateStatusBadge("connecting", "Connecting WS Feed...");
            initWebSocketStream();
            await selectStock(selectedTicker);
        }
    } else {
        // Auto-login default session to prevent friction
        enableDemoMode("trader@example.com");
    }
}

function showAuthScreen() {
    document.getElementById("auth-screen")?.classList.remove("hidden");
    document.getElementById("trading-room")?.classList.add("hidden");
}

function showTradingRoom() {
    document.getElementById("auth-screen")?.classList.add("hidden");
    document.getElementById("trading-room")?.classList.remove("hidden");
}

// ============================================================================
// 2. CROSS-TAB NEWS LISTENERS (BroadcastChannel & LocalStorage)
// ============================================================================
function setupCrossTabNewsListeners() {
    newsBroadcastChannel.onmessage = (event) => {
        if (event.data) {
            handleIncomingNewsPacket(event.data);
        }
    };

    window.addEventListener("storage", (e) => {
        if (e.key === "apex_last_news_event" && e.newValue) {
            try {
                handleIncomingNewsPacket(JSON.parse(e.newValue));
            } catch (err) {}
        }
    });
}

function loadArchivedNewsFromStorage() {
    try {
        const archives = JSON.parse(localStorage.getItem("apex_news_archive") || "[]");
        if (archives.length > 0) {
            archives.slice().reverse().forEach((newsItem) => {
                const timeStr = new Date(newsItem.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                appendToNewsArchive(newsItem.headline, newsItem.stock_ticker || newsItem.target || "GLOBAL", newsItem.sentiment_multiplier || 1.0, timeStr);
            });
        }
    } catch (e) {}
}

// ============================================================================
// 3. AUTHENTICATION HANDLERS
// ============================================================================
function setAuthMode(mode) {
    activeAuthMode = mode;
    hideAuthError();

    const loginBtn = document.getElementById("auth-mode-login");
    const regBtn = document.getElementById("auth-mode-register");
    const submitBtn = document.getElementById("auth-submit-btn");
    const bonusNote = document.getElementById("register-bonus-note");

    if (mode === "login") {
        loginBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-darkCard shadow-md border border-darkBorder transition-all";
        regBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all";
        submitBtn.innerText = "Sign In to Portfolio";
        bonusNote?.classList.add("hidden");
    } else {
        regBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-darkCard shadow-md border border-darkBorder transition-all";
        loginBtn.className = "flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all";
        submitBtn.innerText = "Create Account & Get 20,000 IG";
        bonusNote?.classList.remove("hidden");
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    hideAuthError();

    const emailInput = document.getElementById("auth-email-input");
    const passwordInput = document.getElementById("auth-password-input");
    const email = emailInput?.value.trim() || "trader@example.com";
    const password = passwordInput?.value || "password123";

    const endpoint = activeAuthMode === "register" 
        ? `${API_BASE_URL}/api/auth/register` 
        : `${API_BASE_URL}/api/auth/login`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const resp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await resp.json().catch(() => ({}));

        if (resp.ok && data.access_token) {
            authToken = data.access_token;
            traderId = data.trader_id;
            localStorage.setItem("apex_jwt_token", authToken);
            localStorage.setItem("apex_trader_id", traderId);
            localStorage.setItem("apex_trader_email", email);

            showToast(activeAuthMode === "register" ? "Account registered! Received 20,000 IG." : "Signed in successfully.", "success");
            showTradingRoom();
            updateStatusBadge("connecting", "Connecting WS Feed...");
            initWebSocketStream();
            await selectStock(selectedTicker);
            return;
        }

        enableDemoMode(email);

    } catch (err) {
        enableDemoMode(email);
    }
}

function showAuthError(msg) {
    const errorBox = document.getElementById("auth-error-box");
    const errorMsg = document.getElementById("auth-error-msg");
    if (errorMsg) errorMsg.innerText = msg;
    if (errorBox) errorBox.classList.remove("hidden");
}

function hideAuthError() {
    const errorBox = document.getElementById("auth-error-box");
    if (errorBox) errorBox.classList.add("hidden");
}

function fillDemoCredentials() {
    const emailInput = document.getElementById("auth-email-input");
    const passInput = document.getElementById("auth-password-input");
    if (emailInput) emailInput.value = "trader_demo@example.com";
    if (passInput) passInput.value = "Password123!";
    hideAuthError();
}

function logoutTrader() {
    localStorage.clear();
    sessionStorage.clear();
    authToken = "";
    traderId = null;
    currentBalance = 20000.00;
    isDemoMode = false;

    hideAuthError();
    closeBreakingNewsPopup();

    if (wsInstance) {
        try { wsInstance.close(); } catch (e) {}
        wsInstance = null;
    }

    showAuthScreen();
    showToast("Session terminated. All credentials purged.", "info");
}

// ============================================================================
// 4. DEMO ENGINE FALLBACK MODE & 2-MINUTE SHOCK EXECUTION
// ============================================================================
function enableDemoMode(userEmail) {
    isDemoMode = true;
    authToken = `demo_jwt_${userEmail || 'trader'}`;
    traderId = userEmail || "demo_trader";

    localStorage.setItem("apex_jwt_token", authToken);
    localStorage.setItem("apex_trader_id", traderId);
    localStorage.setItem("apex_trader_email", userEmail || "trader@example.com");

    showTradingRoom();
    updateStatusBadge("connected", "Demo Engine Active");

    INITIAL_STOCKS_DEF.forEach(([ticker, name]) => {
        if (!stocksMap.has(ticker)) {
            const initPrice = round(random(2.00, 8.00), 2);
            stocksMap.set(ticker, {
                ticker: ticker,
                name: name,
                current_price: initPrice,
                change_percentage: 0.00
            });
        }
    });

    renderWatchlist(Array.from(stocksMap.values()));
    selectStock(selectedTicker);

    if (!window.demoIntervalStarted) {
        window.demoIntervalStarted = true;
        setInterval(runDemoMarketTick, 3000);
    }
}

function runDemoMarketTick() {
    if (!isDemoMode) return;
    const now = Date.now();
    const updatedList = [];

    stocksMap.forEach((stock) => {
        const oldPrice = stock.current_price;
        let baseNoise = random(-0.008, 0.008);

        // Evaluate queued news 2-minute shock execution rules
        demoNewsQueue.forEach((news) => {
            if (!news.impact_applied) {
                const elapsedSeconds = (now - news.created_at) / 1000;
                if (elapsedSeconds >= 120) { // 2 Minutes Delay
                    if (news.ticker === "GLOBAL" || news.ticker === stock.ticker) {
                        news.impact_applied = true;
                        const shockShift = (news.sentiment_multiplier - 1.0);
                        baseNoise += shockShift;
                        showToast(`💥 2-MINUTE SHOCK EXECUTION: [${stock.ticker}] Realignment Applied (${news.sentiment_multiplier}x)!`, "error");
                    }
                }
            }
        });

        const newPrice = Math.max(0.50, round(oldPrice * (1 + baseNoise), 2));
        const changePct = round(((newPrice - oldPrice) / oldPrice) * 100, 2);

        stock.current_price = newPrice;
        stock.change_percentage = changePct;
        updatedList.push(stock);
    });

    renderWatchlist(updatedList);
}

// ============================================================================
// 5. WEBSOCKET & NEWS PACKET LISTENER
// ============================================================================
function initWebSocketStream() {
    if (isDemoMode || !authToken || authToken.startsWith("demo_")) return;

    const wsUrl = `${WS_BASE_URL}/api/ws/watchlist?token=${authToken}`;
    wsInstance = new WebSocket(wsUrl);

    wsInstance.onopen = () => {
        updateStatusBadge("connected", "Live Feed Active");
    };

    wsInstance.onmessage = (event) => {
        try {
            const payload = JSON.parse(event.data);
            if (payload.event === "market_tick") {
                renderWatchlist(payload.data);
            } else if (payload.type === "news" || payload.event === "news_flash") {
                handleIncomingNewsPacket(payload.data || payload);
            }
        } catch (e) {}
    };

    wsInstance.onclose = () => {
        if (!isDemoMode && authToken && !authToken.startsWith("demo_")) {
            updateStatusBadge("disconnected", "Disconnected");
            setTimeout(initWebSocketStream, 3000);
        }
    };
}

function handleIncomingNewsPacket(newsData) {
    const headline = newsData.headline || "Market Event Dispatched";
    const ticker = newsData.stock_ticker || newsData.target || "GLOBAL";
    const sentiment = parseFloat(newsData.sentiment_multiplier || 1.0);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Queue for 2-minute shock calculation in Demo Engine
    demoNewsQueue.push({
        ticker: ticker,
        sentiment_multiplier: sentiment,
        created_at: Date.now(),
        impact_applied: false
    });

    // 1. Trigger Floating Breaking News Popup (Floats for 15s)
    triggerBreakingNewsPopup(headline, ticker, sentiment);

    // 2. Prepend into Persistent News Archive Feed Container
    appendToNewsArchive(headline, ticker, sentiment, timeStr);
}

function triggerBreakingNewsPopup(headline, ticker, sentiment) {
    const popup = document.getElementById("breaking-news-popup");
    const headlineEl = document.getElementById("breaking-news-popup-headline");
    const subEl = document.getElementById("breaking-news-popup-sub");

    if (!popup || !headlineEl) return;

    headlineEl.innerText = `[${ticker}] ${headline}`;
    if (subEl) subEl.innerText = `Multiplier: ${sentiment}x Impact | 2-Minute Market Realignment Window Active`;

    popup.classList.remove("hidden");

    if (popupTimer) clearTimeout(popupTimer);
    popupTimer = setTimeout(() => {
        closeBreakingNewsPopup();
    }, 15000);
}

function closeBreakingNewsPopup() {
    const popup = document.getElementById("breaking-news-popup");
    if (popup) popup.classList.add("hidden");
}

function appendToNewsArchive(headline, ticker, sentiment, timeStr) {
    const feed = document.getElementById("news-archive-feed");
    if (!feed) return;

    if (feed.children.length === 1 && feed.children[0].innerText.includes("Waiting for live breaking news")) {
        feed.innerHTML = "";
    }

    const isBull = sentiment > 1.0;
    const isBear = sentiment < 1.0;
    const badgeColor = isBull 
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
        : isBear 
        ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
        : "bg-gray-500/10 text-gray-400 border-gray-500/20";

    const item = document.createElement("div");
    item.className = "p-3 rounded-xl bg-darkBg border border-darkBorder flex items-center justify-between text-xs transition-all";
    item.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="font-mono font-bold text-white px-2 py-0.5 rounded bg-darkCard border border-darkBorder">${ticker}</span>
            <span class="font-medium text-gray-200">${headline}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] font-mono font-bold ${badgeColor} px-2 py-0.5 rounded-full border">${sentiment}x</span>
            <span class="text-[10px] text-gray-500 font-mono">${timeStr}</span>
        </div>
    `;

    feed.prepend(item);

    const countEl = document.getElementById("news-feed-count");
    if (countEl) countEl.innerText = `${feed.children.length} Articles Logged`;
}

// ============================================================================
// 6. WATCHLIST RENDERING & PRICE FLASHING
// ============================================================================
function renderWatchlist(stocksArray) {
    const tbody = document.getElementById("watchlist-tbody");
    if (!tbody) return;

    const searchTerm = (document.getElementById("search-input")?.value || "").toLowerCase();
    let rowsHtml = "";

    stocksArray.forEach((stock) => {
        stocksMap.set(stock.ticker, stock);

        if (searchTerm && !stock.ticker.toLowerCase().includes(searchTerm) && !stock.name.toLowerCase().includes(searchTerm)) {
            return;
        }

        const newPrice = parseFloat(stock.current_price);
        const oldPrice = prevPricesMap.get(stock.ticker) || newPrice;
        const isSelected = stock.ticker === selectedTicker;

        let flashStyle = "";
        let changeClass = "text-gray-300";
        let trendSymbol = "►";

        if (newPrice > oldPrice) {
            flashStyle = "price-flash-up";
            changeClass = "text-emerald-400";
            trendSymbol = "▲";
        } else if (newPrice < oldPrice) {
            flashStyle = "price-flash-down";
            changeClass = "text-rose-400";
            trendSymbol = "▼";
        }

        prevPricesMap.set(stock.ticker, newPrice);

        rowsHtml += `
            <tr onclick="selectStock('${stock.ticker}')" 
                class="cursor-pointer transition-colors hover:bg-darkBg ${isSelected ? 'bg-accentBlue/10 border-l-4 border-accentBlue' : ''} ${flashStyle}">
                <td class="py-3.5 px-4 font-bold text-white font-mono">${stock.ticker}</td>
                <td class="py-3.5 px-4 text-gray-300 font-medium">${stock.name}</td>
                <td class="py-3.5 px-4 text-right font-mono font-bold text-white">${newPrice.toFixed(2)} IG</td>
                <td class="py-3.5 px-4 text-right font-mono font-bold ${changeClass}">
                    ${trendSymbol} ${stock.change_percentage >= 0 ? '+' : ''}${stock.change_percentage.toFixed(2)}%
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    if (stocksMap.has(selectedTicker)) {
        updateActiveStockHeader(stocksMap.get(selectedTicker));
    }
}

// ============================================================================
// 7. CHARTING & ANALYTICS
// ============================================================================
async function selectStock(ticker) {
    selectedTicker = ticker;
    const avatar = document.getElementById("selected-symbol-avatar");
    if (avatar) avatar.innerText = ticker;

    if (stocksMap.has(ticker)) {
        updateActiveStockHeader(stocksMap.get(ticker));
    }

    await loadStockAnalytics(ticker);
    updateOrderCalculations();
}

function updateActiveStockHeader(stock) {
    const price = parseFloat(stock.current_price);
    const title = document.getElementById("selected-symbol-title");
    const tickEl = document.getElementById("selected-symbol-ticker");
    const priceEl = document.getElementById("selected-symbol-price");
    const changeEl = document.getElementById("selected-symbol-change");

    if (title) title.innerText = stock.name;
    if (tickEl) tickEl.innerText = `${stock.ticker} / IG`;
    if (priceEl) priceEl.innerText = `${price.toFixed(2)} IG`;

    if (changeEl) {
        changeEl.innerText = `${stock.change_percentage >= 0 ? '+' : ''}${stock.change_percentage.toFixed(2)}%`;
        changeEl.className = `text-xs font-semibold ${stock.change_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
}

async function loadStockAnalytics(ticker) {
    if (isDemoMode || !authToken || authToken.startsWith("demo_")) {
        const history = generateDemoHistory(stocksMap.get(ticker)?.current_price || 5.00);
        renderChart(history);
        return;
    }

    try {
        const resp = await fetch(`${API_BASE_URL}/api/stocks/${ticker}/analytics`);
        if (!resp.ok) throw new Error();
        const analytics = await resp.json();
        renderChart(analytics.history);
    } catch (err) {
        const history = generateDemoHistory(stocksMap.get(ticker)?.current_price || 5.00);
        renderChart(history);
    }
}

function generateDemoHistory(currentPrice) {
    const points = [];
    let price = currentPrice;
    const now = Date.now();
    for (let i = 30; i >= 0; i--) {
        const time = new Date(now - i * 86400000).toISOString();
        points.push({ closing_price: round(price, 2), recorded_at: time });
        price = Math.max(1.50, price * (1 + random(-0.03, 0.03)));
    }
    return points;
}

function renderChart(historyPoints) {
    const ctx = document.getElementById("stockChart")?.getContext("2d");
    if (!ctx) return;

    const labels = historyPoints.map((p) =>
        new Date(p.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    );
    const data = historyPoints.map((p) => p.closing_price);

    if (stockChartInstance) {
        stockChartInstance.destroy();
    }

    stockChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Closing Price (IG)",
                    data: data,
                    borderColor: "#2962ff",
                    backgroundColor: "rgba(41, 98, 255, 0.1)",
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#6b7280", font: { size: 10 } } },
                y: { grid: { color: "#232936" }, ticks: { color: "#6b7280", font: { size: 10 } } },
            },
        },
    });
}

// ============================================================================
// 8. ATOMIC TRADE EXECUTION
// ============================================================================
async function executeTradeOrder() {
    const qty = parseInt(document.getElementById("order-qty-input").value) || 1;
    const stock = stocksMap.get(selectedTicker);
    const price = stock ? stock.current_price : 5.0;
    const totalCost = price * qty;

    if (isDemoMode || !authToken || authToken.startsWith("demo_")) {
        if (activeOrderType === "BUY") {
            if (currentBalance < totalCost) {
                showToast("Insufficient balance for this order.", "error");
                return;
            }
            currentBalance -= totalCost;
            showToast(`BUY Order Executed: ${qty} ${selectedTicker} shares @ ${price.toFixed(2)} IG!`, "success");
        } else {
            currentBalance += totalCost;
            showToast(`SELL Order Executed: ${qty} ${selectedTicker} shares @ ${price.toFixed(2)} IG!`, "success");
        }

        localStorage.setItem("apex_cash_balance", currentBalance.toString());
        updateBalanceDisplay(currentBalance);
        updateOrderCalculations();
        return;
    }

    const endpoint = activeOrderType === "BUY" ? `${API_BASE_URL}/api/trade/buy` : `${API_BASE_URL}/api/trade/sell`;

    try {
        const resp = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`,
            },
            body: JSON.stringify({ ticker: selectedTicker, quantity: qty }),
        });

        const result = await resp.json();

        if (!resp.ok) {
            showToast(result.detail || "Order execution failed.", "error");
            return;
        }

        currentBalance = result.remaining_cash;
        localStorage.setItem("apex_cash_balance", currentBalance.toString());
        updateBalanceDisplay(currentBalance);

        showToast(
            `Executed ${result.order_type} for ${result.quantity} ${result.ticker} @ ${result.executed_price.toFixed(2)} IG!`,
            "success"
        );
        updateOrderCalculations();

    } catch (err) {
        showToast("Network error executing order.", "error");
    }
}

// HELPERS
function updateBalanceDisplay(amount) {
    const el = document.getElementById("trader-balance");
    if (el) el.innerText = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setOrderAction(action) {
    activeOrderType = action;
    const buyBtn = document.getElementById("action-buy-btn");
    const sellBtn = document.getElementById("action-sell-btn");
    const submitBtn = document.getElementById("submit-order-btn");

    if (action === "BUY") {
        buyBtn.className = "py-2.5 rounded-xl font-bold text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg";
        sellBtn.className = "py-2.5 rounded-xl font-semibold text-xs bg-darkBg text-gray-400 border border-darkBorder hover:text-white";
        submitBtn.className = "w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 hover:opacity-95 transition-all mt-6";
        submitBtn.innerText = "Confirm & Place Buy Order";
    } else {
        sellBtn.className = "py-2.5 rounded-xl font-bold text-xs bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-lg";
        buyBtn.className = "py-2.5 rounded-xl font-semibold text-xs bg-darkBg text-gray-400 border border-darkBorder hover:text-white";
        submitBtn.className = "w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-xl shadow-rose-500/20 hover:opacity-95 transition-all mt-6";
        submitBtn.innerText = "Confirm & Place Sell Order";
    }

    updateOrderCalculations();
}

function updateOrderCalculations() {
    const stock = stocksMap.get(selectedTicker);
    const price = stock ? parseFloat(stock.current_price) : 0;
    const qty = parseInt(document.getElementById("order-qty-input")?.value) || 0;
    const total = price * qty;

    const execEl = document.getElementById("calc-exec-price");
    const totalEl = document.getElementById("calc-total-amount");
    const remEl = document.getElementById("calc-remaining-cash");

    if (execEl) execEl.innerText = `${price.toFixed(2)} IG`;
    if (totalEl) totalEl.innerText = `${total.toFixed(2)} IG`;

    const remaining = activeOrderType === "BUY" ? (currentBalance - total) : (currentBalance + total);
    if (remEl) remEl.innerText = `${remaining.toFixed(2)} IG`;
}

function adjustQuantity(delta) {
    const input = document.getElementById("order-qty-input");
    const val = Math.max(1, (parseInt(input.value) || 1) + delta);
    input.value = val;
    updateOrderCalculations();
}

function switchTab(tab) {
    const chartBtn = document.getElementById("tab-chart-btn");
    const orderBtn = document.getElementById("tab-order-btn");
    const chartContent = document.getElementById("tab-chart-content");
    const orderContent = document.getElementById("tab-order-content");

    if (tab === "chart") {
        chartBtn.className = "flex-1 py-2 rounded-lg text-xs font-bold text-white bg-darkCard shadow-md border border-darkBorder transition-all flex items-center justify-center gap-2";
        orderBtn.className = "flex-1 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2";
        chartContent.classList.remove("hidden");
        orderContent.classList.add("hidden");
    } else {
        orderBtn.className = "flex-1 py-2 rounded-lg text-xs font-bold text-white bg-darkCard shadow-md border border-darkBorder transition-all flex items-center justify-center gap-2";
        chartBtn.className = "flex-1 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2";
        orderContent.classList.remove("hidden");
        chartContent.classList.add("hidden");
    }
}

function updateStatusBadge(state, message) {
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");
    if (text) text.innerText = message;

    if (dot) {
        dot.className = "w-2.5 h-2.5 rounded-full ";
        if (state === "connected") {
            dot.className += "bg-emerald-500 shadow-lg shadow-emerald-500/50";
        } else if (state === "connecting") {
            dot.className += "bg-yellow-500 animate-pulse";
        } else {
            dot.className += "bg-rose-500";
        }
    }
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const bgClass = type === "success" ? "bg-emerald-500 text-white" : type === "error" ? "bg-rose-500 text-white shadow-rose-500/30" : "bg-accentBlue text-white";

    toast.className = `${bgClass} px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 transition-all transform scale-100`;
    toast.innerText = message;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function round(val, decimals) {
    return Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);
}

document.getElementById("search-input")?.addEventListener("input", () => {
    if (stocksMap.size > 0) {
        renderWatchlist(Array.from(stocksMap.values()));
    }
});

window.addEventListener("DOMContentLoaded", initApp);
