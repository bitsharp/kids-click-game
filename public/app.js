(function(){
  const coinEl = document.getElementById('coinCount');
  const collectBtn = document.getElementById('collectBtn');
  const message = document.getElementById('message');
  const tapCoinsEl = document.getElementById('tapCoins');
  const itemsEl = document.getElementById('items');
  const toast = document.getElementById('toast');

  const STORAGE_KEY = 'sunny_coins_balance';
  const TOTAL_EARNED_KEY = 'sunny_coins_total_earned';
  const MILESTONE_1000_KEY = 'sunny_coins_1000_reached';
  const MILESTONE_2000_KEY = 'sunny_coins_2000_reached';
  let balance = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  let totalEarned = parseInt(localStorage.getItem(TOTAL_EARNED_KEY) || '0', 10);
  let milestone1000Reached = localStorage.getItem(MILESTONE_1000_KEY) === 'true';
  let milestone2000Reached = localStorage.getItem(MILESTONE_2000_KEY) === 'true';

  const items = [
    { id: 'skin-flower', name: 'Flower Skin', price: 50 },
    { id: 'skin-sunglasses', name: 'Cool Glasses', price: 120 },
    { id: 'boost-2x', name: '2x Booster (1min)', price: 300 },
    { id: 'skin-diamond', name: 'Diamond Skin (1000 coins)', price: 1000, premium: true }
  ];

  function renderBalance(){ coinEl.textContent = balance; }
  function save(){ localStorage.setItem(STORAGE_KEY, String(balance)); localStorage.setItem(TOTAL_EARNED_KEY, String(totalEarned)); localStorage.setItem(MILESTONE_1000_KEY, String(milestone1000Reached)); localStorage.setItem(MILESTONE_2000_KEY, String(milestone2000Reached)); }
  function showToast(text){ toast.textContent = text; toast.style.opacity = '1'; setTimeout(()=>{ toast.style.opacity='0'; }, 1600); }

  function addCoins(n){ balance += n; totalEarned += n; save(); renderBalance(); animateAdd(n); checkMilestone1000(); checkMilestone2000(); }

  function animateAdd(n){ const el = document.createElement('div'); el.textContent = `+${n}`; el.style.position='absolute'; el.style.left='50%'; el.style.top='40%'; el.style.transform='translate(-50%,-50%)'; el.style.fontSize='22px'; el.style.color='#ff7043'; el.style.fontWeight='700'; el.style.pointerEvents='none'; document.body.appendChild(el); setTimeout(()=>el.style.transition='transform 700ms ease, opacity 700ms',50); setTimeout(()=>{ el.style.transform='translate(-50%, -260px)'; el.style.opacity='0'; },50); setTimeout(()=>el.remove(),900);
  }

  function checkMilestone1000(){
    if (!milestone1000Reached && totalEarned >= 1000){
      milestone1000Reached = true;
      save();
      applySun1000Milestone();
      showToast('🌟 Wow! You reached 1000 coins earned! Your sun transformed!');
    }
  }

  function applySun1000Milestone(){
    const sun = document.querySelector('.sun');
    if (!sun) return;
    sun.innerHTML = `<defs><radialGradient id="goldenGlow" cx="50%" cy="50%"><stop offset="0%" style="stop-color:#fff700;stop-opacity:1" /><stop offset="100%" style="stop-color:#ffa500;stop-opacity:1" /></radialGradient></defs><circle cx="50" cy="50" r="22" fill="url(#goldenGlow)" stroke="#ff6b35" stroke-width="2"></circle><text x="50" y="56" text-anchor="middle" font-size="18" fill="#fff" font-weight="bold">⭐</text>`;
  }

  function checkMilestone2000(){
    if (!milestone2000Reached && totalEarned >= 2000){
      milestone2000Reached = true;
      save();
      applyPokeBallSkin();
      showToast('🔴 Amazing! You reached 2000 coins earned! You got a Pokéball!');
    }
  }

  function applyPokeBallSkin(){
    const sun = document.querySelector('.sun');
    if (!sun) return;
    sun.innerHTML = `<g><circle cx="50" cy="50" r="22" fill="#e63946" stroke="#000" stroke-width="1.5"></circle><circle cx="50" cy="27" r="22" fill="#f1faee" stroke="#000" stroke-width="1.5"></circle><circle cx="50" cy="50" r="6" fill="#000"></circle><line x1="28" y1="50" x2="72" y2="50" stroke="#000" stroke-width="1.5"></line></g>`;
  }

  collectBtn.addEventListener('click', ()=>{
    const coins = 5 + Math.floor(Math.random()*6);
    addCoins(coins);
    message.textContent = ['Nice!', 'Great!', 'You got coins!', 'Yay!'][Math.floor(Math.random()*4)];
    tapCoinsEl.textContent = `+${5 + Math.floor(Math.random()*6)}`;
  });

  function renderItems(){ itemsEl.innerHTML = '';
    items.forEach(it=>{
      const div = document.createElement('div'); div.className='item';
      const isLocked = it.premium && balance < it.price;
      div.innerHTML = `<div class="meta"><strong>${it.name}</strong><div style="opacity:.8">${it.price} coins</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = isLocked ? '🔒 Locked' : 'Buy';
      btn.disabled = isLocked;
      btn.style.opacity = isLocked ? '0.5' : '1';
      btn.addEventListener('click', ()=>attemptBuy(it));
      div.appendChild(btn);
      itemsEl.appendChild(div);
    })
  }

  async function attemptBuy(item){
    if (balance < item.price){ showToast('Not enough coins — keep playing!'); return; }
    try{
      const res = await fetch('/api/purchase', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ itemId:item.id, price:item.price }) });
      const data = await res.json();
      if (data && data.success){
        balance -= item.price; save(); renderBalance(); showToast('Purchase successful!'); applyItem(item); renderItems();
      } else {
        showToast('Purchase failed. Try again.');
      }
    }catch(e){ showToast('Network error.'); }
  }

  function applyItem(item){
    if (item.id === 'skin-flower') document.querySelector('.character').style.background = 'radial-gradient(circle at 30% 30%,#fff9f1,#ffcc80)';
    if (item.id === 'skin-sunglasses') document.querySelector('.sun circle').setAttribute('fill','#90caf9');
    if (item.id === 'skin-diamond'){
      const sun = document.querySelector('.sun');
      if (!sun) return;
      sun.innerHTML = `<circle cx="50" cy="50" r="22" fill="#b8a6ff" stroke="#7c6be8" stroke-width="1"></circle><text x="50" y="56" text-anchor="middle" font-size="20" fill="#fff" font-weight="bold">◆</text>`;
    }
    if (item.id === 'boost-2x'){
      showToast('2x booster active for 60s');
      const oldAdd = addCoins;
      window.addCoins = function(n){ oldAdd(n*2); };
      setTimeout(()=>{ window.addCoins = oldAdd; showToast('Booster ended'); }, 60000);
    }
  }

  window._app = { addCoins };
  renderBalance(); renderItems();
  if (milestone2000Reached) applyPokeBallSkin();
  else if (milestone1000Reached) applySun1000Milestone();
})();
