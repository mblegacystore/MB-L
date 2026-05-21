// ========== PEMBOLEH UBAH GLOBAL ==========
let currentUser = null;
let pendingIncompleteCount = 0;

function updateStatus(msg) {
    const el = document.getElementById("stSticky");
    if (el) el.textContent = msg;
}

function tryEnablePaymentButtons() {
    const btn1 = document.getElementById("btn-pay1");
    const btn10 = document.getElementById("btn-pay10");
    if (currentUser && pendingIncompleteCount === 0) {
        if (btn1) btn1.disabled = false;
        if (btn10) btn10.disabled = false;
    }
}

function copySOP() {
    const sop = document.getElementById("sop-text");
    if (!sop) return;
    navigator.clipboard.writeText(sop.textContent).then(function() {
        updateStatus("SOP disalin!");
    }).catch(function() {
        updateStatus("Gagal salin SOP.");
    });
}

// ========== PEMBERSIHAN AWAL (U2A) ==========
async function onIncompletePaymentFound(payment) {
    console.log("DEBUG [onIncompletePaymentFound] Payment ID:", payment.identifier);
    updateStatus("Menyelesaikan pembayaran tertunda...");
    pendingIncompleteCount++;
    try {
        let res = await fetch("/api/cuci.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: payment.identifier })
        });
        let data = await res.json();
        pendingIncompleteCount--;
        if (data.success) {
            updateStatus("Selesai");
            tryEnablePaymentButtons();
            return { status: "COMPLETED" };
        }
        updateStatus("Dibersihkan");
        tryEnablePaymentButtons();
        return { status: "CANCELLED" };
    } catch (e) {
        pendingIncompleteCount--;
        updateStatus("Dibersihkan");
        tryEnablePaymentButtons();
        return { status: "CANCELLED" };
    }
}

async function bersihkanSebelumBayar() {
    try {
        const payments = await Pi.getIncompletePayments();
        if (payments && payments.length > 0) {
            updateStatus("Membersihkan transaksi terdahulu...");
            for (let p of payments) {
                await fetch("/api/cuci.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: p.identifier })
                });
            }
            updateStatus("Sedia untuk pembayaran baru.");
        }
    } catch (e) {
        console.error("DEBUG [bersihkanSebelumBayar] Error:", e.message);
    }
}

// ========== U2A: BELI PRODUK (TIDAK DIUBAH) ==========
async function buyProduct(key, amount) {
    if (!currentUser) { 
        updateStatus("Sila login dahulu.");
        return; 
    }
    
    if (key === "echelon" && localStorage.getItem('mb-legacy-bought-echelon') === 'true') {
        if (typeof showEchelonReport === 'function') showEchelonReport();
        return;
    }
    if (key === "command" && localStorage.getItem('mb-legacy-bought-command') === 'true') {
        if (typeof showLockedContent === 'function') showLockedContent('command');
        return;
    }
    
    let total = parseFloat(amount).toFixed(7);
    updateStatus("Membayar " + total + " Pi...");
    
    Pi.createPayment(
        { amount: parseFloat(total), memo: "MBL Store", metadata: { product: key } },
        {
            onIncompletePaymentFound: onIncompletePaymentFound,
            onReadyForServerApproval: function(id) {
                fetch("/api/bayar-sah.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: id })
                });
            },
            onReadyForServerCompletion: function(id, txid) {
                fetch("/api/bayar-selesai.js", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ paymentId: id, txid: txid })
                }).then(function() {
                    updateStatus("Berjaya!");
                    if (key === "echelon") {
                        localStorage.setItem('mb-legacy-bought-echelon', 'true');
                        currentUser.boughtEchelon = true;
                        if (typeof showEchelonReport === 'function') showEchelonReport();
                    }
                    if (key === "command") {
                        localStorage.setItem('mb-legacy-bought-command', 'true');
                        currentUser.boughtCommand = true;
                        if (typeof showLockedContent === 'function') showLockedContent("command");
                    }
                }).catch(async function() {
                    await fetch("/api/cuci.js", { 
                        method: "POST", 
                        headers: { "Content-Type": "application/json" }, 
                        body: JSON.stringify({ paymentId: id, txid: txid }) 
                    });
                    updateStatus("Pulih!");
                });
            },
            onCancel: function() { updateStatus("Dibatalkan"); },
            onError: function(e) { updateStatus("Ralat: " + e.message); }
        }
    );
}

// ====================================================================
//              A2U: CLAIM REWARD / PAYOUT (RINGKAS + COOLDOWN 5 MINIT)
// ====================================================================

async function requestPayout() {
    console.log("🔥 requestPayout() DIPANGGIL");

    // 1. Check login
    if (!currentUser) {
        console.log("❌ currentUser null. Perlu login.");
        updateStatus("Sila login dahulu.");
        return;
    }

    // 2. Check cooldown 5 minit (300,000 ms)
    const COOLDOWN_MS = 300000; // 5 minit
    const lastClaim = localStorage.getItem('mb-legacy-last-payout');
    
    if (lastClaim) {
        const elapsed = Date.now() - parseInt(lastClaim);
        if (elapsed < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
            console.log("⏳ Cooldown. Baki:", remaining, "minit");
            updateStatus("Sila tunggu " + remaining + " minit lagi.");
            return;
        }
    }

    console.log("✅ Tiada cooldown. UID:", currentUser.uid);
    updateStatus("Memproses ganjaran...");

    try {
        const response = await fetch("/api/bayar-keluar.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                uid: currentUser.uid,
                amount: 0.1,
                accessToken: currentUser.accessToken,
                metadata: { source: "claim_reward", timestamp: Date.now() }
            })
        });

        const result = await response.json();
        console.log("📡 Response:", result);

        if (result.success) {
            // Simpan timestamp claim
            localStorage.setItem('mb-legacy-last-payout', Date.now().toString());
            
            updateStatus("✅ 0.1 Pi dihantar!");
            console.log("✅ Payout berjaya. Cooldown 5 minit bermula.");
            
            if (typeof showSuccessPopup === 'function') {
                showSuccessPopup("✅ REWARD RECEIVED!", "0.1 Test-Pi sent to your wallet.", "OK");
            }
        } else {
            updateStatus("❌ Gagal: " + (result.error || "Sila cuba lagi."));
        }
    } catch (error) {
        console.error("❌ Error:", error.message);
        updateStatus("⚠️ Rangkaian error. Sila cuba lagi.");
    }
}

// ========== AUTENTIKASI (TIDAK DIUBAH) ==========
async function doLogin(isSilent = false) {
    if (!isSilent) updateStatus("Menyambung...");
    
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        currentUser = {
            uid: auth.user.uid,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || "",
            accessToken: auth.accessToken
        };
        
        const userData = { ...currentUser, timestamp: Date.now() };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
        console.log("✅ Sesi aktif. UID:", currentUser.uid);
        
    } catch (e) {
        console.error("❌ Autentikasi gagal:", e);
        if (!isSilent) {
            updateStatus("Login gagal: " + e.message);
        } else {
            document.getElementById("btn-login").style.display = "block";
            updateStatus("Sila login semula");
        }
    }
}

async function restoreSession() {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return;
    
    try {
        const userData = JSON.parse(saved);
        
        currentUser = {
            uid: userData.uid,
            username: userData.username,
            wallet_address: userData.wallet_address || "",
            accessToken: userData.accessToken
        };
        
        updateStatus("Welcome back: " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
        await doLogin(true);
        
    } catch (e) {
        console.error("❌ Gagal pulih sesi:", e);
        localStorage.removeItem('currentUser');
        currentUser = null;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSession);
} else {
    restoreSession();
}
