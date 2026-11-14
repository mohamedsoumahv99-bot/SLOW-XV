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
      :root{color-scheme:dark;--bg:#070b12;--panel:#0d1522;--panel2:#111d2d;--line:#22364e;--text:#eff5fc;--muted:#9aabc0;--blue:#58a6ff;--cyan:#56e0d0;--red:#ff8791}
      *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 50% -20%,#17375b 0,transparent 55%),var(--bg);color:var(--text);font:16px/1.55 Inter,ui-sans-serif,system-ui,sans-serif}
      a{color:var(--cyan)}main{width:min(1040px,calc(100% - 32px));margin:0 auto;padding:42px 0 56px}
      .brand{display:flex;align-items:center;gap:12px;color:var(--cyan);font-size:.75rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase}
      .brand-mark{display:grid;place-items:center;width:38px;height:38px;border:1px solid #2d7093;border-radius:12px;background:#0b2033;color:#b6f5ff;font-weight:900}
      h1{font-size:clamp(2.2rem,6vw,4rem);letter-spacing:-.06em;line-height:1.02;margin:19px 0 9px}
      h2{font-size:1.1rem;margin:0 0 10px}p{color:var(--muted);margin:.5rem 0 1rem}
      .layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(270px,.85fr);gap:18px;margin-top:26px;align-items:start}
      .card{padding:24px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(150deg,#101c2a,#0a111b);box-shadow:0 24px 70px #0005}
      label.field{display:block;color:var(--text);font-size:.88rem;font-weight:700;margin:17px 0 7px}
      input[type=tel],input[type=password]{width:100%;border:1px solid #2a4059;border-radius:12px;background:#080e17;color:var(--text);padding:14px;font:inherit;outline:none}
      input:focus{border-color:var(--blue);box-shadow:0 0 0 3px #58a6ff22}
      button{border:1px solid var(--blue);border-radius:12px;padding:13px 16px;background:linear-gradient(105deg,#4b9bff,#5ce0d0);color:#071421;font:inherit;font-weight:850;cursor:pointer}
      button:hover{filter:brightness(1.08)}button:disabled{opacity:.58;cursor:wait}
      .primary{width:100%;margin-top:17px}.secondary{background:#101b29;border-color:#30445d;color:var(--text)}
      .small{font-size:.82rem}.check{display:flex;gap:11px;align-items:flex-start;color:#d2deeb;font-size:.87rem;margin:16px 0}
      .check input{flex:0 0 auto;width:18px;height:18px;margin:3px 0 0;accent-color:var(--blue)}
      .channels{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.chip{display:inline-flex;border:1px solid #2a4561;border-radius:999px;padding:5px 10px;background:#0c1928;font-size:.8rem}
      .emoji-picker{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.emoji-choice{cursor:pointer}.emoji-choice input{position:absolute;opacity:0;width:1px;height:1px}.emoji-choice span{display:grid;place-items:center;min-width:42px;height:42px;border:1px solid var(--line);border-radius:11px;background:#080e17;font-size:1.25rem}.emoji-choice input:checked+span{border-color:var(--blue);background:#10233a;box-shadow:0 0 0 2px #58a6ff25}
      .notice{padding:13px 14px;border-radius:12px;background:#0b1d2e;border:1px solid #1c4668;color:#bfd2e8;font-size:.85rem}
      .code-box{display:none;margin-top:18px;padding:18px;border:1px solid #1b6587;border-radius:15px;background:#081724;text-align:center}.code{font:800 1.6rem/1.3 ui-monospace,monospace;letter-spacing:.13em;color:#8eeaff;word-break:break-word}
      .muted{color:var(--muted)}.error{min-height:1.5em;color:var(--red);font-size:.85rem}.footer{margin-top:22px;color:var(--muted);font-size:.82rem}
      .session-list{display:grid;gap:12px}.session{padding:16px;border:1px solid var(--line);border-radius:14px;background:#0a121d}.session-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.badge{border-radius:999px;padding:3px 9px;background:#17324a;color:#9bd9ff;font-size:.73rem;font-weight:800;text-transform:uppercase}.danger{background:#34171c;border-color:#7b343d;color:#ffdce0}.admin-tools{display:flex;gap:12px;align-items:center;justify-content:space-between;margin:14px 0}.empty{padding:22px;border:1px dashed var(--line);border-radius:14px;text-align:center;color:var(--muted)}
      @media(max-width:760px){main{padding-top:26px}.layout{grid-template-columns:1fr}.card{padding:19px}}
    `;
}

export function renderPairPage({ botName, version, timeZone, channelLinks, reactionEmojis, defaultEmoji }) {
    const channels = channelLinks.map((url, index) =>
        `<a class="chip" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Chaîne officielle ${index + 1}</a>`
    ).join('');
    const emojiChoices = reactionEmojis.map((emoji) =>
        `<label class="emoji-choice"><input type="checkbox" name="reactionEmojis" value="${escapeHtml(emoji)}"${emoji === defaultEmoji ? ' checked' : ''}><span>${escapeHtml(emoji)}</span></label>`
    ).join('');
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(botName)} · Connexion</title><style>${sharedStyles()}</style></head>
<body><main>
  <div class="brand"><span class="brand-mark">SX</span> ${escapeHtml(botName)} · Web Pair</div>
  <h1>Connecter un compte WhatsApp</h1>
  <p>Générez un code de liaison pour connecter votre compte au service. Les sessions connectées ne sont pas affichées sur cette page publique.</p>
  <section class="layout">
    <form id="pair-form" class="card">
      <h2>Demande de connexion</h2>
      <p class="small">Saisissez votre numéro au format international. Le code, s’il est disponible, sera affiché uniquement dans cette session de navigateur.</p>
      <label class="field" for="phone">Numéro WhatsApp</label>
      <input id="phone" name="phoneNumber" type="tel" inputmode="tel" autocomplete="tel" placeholder="224XXXXXXXXX" required>
      <label class="check"><input id="terms-accepted" name="termsAccepted" type="checkbox" required><span>J’accepte les <a href="/terms" target="_blank" rel="noopener noreferrer">conditions d’utilisation</a> et la <a href="/privacy" target="_blank" rel="noopener noreferrer">politique de confidentialité</a> de SLOW-XV.</span></label>
      <label class="check"><input id="automation-consent" name="newsletterAutomationConsent" type="checkbox"><span>Option facultative : j’autorise ce compte, une fois connecté, à suivre les chaînes ci-dessous et à réagir à leurs nouvelles publications avec les emojis que je choisis. Je peux ne pas l’activer.</span></label>
      <div id="automation-settings" hidden>
        <div class="channels">${channels}</div>
        <div class="small muted">Choisissez jusqu’à quatre emojis. Ils alterneront sur les nouvelles publications.</div>
        <div class="emoji-picker" role="group" aria-label="Emojis de réaction">${emojiChoices}</div>
      </div>
      <button id="submit-button" class="primary" type="submit">Accepter et générer le code</button>
      <p id="form-error" class="error" role="alert"></p>
      <div id="code-box" class="code-box" role="status" aria-live="polite"><div class="small muted">Code de liaison WhatsApp</div><div id="pairing-code" class="code"></div><button id="copy-code" class="secondary" type="button">Copier le code</button><p class="small">Saisissez ce code dans WhatsApp → Appareils connectés. Ne le partagez pas.</p></div>
    </form>
    <aside class="card">
      <h2>À savoir</h2>
      <div class="notice">La connexion nécessite une validation dans WhatsApp. Le site ne publie pas la liste des comptes connectés ni leurs numéros.</div>
      <p class="small">Les données de session sont conservées sur le serveur pour permettre la reconnexion après un redémarrage. L’administration peut gérer les sessions depuis un espace séparé.</p>
      <p class="small">La participation aux chaînes et les réactions automatiques sont facultatives et distinctes de l’acceptation des conditions. Aucun automatisme de chaîne n’est activé sans consentement explicite.</p>
      <p class="small">Besoin de renouveler un code expiré ? Saisissez à nouveau le même numéro pour demander un nouveau code.</p>
    </aside>
  </section>
  <footer class="footer">SLOW-XV · ${escapeHtml(version)} · Fuseau horaire : ${escapeHtml(timeZone)} · <a href="/terms">Conditions</a> · <a href="/privacy">Confidentialité</a></footer>
</main>
<script>
const form=document.querySelector('#pair-form'),automation=document.querySelector('#automation-consent'),settings=document.querySelector('#automation-settings'),button=document.querySelector('#submit-button'),errorBox=document.querySelector('#form-error'),codeBox=document.querySelector('#code-box'),codeText=document.querySelector('#pairing-code');
automation.addEventListener('change',()=>{settings.hidden=!automation.checked});
document.querySelector('#copy-code').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(codeText.textContent);document.querySelector('#copy-code').textContent='Copié';setTimeout(()=>document.querySelector('#copy-code').textContent='Copier le code',1500)}catch{errorBox.textContent='Copie indisponible. Sélectionnez le code pour le copier.'}});
form.addEventListener('submit',async event=>{event.preventDefault();errorBox.textContent='';codeBox.style.display='none';const selected=[...form.querySelectorAll('input[name="reactionEmojis"]:checked')].map(input=>input.value);if(automation.checked&&!selected.length){errorBox.textContent='Choisissez au moins un emoji ou désactivez les réactions automatiques.';return}if(selected.length>4){errorBox.textContent='Choisissez au maximum quatre emojis.';return}button.disabled=true;button.textContent='Traitement…';try{const response=await fetch('/api/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phoneNumber:form.phoneNumber.value,termsAccepted:form.elements.termsAccepted.checked,newsletterAutomationConsent:automation.checked,reactionEmojis:selected})});const body=await response.json();if(!response.ok)throw new Error(body.error||'La demande n’a pas abouti.');if(body.pairingCode){codeText.textContent=body.pairingCode;codeBox.style.display='block'}else{errorBox.textContent='Demande prise en compte. Si aucun code ne s’affiche, réessayez dans quelques instants ou vérifiez l’état du compte dans WhatsApp.'}}catch(error){errorBox.textContent=error.message}finally{button.disabled=false;button.textContent='Accepter et générer le code'}});
</script></body></html>`;
}

export function renderAdminPage({ botName }) {
    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(botName)} · Administration</title><style>${sharedStyles()}</style></head>
<body><main>
  <div class="brand"><span class="brand-mark">SX</span> ${escapeHtml(botName)} · Administration</div>
  <h1>Gestion des sessions</h1>
  <p>Accès réservé à l’administrateur. Les numéros complets ne sont visibles que dans cet espace protégé.</p>
  <section id="login-panel" class="card" style="max-width:520px;margin-top:26px">
    <h2>Connexion administrateur</h2><form id="login-form"><label class="field" for="admin-password">Mot de passe administrateur</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required><button id="login-button" class="primary">Se connecter</button></form><p id="login-error" class="error" role="alert"></p><p class="small">Le secret doit être configuré côté serveur dans la variable d’environnement <code>ADMIN_PANEL_PASSWORD</code>.</p>
  </section>
  <section id="admin-content" class="card" style="margin-top:26px" hidden>
    <div class="admin-tools"><div><h2 style="margin:0">Sessions enregistrées</h2><div id="session-count" class="small muted"></div></div><button id="logout-button" class="secondary" type="button">Déconnexion</button></div>
    <p class="small">Supprimer une entrée efface les identifiants locaux et les données de session de ce serveur. Cela n’envoie pas de déconnexion à WhatsApp ; le compte peut devoir être retiré séparément depuis « Appareils connectés ».</p>
    <div id="sessions" class="session-list"><div class="empty">Chargement…</div></div><p id="admin-error" class="error" role="alert"></p>
  </section>
  <footer class="footer"><a href="/">Retour au Web Pair</a> · <a href="/privacy">Politique de confidentialité</a></footer>
</main>
<script>
const loginPanel=document.querySelector('#login-panel'),adminContent=document.querySelector('#admin-content'),loginForm=document.querySelector('#login-form'),loginError=document.querySelector('#login-error'),sessions=document.querySelector('#sessions'),adminError=document.querySelector('#admin-error'),loginButton=document.querySelector('#login-button');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function loadSessions(){const response=await fetch('/api/admin/sessions');if(response.status===401){showLogin();return}const body=await response.json();if(!response.ok)throw new Error(body.error||'Chargement impossible');document.querySelector('#session-count').textContent=body.length+' session(s)';if(!body.length){sessions.innerHTML='<div class="empty">Aucune session enregistrée.</div>';return}sessions.innerHTML=body.map(item=>'<article class="session"><div class="session-head"><strong>'+esc(item.phoneNumber)+'</strong><span class="badge">'+esc(item.status)+'</span></div><div class="small muted">ID : '+esc(item.sessionId)+' · Créée : '+esc(item.createdAt||'—')+'</div><div class="small muted">Réactions auto : '+(item.newsletterAutomationConsent?'activées':'désactivées')+' '+(item.reactionEmojis||[]).map(esc).join(' ')+'</div>'+(item.lastError?'<div class="small" style="color:var(--red)">'+esc(item.lastError)+'</div>':'')+'<button class="danger" type="button" data-remove="'+esc(item.sessionId)+'" style="margin-top:12px">Supprimer cette session</button></article>').join('');sessions.querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',()=>removeSession(button.dataset.remove)))}
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
        ? `<h2>Utilisation du service</h2><p>En utilisant SLOW-XV, vous confirmez être autorisé à connecter le compte WhatsApp concerné. Vous restez responsable de vos actions et du respect des règles applicables de WhatsApp et de la loi.</p><p>Le service fournit une connexion par code et des fonctions de bot. Certaines fonctions peuvent envoyer des messages, modifier des discussions ou effectuer d’autres actions selon les commandes utilisées. N’accordez l’accès qu’à un compte que vous contrôlez.</p><h2>Consentements facultatifs</h2><p>Le suivi des chaînes et les réactions automatiques sont facultatifs et nécessitent une case séparée. Vous pouvez retirer ce consentement en renvoyant le même numéro sur la page Web Pair et en décochant cette option.</p><h2>Disponibilité et sécurité</h2><p>La disponibilité des codes et du service dépend notamment de WhatsApp, de la connexion réseau et des ressources du serveur. Ne partagez jamais un code de liaison. SLOW-XV peut suspendre l’accès en cas d’abus ou de risque de sécurité.</p>`
        : `<h2>Données traitées</h2><p>Pour fournir le service, SLOW-XV traite le numéro fourni, l’état de connexion, les préférences choisies et les identifiants techniques nécessaires à la session WhatsApp. Les données de session et certains réglages sont stockés dans le répertoire de sessions du serveur afin de maintenir la connexion après redémarrage.</p><h2>Visibilité et accès</h2><p>La page publique ne présente pas la liste des comptes connectés. Les numéros complets et la gestion des sessions sont réservés au panneau d’administration protégé. Les identifiants et codes de liaison ne sont pas affichés dans la liste administrateur.</p><h2>Actions sur les chaînes</h2><p>Le suivi des chaînes et les réactions automatiques ne sont activés que si vous donnez séparément votre accord facultatif sur la page de connexion. Vos emojis sélectionnés sont utilisés pour ces réactions. Vous pouvez retirer cet accord en renvoyant le même numéro sur la page Web Pair avec l’option décochée.</p><h2>Conservation et suppression</h2><p>Les identifiants restent conservés pour permettre la reconnexion, jusqu’à leur suppression par l’administrateur ou l’effacement du volume de stockage. La suppression dans le panneau retire les données locales ; elle ne déconnecte pas à distance le compte WhatsApp. Pour cela, utilisez aussi la liste « Appareils connectés » dans WhatsApp.</p><h2>Contact</h2><p>Pour une demande relative aux données, contactez l’administrateur de SLOW-XV. Cette page décrit le fonctionnement technique du service et ne remplace pas un avis juridique.</p>`;
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)} · ${escapeHtml(botName)}</title><style>${sharedStyles()}.legal{max-width:780px;margin-top:25px}.legal h2{margin-top:24px}.legal p{color:#c1cede}</style></head><body><main><div class="brand"><span class="brand-mark">SX</span> ${escapeHtml(botName)}</div><section class="card legal"><h1>${escapeHtml(title)}</h1><p class="small">Version 2026-11-13</p>${content}<p class="footer"><a href="/">Retour à la connexion</a> · <a href="/${terms ? 'privacy' : 'terms'}">${terms ? 'Confidentialité' : 'Conditions'}</a></p></section></main></body></html>`;
}
