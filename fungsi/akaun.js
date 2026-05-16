let currentUser = null;

async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        // ✅ PERUBAHAN HANYA DI SINI: guna auth.uid (bukan auth.user.uid)
        currentUser = {
            uid: auth.uid,
            username: auth.username,
            wallet_address: auth.wallet_address || ""
        };
        
        // 🔥 PULIHKAN STATUS PEMBELIAN DARI localStorage
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
            }
