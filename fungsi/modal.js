// fungsi/modal.js – Versi Dikemaskini untuk Menyokong Folder 1pi/

function getContent(lang) {
    if (lang === 'ms' && typeof PRODUCT_CONTENT_MS !== 'undefined') return PRODUCT_CONTENT_MS;
    if (lang === 'id' && typeof PRODUCT_CONTENT_ID !== 'undefined') return PRODUCT_CONTENT_ID;
    if (lang === 'zh' && typeof PRODUCT_CONTENT_ZH !== 'undefined') return PRODUCT_CONTENT_ZH;
    if (lang === 'ar' && typeof PRODUCT_CONTENT_AR !== 'undefined') return PRODUCT_CONTENT_AR;
    return PRODUCT_CONTENT_EN;
}

function get1PiContent(lang) {
    if (lang === 'ms' && typeof PRODUCT_1PI_MS !== 'undefined') return PRODUCT_1PI_MS;
    if (lang === 'id' && typeof PRODUCT_1PI_ID !== 'undefined') return PRODUCT_1PI_ID;
    if (lang === 'zh' && typeof PRODUCT_1PI_ZH !== 'undefined') return PRODUCT_1PI_ZH;
    if (lang === 'ar' && typeof PRODUCT_1PI_AR !== 'undefined') return PRODUCT_1PI_AR;
    return PRODUCT_1PI_EN;
}

function bukaModal(title, content, lang) {
    const closeText = { ms: 'TUTUP', id: 'TUTUP', zh: '关闭', ar: 'إغلاق' };
    const html = '<h3 style="color:#FFD700;text-align:center;">' + title + '</h3>' + content +
        '<br><button onclick="document.getElementById(\'productModal\').style.display=\'none\'" style="padding:12px 25px;background:transparent;border:1px solid #E74C3C;color:#E74C3C;cursor:pointer;font-weight:bold;display:block;margin:15px auto 0;">' + (closeText[lang] || 'CLOSE') + '</button>';
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('productModal').style.display = 'flex';
}

function showFreeContent() {
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'en';
    const data = getContent(lang).free;
    bukaModal(data.title, data.content, lang);
}

function showEchelonReport() {
    const lang = (typeof currentLang !== 'undefined') ? currentLang : 'en';
    const data = get1PiContent(lang);
    bukaModal(data.title, data.content, lang);
}

function showLockedContent(type) {
    if (type === 'command') {
        const lang = (typeof currentLang !== 'undefined') ? currentLang : 'en';
        const data = getContent(lang).command;
        bukaModal(data.title, data.content, lang);
    }
}

document.addEventListener('click', function(e) {
    if (e.target.id === 'productModal') {
        document.getElementById('productModal').style.display = 'none';
    }
});
