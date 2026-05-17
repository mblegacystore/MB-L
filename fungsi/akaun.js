async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        // ✅ PERUBAHAN: guna auth.uid (bukan auth.user.uid)
        currentUser = {
            uid: auth.uid,                          // ← UBAH SINI
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || ""
        };
        
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
}

const saved = localStorage.getItem('currentUser');
if (saved) {
    try {
        currentUser = JSON.parse(saved);
        updateStatus("Welcome back: " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {}
}
