(function(){
  const coinEl = document.getElementById('coinCount');
  const collectBtn = document.getElementById('collectBtn');
  const message = document.getElementById('message');
  const tapCoinsEl = document.getElementById('tapCoins');
  const itemsEl = document.getElementById('items');
  const toast = document.getElementById('toast');

  const STORAGE_KEY = 'sunny_coins_balance';
  let balance = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

  const items = [
    { id: 'skin-flower', name: 'Flower Skin', price: 50 },
    { id: 'skin-sunglasses', name: 'Cool Glasses', price: 120 },
    { id: 'boost-2x', name: '2x Booster (1min)', price: 300 },
    { id: 'skin-diamond', name: 'Diamond Skin (1000 coins)', price: 1000, premium: true }
  ];

  function renderBalance(){ coinEl.textContent = balance; }
  function save(){ localStorage.setItem(STORAGE_KEY, String(balance)); }
  function showToast(text){ toast.textContent = text; toast.style.opacity = '1'; setTimeout(()=>{ toast.style.opacity='0'; }, 1600); }

  function addCoins(n){ balance += n; save(); renderBalance(); animateAdd(n); }

  function animateAdd(n){ const el = document.createElement('div'); el.textContent = `+${n}`; el.style.position='absolute'; el.style.left='50%'; el.style.top='40%'; el.style.transform='translate(-50%,-50%)'; el.style.fontSize='22px'; el.style.color='#ff7043'; el.style.fontWeight='700'; el.style.pointerEvents='none'; document.body.appendChild(el); setTimeout(()=>el.style.transition='transform 700ms ease, opacity 700ms',50); setTimeout(()=>{ el.style.transform='translate(-50%, -260px)'; el.style.opacity='0'; },50); setTimeout(()=>el.remove(),900);
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
})();
