/**
 * Squoosh.online — Internationalization (i18n) System
 * Browser-based detection + localStorage persistence + URL param override
 * RTL support for Arabic | hreflang updates | dynamic locale loading
 */
(function () {
  'use strict';

  var CONFIG = {
    defaultLocale: 'en',
    supportedLocales: ['en','es','fr','de','pt','ar','id','vi','th','hi','ja','ko','ru','it'],
    rtlLocales: ['ar'],
    localesPath: '/assets/locales/',
    storageKey: 'squoosh_lang',
    paramName: 'lang',
    cookieConsentKey: 'squoosh_cc',
    domain: 'squoosh.online',
    pageKey: '' // set per-page
  };

  var NATIVE_NAMES = {
    en:'English',es:'Español',fr:'Français',de:'Deutsch',pt:'Português',
    ar:'العربية',id:'Bahasa Indonesia',vi:'Tiếng Việt',th:'ภาษาไทย',
    hi:'हिन्दी',ja:'日本語',ko:'한국어',ru:'Русский',it:'Italiano'
  };

  var currentLocale = CONFIG.defaultLocale;
  var translations = {};

  // Detect language from URL > localStorage > browser
  function detectLanguage() {
    var p = new URLSearchParams(window.location.search);
    var u = p.get(CONFIG.paramName);
    if (u && CONFIG.supportedLocales.indexOf(u) !== -1) return u;
    try {
      var s = localStorage.getItem(CONFIG.storageKey);
      if (s && CONFIG.supportedLocales.indexOf(s) !== -1) return s;
    } catch(e){}
    var b = (navigator.language || '').split('-')[0];
    if (CONFIG.supportedLocales.indexOf(b) !== -1) return b;
    return CONFIG.defaultLocale;
  }

  function loadLocale(locale) {
    return fetch(CONFIG.localesPath + locale + '.json')
      .then(function(r){ if(!r.ok) throw Error('HTTP '+r.status); return r.json(); })
      .catch(function(err){
        console.warn('[i18n] Failed to load "'+locale+'", falling back to en.');
        if (locale !== CONFIG.defaultLocale) return loadLocale(CONFIG.defaultLocale);
        return {};
      });
  }

  function t(key, fallback) {
    if (translations[key] !== undefined) return translations[key];
    return fallback !== undefined ? fallback : key;
  }

  function setRTL(locale) {
    if (CONFIG.rtlLocales.indexOf(locale) !== -1) {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.removeAttribute('dir');
    }
  }

  function updateHreflang(locale) {
    var head = document.head;
    // Remove old alternates
    var old = head.querySelectorAll('link[rel="alternate"][hreflang]');
    for (var i=0; i<old.length; i++) old[i].remove();
    // Add for all supported locales
    var path = window.location.pathname;
    CONFIG.supportedLocales.forEach(function(l){
      var link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = l;
      link.href = 'https://' + CONFIG.domain + path + '?lang=' + l;
      head.appendChild(link);
    });
    // Add x-default
    var xd = document.createElement('link');
    xd.rel = 'alternate'; xd.hreflang = 'x-default';
    xd.href = 'https://' + CONFIG.domain + path;
    head.appendChild(xd);
    // Update canonical
    var can = head.querySelector('link[rel="canonical"]');
    if (can) can.href = 'https://' + CONFIG.domain + path + (locale !== CONFIG.defaultLocale ? '?lang=' + locale : '');
  }

  function updatePageElements() {
    document.documentElement.setAttribute('lang', currentLocale);
    setRTL(currentLocale);
    updateHreflang(currentLocale);
    // Title
    if (translations.page_title) document.title = translations.page_title;
    // Meta description
    var md = document.querySelector('meta[name="description"]');
    if (md && translations.page_description) md.setAttribute('content', translations.page_description);
    // All data-i18n elements
    var els = document.querySelectorAll('[data-i18n]');
    for (var i=0; i<els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      if (attr) {
        el.setAttribute(attr, t(key) || '');
      } else {
        el.textContent = t(key) || el.textContent;
      }
    }
    // Placeholders
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j=0; j<placeholders.length; j++) {
      var pl = placeholders[j];
      pl.setAttribute('placeholder', t(pl.getAttribute('data-i18n-placeholder')) || '');
    }
    // OG tags
    var ogt = document.querySelector('meta[property="og:title"]');
    if (ogt && translations.page_title) ogt.setAttribute('content', translations.page_title);
    var ogd = document.querySelector('meta[property="og:description"]');
    if (ogd && translations.page_description) ogd.setAttribute('content', translations.page_description);
    // Twitter
    var tt = document.querySelector('meta[name="twitter:title"]');
    if (tt && translations.page_title) tt.setAttribute('content', translations.page_title);
    var td = document.querySelector('meta[name="twitter:description"]');
    if (td && translations.page_description) td.setAttribute('content', translations.page_description);
  }

  function buildSwitcherUI(containerId, theme) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    var isDark = (theme === 'dark');
    var textColor = isDark ? '#cbd5e1' : '#475569';
    var bgHover = isDark ? '#334155' : '#f1f5f9';
    var borderColor = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.25)';
    var dropBg = isDark ? '#1e293b' : '#ffffff';
    var dropBorder = isDark ? '#334155' : '#e2e8f0';
    var dropShadow = isDark ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.1)';

    var wrapper = document.createElement('div');
    wrapper.className = 'lang-switcher-wrapper';
    wrapper.style.cssText = 'position:relative;display:inline-block;';
    var btn = document.createElement('button');
    btn.className = 'lang-switcher-btn';
    btn.setAttribute('aria-label', 'Change language');
    btn.style.cssText = 'display:flex;align-items:center;gap:4px;padding:6px 10px;border-radius:8px;border:1px solid '+borderColor+';background:transparent;color:'+textColor+';font-size:13px;cursor:pointer;font-family:inherit;transition:all 0.15s;';
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg><span>' + (NATIVE_NAMES[currentLocale] || currentLocale) + '</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    var dropdown = document.createElement('div');
    dropdown.className = 'lang-switcher-dropdown';
    dropdown.style.cssText = 'display:none;position:absolute;top:100%;right:0;margin-top:4px;background:'+dropBg+';border:1px solid '+dropBorder+';border-radius:10px;box-shadow:'+dropShadow+';z-index:1000;min-width:180px;max-height:320px;overflow-y:auto;padding:4px;';
    // Build language list
    CONFIG.supportedLocales.forEach(function(l){
      var isCurrent = l === currentLocale;
      var item = document.createElement('button');
      item.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;background:'+(isCurrent?'#2563eb15':'transparent')+';color:'+(isCurrent?'#2563eb':textColor)+';font-size:13px;cursor:pointer;border-radius:6px;font-family:inherit;text-align:left;transition:background 0.1s;';
      item.innerHTML = '<span style="font-size:12px;opacity:0.6;width:20px;">'+l.toUpperCase()+'</span>'+NATIVE_NAMES[l];
      item.addEventListener('mouseenter',function(){this.style.background=bgHover;});
      item.addEventListener('mouseleave',function(){this.style.background=isCurrent?'#2563eb15':'transparent';});
      item.addEventListener('click',function(e){
        e.stopPropagation();
        switchLanguage(l);
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(item);
    });
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click',function(){ dropdown.style.display = 'none'; });
    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    container.appendChild(wrapper);
  }

  function buildLanguageSwitcher() {
    // Desktop switcher — dark theme (for slate-900 nav bars)
    buildSwitcherUI('lang-switcher', 'dark');
    // Mobile switcher — also dark theme (inside mobile drawer)
    buildSwitcherUI('lang-switcher-mobile', 'dark');
    // Light theme containers (for light-background navs like tools pages)
    buildSwitcherUI('lang-switcher-light', 'light');
    buildSwitcherUI('lang-switcher-light-mobile', 'light');
  }

  function switchLanguage(locale) {
    if (locale === currentLocale) return;
    currentLocale = locale;
    try { localStorage.setItem(CONFIG.storageKey, locale); } catch(e){}
    loadLocale(locale).then(function(data){
      translations = data;
      buildLanguageSwitcher();
      updatePageElements();
      // Dispatch event for page-specific listeners
      document.dispatchEvent(new CustomEvent('i18n:loaded', { detail: { locale: locale, translations: data } }));
    });
    // Update URL without reload
    var url = new URL(window.location.href);
    url.searchParams.set(CONFIG.paramName, locale);
    window.history.replaceState({}, '', url.toString());
  }

  function initCookieConsent() {
    if (document.getElementById('cookie-banner')) return;
    try {
      if (localStorage.getItem(CONFIG.cookieConsentKey)) return;
    } catch(e){ return; }
    var banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#0f172a;border-top:1px solid #1e293b;z-index:9999;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:13px;color:#cbd5e1;font-family:inherit;';
    banner.innerHTML = '<span>'+t('cookie_text','This website uses cookies for analytics and to improve your experience.')+'</span><div style="display:flex;gap:8px;"><button id="cookie-decline" style="padding:6px 16px;border:1px solid #475569;border-radius:8px;background:transparent;color:#cbd5e1;cursor:pointer;font-family:inherit;font-size:13px;">'+t('cookie_decline','Decline')+'</button><button id="cookie-accept" style="padding:6px 16px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;">'+t('cookie_accept','Accept')+'</button></div>';
    document.body.appendChild(banner);
    document.getElementById('cookie-accept').addEventListener('click',function(){
      try { localStorage.setItem(CONFIG.cookieConsentKey,'1'); } catch(e){}
      banner.remove();
      document.dispatchEvent(new Event('cookies:accepted'));
    });
    document.getElementById('cookie-decline').addEventListener('click',function(){
      try { localStorage.setItem(CONFIG.cookieConsentKey,'0'); } catch(e){}
      banner.remove();
      document.dispatchEvent(new Event('cookies:declined'));
    });
  }

  // ─── Initialize ──────────────────────────────────────────────────
  var detected = detectLanguage();
  currentLocale = detected;

  loadLocale(detected).then(function(data){
    translations = data;
    isLoaded = true;
    updatePageElements();
    buildLanguageSwitcher();
    setTimeout(initCookieConsent, 1500);
    // Expose for inline scripts
    window.__i18n = { t: t, currentLocale: currentLocale, translations: translations, switchLanguage: switchLanguage };
    document.dispatchEvent(new CustomEvent('i18n:ready', { detail: { locale: currentLocale, translations: data } }));
  });

  window.t = t;
  window.switchLanguage = switchLanguage;
  window.getCurrentLocale = function(){ return currentLocale; };

})();
