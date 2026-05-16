// ========== AKAUN GLOBAL ==========
let currentUser = null;

// ========== LOGIN ==========
async function doLogin() {
    // Gunakan alert sementara untuk debug (elak ralat updateStatus)
    alert("Login started...");
    
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        alert("Login success! UID: " + auth.uid);
        
        currentUser = {
            uid: auth.uid,
            username: auth.username,
            wallet_address: auth.wallet_address || ""
        };
        
        // Simpan ke localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Sembunyikan butang login
        const loginBtn = document.getElementById("btn-login");
        if (loginBtn) loginBtn.style.display = "none";
        
        // Update status jika fungsi wujud
        if (typeof updateStatus === 'function') {
            updateStatus("Logged in as: " + currentUser.username);
        }
        
        // Aktifkan butang bayar jika fungsi wujud
        if (typeof tryEnablePaymentButtons === 'function') {
            tryEnablePaymentButtons();
        }
        
        alert("Login completed!");
        
    } catch (e) {
        alert("Login error: " + e.message);
        if (typeof updateStatus === 'function') {
            updateStatus("Login gagal: " + e.message);
        }
    }
}

// ========== RESTORE SESSION ==========
const saved = localStorage.getItem('currentUser');
if (saved) {
    try {
        currentUser = JSON.parse(saved);
        if (typeof updateStatus === 'function') {
            updateStatus("Welcome back: " + currentUser.username);
        }
        const loginBtn = document.getElementById("btn-login");
        if (loginBtn) loginBtn.style.display = "none";
        if (typeof tryEnablePaymentButtons === 'function') {
            tryEnablePaymentButtons();
        }
    } catch (e) {}
}
