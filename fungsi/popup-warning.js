// ============================================
// POPUP PENGESAHAN SEBELUM BELI PRODUK (U2A) - CUSTOM HITAM-EMAS
// ============================================

window.confirmAndBuy = function(key, amount) {
    if (key === 'echelon' && localStorage.getItem('mb-legacy-bought-echelon') === 'true') {
        showEchelonReport();
        return;
    }
    if (key === 'command' && localStorage.getItem('mb-legacy-bought-command') === 'true') {
        showLockedContent('command');
        return;
    }
    
    var productName = (key === 'echelon') ? 'THE ECHELON BRIEFING PACK' : 'THE COMMAND CENTER SUITE';
    var message = "Are you sure you want to purchase " + productName + " for " + amount + " Pi?\n\nThis is a Testnet transaction. No real Pi will be deducted.";
    
    var existingPopup = document.getElementById('customConfirmPopup');
    if (existingPopup) existingPopup.remove();
    
    var modal = document.createElement('div');
    modal.id = 'customConfirmPopup';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
        <div style="background:#0d0d0d; border:2px solid #FFD700; padding:25px; max-width:320px; width:90%; text-align:center; border-radius:8px;">
            <h3 style="color:#FFD700; margin-bottom:15px;">⚠️ Confirm Purchase</h3>
            <p style="color:#ddd; margin-bottom:20px; line-height:1.5;">${message.replace(/\n/g, '<br>')}</p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="confirmOkBtn" style="background:#FFD700; color:#000; border:none; padding:10px 20px; font-weight:bold; border-radius:4px; cursor:pointer;">✅ OK</button>
                <button id="confirmCancelBtn" style="background:transparent; color:#aaa; border:1px solid #aaa; padding:10px 20px; font-weight:bold; border-radius:4px; cursor:pointer;">❌ Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('confirmOkBtn').addEventListener('click', function() {
        modal.remove();
        buyProduct(key, amount);
    });
    
    document.getElementById('confirmCancelBtn').addEventListener('click', function() {
        modal.remove();
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
};

// ============================================
// POPUP SUCCESS (SELEPAS A2U BERJAYA)
// ============================================

function showSuccessPopup(title, message, buttonText) {
    var existingPopup = document.getElementById('customSuccessPopup');
    if (existingPopup) existingPopup.remove();

    var modal = document.createElement('div');
    modal.id = 'customSuccessPopup';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';

    modal.innerHTML = `
        <div style="background:#0d0d0d; border:2px solid #FFD700; padding:25px; max-width:320px; width:90%; text-align:center; border-radius:8px;">
            <h3 style="color:#FFD700; margin-bottom:15px;">${title}</h3>
            <p style="color:#ddd; margin-bottom:20px; line-height:1.5;">${message}</p>
            <button onclick="this.closest('#customSuccessPopup').remove()" style="background:#FFD700; color:#000; border:none; padding:10px 20px; font-weight:bold; border-radius:4px; cursor:pointer;">${buttonText}</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}
