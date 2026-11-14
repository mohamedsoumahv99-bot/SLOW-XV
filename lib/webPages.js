function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function sharedStyles() {
    return `
      :root{color-scheme:dark;--bg:#08051a;--panel:#17132b;--line:rgba(219,210,255,.2);--text:#f7f5ff;--muted:#b7b0ca;--purple:#7c3aed;--blue:#3b82f6;--red:#ff9aa8}
      *{box-sizing:border-box}html{min-height:100%;background:var(--bg)}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 15% 0%,#401286 0,transparent 42%),radial-gradient(ellipse at 90% 38%,#123e87 0,transparent 38%),linear-gradient(145deg,#0b061d,#071128 70%,#0a0820);color:var(--text);font:16px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      [hidden]{display:none!important}a{color:#c5b5ff}button,input{font:inherit}button,a{ -webkit-tap-highlight-color:transparent}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #b69cff;outline-offset:3px}
      .site-header{position:fixed;inset:0 0 auto;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px max(16px,calc((100vw - 920px)/2));border-bottom:1px solid rgba(255,255,255,.1);background:rgba(10,7,25,.76);backdrop-filter:blur(18px)}
      .site-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-size:1rem;font-weight:850;letter-spacing:.08em}
      .site-brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(140deg,var(--purple),var(--blue));box-shadow:0 7px 22px #622ce966;color:white;font-size:.8rem}
      .admin-link{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:7px 12px;background:rgba(255,255,255,.07);color:#f4f1ff;text-decoration:none;font-size:.82rem;font-weight:700}
      .admin-link:hover{background:rgba(255,255,255,.13)}.page-shell{width:min(920px,calc(100% - 30px));margin:0 auto;padding:96px 0 38px}
      .wizard{max-width:520px}.step-counter{width:max-content;margin:5px auto 14px;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:5px 13px;background:rgba(255,255,255,.09);color:#d7c8ff;font-size:.78rem;font-weight:750;letter-spacing:.04em}
      .glass-card,.card{border:1px solid var(--line);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.055));box-shadow:0 24px 80px #02010b88,inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(20px)}
      .glass-card{padding:clamp(22px,5vw,34px);text-align:center}.glass-card h1{margin:10px 0 9px;font-size:clamp(1.75rem,6vw,2.35rem);line-height:1.1;letter-spacing:-.045em}.glass-card h2,.card h2{margin:0 0 10px;font-size:1.25rem;line-height:1.2}.glass-card p,.card p{color:var(--muted);margin:.5rem 0 1rem}
      .hero-symbol,.pair-mark{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 13px;border:1px solid #c7b5ff55;border-radius:18px;background:linear-gradient(145deg,#7c3aed,#4937be);box-shadow:0 12px 34px #6032cf66;color:white;font-size:1.55rem;font-weight:850}
      .button{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:49px;margin-top:12px;border:1px solid transparent;border-radius:14px;padding:12px 16px;background:linear-gradient(110deg,var(--purple),var(--blue));box-shadow:0 10px 30px #3c32b744;color:white;text-decoration:none;font-weight:800;cursor:pointer;transition:filter .16s,transform .16s}
      .button:hover{filter:brightness(1.12);transform:translateY(-1px)}.button:disabled{opacity:.45;cursor:not-allowed;transform:none}.button-secondary{border-color:rgba(255,255,255,.24);background:rgba(255,255,255,.055);box-shadow:none;color:#f4f1ff}
      .button-danger{border-color:#874751;background:rgba(90,27,38,.3);box-shadow:none;color:#ffdfe4}.button-compact{width:auto;min-width:110px}.button-row{display:flex;gap:10px;margin-top:14px}.button-row>*{flex:1}
      .tiny{font-size:.79rem}.muted{color:var(--muted)}.error{min-height:1.25em;color:var(--red);font-size:.84rem}.success{color:#a9ffdb!important}
      .emoji-grid{display:grid;grid-template-columns:repeat(4,minmax(58px,1fr));gap:12px;max-width:370px;margin:23px auto 14px}
      .emoji-tile{position:relative;display:grid;place-items:center;aspect-ratio:1;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:rgba(255,255,255,.085);color:white;font-size:clamp(1.8rem,9vw,2.65rem);cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s,background .15s}
      .emoji-tile:hover{transform:translateY(-2px)}.emoji-tile[aria-pressed=true]{border:2px solid #b694ff;background:rgba(124,58,237,.28);box-shadow:0 0 0 4px #935cff2e,0 0 24px #8f55ff77}
      .emoji-check{position:absolute;top:-3px;right:-3px;display:grid;place-items:center;width:25px;height:25px;border:2px solid #e8ddff;border-radius:50%;background:linear-gradient(140deg,#a855f7,#6366f1);color:white;font-size:.82rem;font-weight:900;opacity:0;transform:scale(.7);transition:opacity .15s,transform .15s}
      .emoji-tile[aria-pressed=true] .emoji-check{opacity:1;transform:scale(1)}
      .selection-count{margin:4px 0 0!important;color:#e1d8ff!important;font-size:.86rem;font-weight:700}.default-emojis{margin:3px 0 0!important;font-size:.78rem}
      .automation-card{display:flex;align-items:flex-start;gap:12px;margin:19px 0 0;padding:14px;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(7,7,23,.22);text-align:left}
      .switch{position:relative;flex:none;width:47px;height:27px;margin-top:2px;border:0;border-radius:999px;background:#554d69;cursor:pointer;transition:background .16s}
      .switch:after{content:"";position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;background:white;transition:transform .16s}
      .switch[aria-checked=true]{background:linear-gradient(100deg,var(--purple),var(--blue))}.switch[aria-checked=true]:after{transform:translateX(20px)}
      .automation-copy{flex:1}.automation-copy strong{display:block;font-size:.89rem;line-height:1.35}.automation-copy p{margin:4px 0 0!important;font-size:.77rem;line-height:1.4}
      .channels{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin:13px 0}.chip{display:inline-flex;border:1px solid rgba(203,187,255,.27);border-radius:999px;padding:5px 10px;background:rgba(8,8,28,.38);font-size:.75rem;text-decoration:none}
      .field{display:block;margin:18px 0 7px;color:#ddd7ee;text-align:left;font-size:.77rem;font-weight:800;letter-spacing:.09em}
      input[type=tel],input[type=password]{width:100%;border:1px solid rgba(229,220,255,.2);border-radius:14px;background:rgba(9,8,27,.37);color:var(--text);padding:14px 15px;outline:none}
      input::placeholder{color:#8f89a5}input:focus{border-color:#9c76ff;box-shadow:0 0 0 3px #8e60ff2a}
      .pair-mark{font:900 1.1rem/1 ui-monospace,monospace}.pair-title{color:#c4a6ff!important;margin:3px 0 0!important;font-size:.93rem;font-weight:700}
      .code-box{margin-top:18px;padding:17px 15px;border:1px dashed rgba(218,202,255,.52);border-radius:17px;background:rgba(11,8,31,.32)}
      .code-label{color:#d8d1e9;font-size:.75rem;font-weight:800;letter-spacing:.1em}.code{margin:5px 0 12px;color:#fff;font:850 clamp(1.65rem,7vw,2.3rem)/1.2 ui-monospace,SFMono-Regular,monospace;letter-spacing:.13em;word-break:break-word}
      .page-footer{display:flex;justify-content:center;flex-wrap:wrap;gap:9px;margin:15px 0 0;color:#b2abc6;font-size:.76rem}.page-footer a{color:#cfc1ff;text-decoration:none}.page-footer a:hover{text-decoration:underline}
      .card{padding:clamp(18px,4vw,26px)}.card p{font-size:.9rem}.layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-top:18px;align-items:start}
      .stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:15px 0}.stat{padding:14px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(5,6,23,.25)}.stat span{display:block;color:var(--muted);font-size:.76rem}.stat strong{display:block;margin-top:3px;font-size:1.45rem}
      .session-list{display:grid;gap:11px}.session{padding:15px;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(6,7,23,.28)}.session-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.badge{border:1px solid rgba(196,179,255,.27);border-radius:999px;padding:4px 9px;background:rgba(124,58,237,.2);color:#e4d9ff;font-size:.72rem;font-weight:800;text-transform:uppercase}.danger{width:100%;margin-top:11px}.admin-tools{display:flex;align-items:center;justify-content:space-between;gap:12px}.admin-tools .button{margin:0}.empty{padding:20px;border:1px dashed var(--line);border-radius:15px;text-align:center;color:var(--muted)}
      .legal-card,.docs-card{max-width:780px;margin:20px auto 0;text-align:left}.legal-card h1,.docs-card h1{margin:0 0 8px;font-size:clamp(1.8rem,5vw,2.5rem);letter-spacing:-.04em}.legal-card h2,.docs-card h2{margin-top:23px}.legal-card p,.docs-card p{color:#d0c9df}.legal-card .page-footer,.docs-card .page-footer{justify-content:flex-start}
      .docs-steps{display:grid;gap:12px;margin:20px 0}.docs-step{padding:14px;border:1px solid rgba(255,255,255,.14);border-radius:15px;background:rgba(6,7,23,.2)}.docs-step strong{display:block;margin-bottom:4px}
      @media(max-width:620px){.page-shell{padding-top:84px}.glass-card{border-radius:21px}.layout{grid-template-columns:1fr}.emoji-grid{gap:9px}.site-header{padding:10px 15px}.page-footer{gap:7px}.button-row{gap:8px}}
    `;
}

function siteHeader(botName) {
    return `<header class="site-header"><a class="site-brand" href="/" aria-label="${escapeHtml(botName)} accueil"><span class="site-brand-mark">&lt;/&gt;</span><span>${escapeHtml(botName)}</span></a><a class="admin-link" href="/admin"><svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true"><circle cx="10" cy="6" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 17c.4-3 2.3-4.5 5.5-4.5s5.1 1.5 5.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Admin</a></header>`;
}

function footerLinks() {
    return `<footer class="page-footer"><a href="/privacy">Politique</a><span aria-hidden="true">·</span><a href="/terms">Conditions</a><span aria-hidden="true">·</span><a href="/docs">En savoir plus</a></footer>`;
}

export function renderPairPage({ botName, version, timeZone, channelLinks, reactionEmojis }) {
    const channels = channelLinks.map((url, index) =>
        `<a class="chip" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Chaîne officielle ${index + 1}</a>`
    ).join('');
    const emojiChoices = reactionEmojis.map((emoji) =>
        `<button class="emoji-tile" type="button" data-emoji="${escapeHtml(emoji)}" aria-pressed="false" aria-label="Sélectionner ${escapeHtml(emoji)}"><span>${escapeHtml(emoji)}</span><span class="emoji-check" aria-hidden="true">✓</span></button>`
    ).join('');
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#0b061d"><title>${escapeHtml(botName)} · Code de pairage</title><style>${sharedStyles()}</style></head>
<body>
${siteHeader(botName)}
<main class="page-shell wizard">
  <div class="step-counter" aria-live="polite">Étape <span id="step-number">1</span> / 3</div>
  <section id="welcome-step" class="glass-card" aria-labelledby="welcome-title">
    <div class="hero-symbol" aria-hidden="true">◇</div>
    <h1 id="welcome-title">Bienvenue sur ${escapeHtml(botName)}</h1>
    <p>En utilisant ${escapeHtml(botName)}, vous acceptez le traitement des données nécessaire à la connexion.</p>
    <a id="privacy-accept" class="button" href="/privacy" target="_blank" rel="noopener noreferrer">Accepter la politique de confidentialité</a>
    <button id="welcome-continue" class="button button-secondary" type="button" disabled>CONTINUER</button>
    <p id="privacy-hint" class="tiny muted" aria-live="polite">Ouvrez la politique pour continuer.</p>
  </section>

  <section id="terms-step" class="glass-card" aria-labelledby="terms-title" hidden>
    <div class="hero-symbol" aria-hidden="true">§</div>
    <h1 id="terms-title">Conditions d’utilisation de ${escapeHtml(botName)}</h1>
    <p>Utilisez uniquement un compte que vous contrôlez. Les fonctions du bot agissent depuis ce compte. Les automatismes de chaîne restent facultatifs.</p>
    <a class="tiny" href="/terms" target="_blank" rel="noopener noreferrer">Lire les conditions complètes</a>
    <div class="button-row">
      <button id="terms-refuse" class="button button-secondary" type="button">Refuser</button>
      <button id="terms-accept" class="button" type="button">Accepter et Continuer</button>
    </div>
    <p id="terms-hint" class="error" role="alert"></p>
  </section>

  <section id="emoji-step" class="glass-card" aria-labelledby="emoji-title" hidden>
    <h1 id="emoji-title">Choisissez vos emojis pour auto-réaction dans la chaîne</h1>
    <p class="tiny">Touchez pour sélectionner ou désélectionner · 3 maximum</p>
    <div id="emoji-grid" class="emoji-grid" role="group" aria-label="Emojis de réaction">${emojiChoices}</div>
    <p id="emoji-count" class="selection-count" aria-live="polite">0 emoji sélectionné</p>
    <p id="emoji-default" class="default-emojis">Par défaut : ❤️ 🔥</p>
    <div class="automation-card">
      <button id="automation-consent" class="switch" type="button" role="switch" aria-checked="false" aria-label="Activer le suivi et les réactions automatiques"></button>
      <div class="automation-copy"><strong>Suivre les chaînes et réagir automatiquement</strong><p>Option facultative, activée seulement après votre accord et la connexion du compte.</p></div>
    </div>
    <div id="channel-list" class="channels" hidden>${channels}</div>
    <button id="emoji-continue" class="button" type="button">Continuer</button>
    <p class="tiny muted">Vous pourrez modifier ce choix plus tard dans les paramètres.</p>
  </section>

  <section id="pair-step" class="glass-card" aria-labelledby="pair-title" hidden>
    <div class="pair-mark" aria-hidden="true">&lt;/&gt;</div>
    <h1 id="pair-title">${escapeHtml(botName)}</h1>
    <p class="pair-title">Générateur de Code de Pairage</p>
    <form id="pair-form">
      <label class="field" for="phone">NUMÉRO DE TÉLÉPHONE</label>
      <input id="phone" name="phoneNumber" type="tel" inputmode="tel" autocomplete="tel" placeholder="+224 XX XX XX XX" required>
      <button id="submit-button" class="button" type="submit">⚡ Générer</button>
    </form>
    <p id="form-error" class="error" role="alert"></p>
    <div id="code-box" class="code-box" role="status" aria-live="polite" hidden>
      <div class="code-label">VOTRE CODE</div>
      <div id="pairing-code" class="code"></div>
      <button id="copy-code" class="button button-secondary" type="button">📋 Copier le code</button>
      <p class="tiny">Saisissez-le dans WhatsApp → Appareils connectés.</p>
    </div>
  </section>
  ${footerLinks()}
  <p class="page-footer tiny">SLOW-XV · ${escapeHtml(version)} · ${escapeHtml(timeZone)}</p>
</main>
<script>
const privacyLink=document.querySelector('#privacy-accept');
const privacyContinue=document.querySelector('#welcome-continue');
const privacyHint=document.querySelector('#privacy-hint');
const termsHint=document.querySelector('#terms-hint');
const stepNumber=document.querySelector('#step-number');
const screens=['welcome-step','terms-step','emoji-step','pair-step'].map(id=>document.getElementById(id));
const stepIndexes=[1,1,2,3];
let privacyAccepted=false;
let termsAccepted=false;
const selectedEmojis=new Set();
const maxSelectedEmojis=3;
function showScreen(id){screens.forEach((screen,index)=>{screen.hidden=screen.id!==id;if(screen.id===id)stepNumber.textContent=String(stepIndexes[index])})}
privacyLink.addEventListener('click',()=>{privacyAccepted=true;privacyContinue.disabled=false;privacyHint.textContent='Politique acceptée. Vous pouvez continuer.';privacyHint.classList.add('success')});
privacyContinue.addEventListener('click',()=>{if(privacyAccepted)showScreen('terms-step')});
document.querySelector('#terms-refuse').addEventListener('click',()=>{termsAccepted=false;termsHint.textContent='Les conditions doivent être acceptées pour continuer.';showScreen('welcome-step');privacyHint.textContent='La politique a été acceptée. Les conditions restent nécessaires.';privacyHint.classList.remove('success')});
document.querySelector('#terms-accept').addEventListener('click',()=>{if(!privacyAccepted){showScreen('welcome-step');return}termsAccepted=true;showScreen('emoji-step')});
const countLabel=document.querySelector('#emoji-count');
document.querySelectorAll('.emoji-tile').forEach(tile=>tile.addEventListener('click',()=>{const emoji=tile.dataset.emoji;if(selectedEmojis.has(emoji)){selectedEmojis.delete(emoji);tile.setAttribute('aria-pressed','false')}else if(selectedEmojis.size<maxSelectedEmojis){selectedEmojis.add(emoji);tile.setAttribute('aria-pressed','true')}else{countLabel.textContent='3 emojis maximum';return}const count=selectedEmojis.size;countLabel.textContent=count+' emoji'+(count===1?'':'s')+' sélectionné'+(count===1?'':'s')}));
const automation=document.querySelector('#automation-consent');
const channelList=document.querySelector('#channel-list');
automation.addEventListener('click',()=>{const enabled=automation.getAttribute('aria-checked')!=='true';automation.setAttribute('aria-checked',String(enabled));channelList.hidden=!enabled});
document.querySelector('#emoji-continue').addEventListener('click',()=>showScreen('pair-step'));
const form=document.querySelector('#pair-form'),button=document.querySelector('#submit-button'),errorBox=document.querySelector('#form-error'),codeBox=document.querySelector('#code-box'),codeText=document.querySelector('#pairing-code'),copyButton=document.querySelector('#copy-code');
form.addEventListener('submit',async event=>{event.preventDefault();errorBox.textContent='';codeBox.hidden=true;if(!privacyAccepted||!termsAccepted){errorBox.textContent='Acceptez la politique et les conditions avant de continuer.';return}button.disabled=true;button.textContent='Connexion…';const chosen=[...selectedEmojis];const reactionEmojis=chosen.length?chosen:['❤️','🔥'];try{const response=await fetch('/api/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phoneNumber:form.elements.phoneNumber.value,privacyAccepted,termsAccepted,newsletterAutomationConsent:automation.getAttribute('aria-checked')==='true',reactionEmojis})});const body=await response.json();if(!response.ok)throw new Error(body.error||'La demande n’a pas abouti.');if(body.pairingCode){codeText.textContent=body.pairingCode;codeBox.hidden=false;copyButton.textContent='📋 Copier le code'}else{errorBox.textContent='Demande prise en compte. Vérifiez WhatsApp pour terminer la connexion.'}}catch(error){errorBox.textContent=error.message||'Impossible de générer le code.'}finally{button.disabled=false;button.textContent='⚡ Générer'}});
copyButton.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(codeText.textContent);copyButton.textContent='Copié !';setTimeout(()=>copyButton.textContent='📋 Copier le code',1500)}catch{errorBox.textContent='Copie indisponible. Sélectionnez le code pour le copier.'}});
</script></body></html>`;
}

export function renderAdminPage({ botName }) {
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#0b061d"><title>${escapeHtml(botName)} · Administration</title><style>${sharedStyles()}</style></head>
<body>
${siteHeader(botName)}
<main class="page-shell">
  <h1>Administration</h1>
  <p class="muted">Gestion des connexions et des préférences enregistrées.</p>
  <section id="login-panel" class="card" style="max-width:520px;margin-top:22px">
    <h2>Connexion administrateur</h2>
    <form id="login-form"><label class="field" for="admin-password">MOT DE PASSE</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required><button id="login-button" class="button" type="submit">Se connecter</button></form>
    <p id="login-error" class="error" role="alert"></p>
  </section>
  <section id="admin-content" class="card" style="margin-top:22px" hidden>
    <div class="admin-tools"><h2 style="margin:0">Sessions</h2><button id="logout-button" class="button button-secondary button-compact" type="button">Déconnexion</button></div>
    <div class="stats"><div class="stat"><span>Connexions enregistrées</span><strong id="session-total">0</strong></div><div class="stat"><span>Comptes connectés</span><strong id="session-connected">0</strong></div></div>
    <div id="sessions" class="session-list"><div class="empty">Chargement…</div></div><p id="admin-error" class="error" role="alert"></p>
  </section>
  ${footerLinks()}
</main>
<script>
const loginPanel=document.querySelector('#login-panel'),adminContent=document.querySelector('#admin-content'),loginForm=document.querySelector('#login-form'),loginError=document.querySelector('#login-error'),sessions=document.querySelector('#sessions'),adminError=document.querySelector('#admin-error'),loginButton=document.querySelector('#login-button');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function formatDate(value){if(!value)return'—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short'}).format(date)}
async function loadSessions(){const response=await fetch('/api/admin/sessions');if(response.status===401){showLogin();return}const body=await response.json();if(!response.ok)throw new Error(body.error||'Chargement impossible');document.querySelector('#session-total').textContent=String(body.length);document.querySelector('#session-connected').textContent=String(body.filter(item=>item.connected||item.status==='connected').length);if(!body.length){sessions.innerHTML='<div class="empty">Aucune session enregistrée.</div>';return}sessions.innerHTML=body.map(item=>'<article class="session"><div class="session-head"><strong>'+esc(item.phoneNumber)+'</strong><span class="badge">'+esc(item.status)+'</span></div><p class="tiny">Emojis : '+(item.reactionEmojis||[]).map(esc).join(' ')+' · Auto : '+(item.newsletterAutomationConsent?'activé':'désactivé')+'</p><p class="tiny muted">Date : '+esc(formatDate(item.createdAt))+'</p>'+(item.lastError?'<p class="tiny error">'+esc(item.lastError)+'</p>':'')+'<button class="button button-danger danger" type="button" data-remove="'+esc(item.sessionId)+'">Supprimer la session</button></article>').join('');sessions.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>removeSession(button.dataset.remove)))}
function showLogin(){loginPanel.hidden=false;adminContent.hidden=true}
async function showAdmin(){loginPanel.hidden=true;adminContent.hidden=false;try{await loadSessions()}catch(error){adminError.textContent=error.message}}
async function checkAuth(){try{const response=await fetch('/api/admin/auth/status');const body=await response.json();if(body.authenticated)await showAdmin()}catch{loginError.textContent='Serveur inaccessible.'}}
loginForm.addEventListener('submit',async event=>{event.preventDefault();loginButton.disabled=true;loginError.textContent='';try{const response=await fetch('/api/admin/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:loginForm.password.value})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Connexion refusée');loginForm.reset();await showAdmin()}catch(error){loginError.textContent=error.message}finally{loginButton.disabled=false}});
document.querySelector('#logout-button').addEventListener('click',async()=>{await fetch('/api/admin/auth/logout',{method:'POST'});showLogin()});
async function removeSession(id){if(!confirm('Supprimer les identifiants et données locaux de cette session ? Cette action est irréversible.'))return;adminError.textContent='';try{const response=await fetch('/api/admin/sessions/'+encodeURIComponent(id),{method:'DELETE'});const body=response.status===204?{}:await response.json();if(!response.ok)throw new Error(body.error||'Suppression impossible');await loadSessions()}catch(error){adminError.textContent=error.message}}
checkAuth();setInterval(()=>{if(!adminContent.hidden)loadSessions().catch(error=>adminError.textContent=error.message)},15000);
</script></body></html>`;
}

export function renderLegalPage({ botName, kind }) {
    const terms = kind === 'terms';
    const title = terms ? 'Conditions d’utilisation' : 'Politique de confidentialité';
    const content = terms
        ? `<h2>Utilisation du service</h2><p>En utilisant SLOW-XV, vous confirmez être autorisé à connecter le compte WhatsApp concerné. Vous restez responsable de vos actions et du respect des règles applicables de WhatsApp et de la loi.</p><p>Le service fournit une connexion par code et des fonctions de bot. Certaines fonctions peuvent envoyer des messages, modifier des discussions ou effectuer d’autres actions selon les commandes utilisées. N’accordez l’accès qu’à un compte que vous contrôlez.</p><h2>Consentements facultatifs</h2><p>Le suivi des chaînes et les réactions automatiques sont facultatifs et nécessitent un accord séparé. Vous pouvez retirer ce consentement en renvoyant le même numéro sur la page de connexion et en désactivant l’option.</p><h2>Disponibilité et sécurité</h2><p>La disponibilité des codes et du service dépend notamment de WhatsApp, de la connexion réseau et des ressources du serveur. Ne partagez jamais un code de liaison. SLOW-XV peut suspendre l’accès en cas d’abus ou de risque de sécurité.</p>`
        : `<h2>Données traitées</h2><p>Pour fournir le service, SLOW-XV traite le numéro fourni, l’état de connexion, les préférences choisies et les identifiants techniques nécessaires à la session WhatsApp. Les données de session et certains réglages sont stockés dans le répertoire de sessions du serveur afin de maintenir la connexion après redémarrage.</p><h2>Visibilité et accès</h2><p>La page publique ne présente pas la liste des comptes connectés. Les numéros complets et la gestion des sessions sont réservés au panneau d’administration protégé. Les identifiants et codes de liaison ne sont pas affichés dans la liste administrateur.</p><h2>Actions sur les chaînes</h2><p>Le suivi des chaînes et les réactions automatiques ne sont activés que si vous donnez séparément votre accord facultatif sur la page de connexion. Vos emojis sélectionnés sont utilisés pour ces réactions. Vous pouvez retirer cet accord en renvoyant le même numéro avec l’option désactivée.</p><h2>Conservation et suppression</h2><p>Les identifiants restent conservés pour permettre la reconnexion, jusqu’à leur suppression par l’administrateur ou l’effacement du volume de stockage. La suppression dans le panneau retire les données locales ; elle ne déconnecte pas à distance le compte WhatsApp. Pour cela, utilisez aussi la liste « Appareils connectés » dans WhatsApp.</p><h2>Contact</h2><p>Pour une demande relative aux données, contactez l’administrateur de SLOW-XV. Cette page décrit le fonctionnement technique du service et ne remplace pas un avis juridique.</p>`;
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#0b061d"><title>${escapeHtml(title)} · ${escapeHtml(botName)}</title><style>${sharedStyles()}</style></head><body>${siteHeader(botName)}<main class="page-shell"><section class="card legal-card"><h1>${escapeHtml(title)}</h1><p class="tiny muted">Version 2026-11-13</p>${content}<p class="tiny muted">Cette page décrit le fonctionnement technique du service et ne remplace pas un avis juridique.</p>${footerLinks()}</section></main></body></html>`;
}

export function renderDocsPage({ botName }) {
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="theme-color" content="#0b061d"><title>Comment ça marche ? · ${escapeHtml(botName)}</title><style>${sharedStyles()}</style></head>
<body>
${siteHeader(botName)}
<main class="page-shell">
  <section class="card docs-card">
    <h1>Comment ça marche ?</h1>
    <p>Connectez votre propre compte WhatsApp en trois étapes.</p>
    <div class="docs-steps">
      <div class="docs-step"><strong>1. Lisez et acceptez</strong><p>Ouvrez la politique de confidentialité, puis acceptez les conditions pour passer à la suite.</p></div>
      <div class="docs-step"><strong>2. Choisissez vos options</strong><p>Sélectionnez jusqu’à trois emojis. Si vous n’en choisissez aucun, ❤️ 🔥 seront utilisés par défaut. Le suivi des chaînes et les réactions restent désactivés tant que vous ne les autorisez pas.</p></div>
      <div class="docs-step"><strong>3. Liez votre compte</strong><p>Saisissez votre numéro, générez le code et validez la connexion dans WhatsApp → Appareils connectés → Lier un appareil.</p></div>
    </div>
    <h2>À propos des automatismes</h2>
    <p>Si vous activez l’option, le compte suivra les chaînes officielles affichées et réagira à leurs nouvelles publications avec les emojis choisis. Vous pouvez désactiver cet automatisme en soumettant à nouveau le même numéro sans l’autorisation.</p>
    <h2>Protégez votre compte</h2>
    <p>Ne partagez jamais le code de liaison. Utilisez uniquement un compte que vous contrôlez et retirez le compte lié depuis WhatsApp si vous souhaitez interrompre la connexion.</p>
    ${footerLinks()}
  </section>
</main>
</body></html>`;
}
