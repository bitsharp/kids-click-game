(function(){
  // Prevent double-tap zoom on mobile
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Disable pinch zoom
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  const coinEl = document.getElementById('coinCount');
  const coinElMobile = document.getElementById('coinCountMobile');
  const collectBtn = document.getElementById('collectBtn');
  const message = document.getElementById('message');
  const tapCoinsEl = document.getElementById('tapCoins');
  const itemsEl = document.getElementById('items');
  const toast = document.getElementById('toast');
  const resetBtn = document.getElementById('resetBtn');
  const battleResultModal = document.getElementById('battleResultModal');
  const resultContent = document.getElementById('resultContent');
  const resultCloseBtn = document.getElementById('resultCloseBtn');

  // Storage keys
  const STORAGE_KEY = 'sunny_coins_balance';
  const TOTAL_EARNED_KEY = 'sunny_coins_total_earned';
  const MILESTONE_1000_KEY = 'sunny_coins_1000_reached';
  const MILESTONE_2000_KEY = 'sunny_coins_2000_reached';
  const STREAK_KEY = 'sunny_coins_streak';
  const LAST_CLICK_KEY = 'sunny_coins_last_click';
  const COMBO_KEY = 'sunny_coins_combo';
  const CLICKS_KEY = 'sunny_coins_clicks';
  const REVOLVER_KEY = 'sunny_coins_revolver_owned';
  const PURCHASED_ITEMS_KEY = 'sunny_coins_purchased_items';
  const BOSS_WON_KEY = 'sunny_coins_boss_won_items';
  const WEAPON_KEY = 'sunny_coins_current_weapon';
  
  // Game state
  let balance = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  let revolverOwned = localStorage.getItem(REVOLVER_KEY) === 'true';
  let purchasedItems = JSON.parse(localStorage.getItem(PURCHASED_ITEMS_KEY) || '[]');
  let bossWonItems = JSON.parse(localStorage.getItem(BOSS_WON_KEY) || '[]');
  let currentWeapon = localStorage.getItem(WEAPON_KEY) || 'fists';
  let totalEarned = parseInt(localStorage.getItem(TOTAL_EARNED_KEY) || '0', 10);
  let milestone1000Reached = localStorage.getItem(MILESTONE_1000_KEY) === 'true';
  let milestone2000Reached = localStorage.getItem(MILESTONE_2000_KEY) === 'true';
  let streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
  let lastClickTime = parseInt(localStorage.getItem(LAST_CLICK_KEY) || '0', 10);
  let combo = parseInt(localStorage.getItem(COMBO_KEY) || '1', 10);
  let totalClicks = parseInt(localStorage.getItem(CLICKS_KEY) || '0', 10);
  let comboTimeout = null;

  const items = [
    { id: 'skin-flower', name: 'Flower Skin', price: 50 },
    { id: 'skin-sunglasses', name: 'Cool Glasses', price: 120 },
    { id: 'boost-2x', name: '2x Booster (1min)', price: 300 },
    { id: 'skin-diamond', name: 'Diamond Skin (1000 coins)', price: 1000, premium: true },
    { id: 'skin-revolver', name: 'Revolver Gun (5000 coins)', price: 5000, premium: true, requiresDiamond: true },
    { id: 'weapon-sword', name: '⚔️ Iron Sword', price: 500, weapon: true, damage: 35 },
    { id: 'weapon-axe', name: '🪓 Battle Axe', price: 1200, weapon: true, damage: 50 },
    { id: 'weapon-lance', name: '🔱 Holy Lance', price: 2500, weapon: true, damage: 65 }
  ];

  // Sound manager
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  function playSound(frequency, duration, type='sine') {
    try {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + duration);
    } catch(e) {}
  }

  function coinSound() {
    playSound(880, 0.1);
    setTimeout(() => playSound(1100, 0.1), 60);
  }

  function comboSound() {
    playSound(659, 0.08);
    setTimeout(() => playSound(784, 0.08), 60);
  }

  function successSound() {
    playSound(523, 0.15);
    setTimeout(() => playSound(659, 0.15), 100);
    setTimeout(() => playSound(784, 0.2), 180);
  }

  function milestoneSound() {
    playSound(523, 0.1);
    setTimeout(() => playSound(659, 0.1), 120);
    setTimeout(() => playSound(784, 0.1), 240);
    setTimeout(() => playSound(1047, 0.3), 360);
  }

  function buttonClickSound() {
    playSound(440, 0.08);
  }

  function shootSound() {
    playSound(200, 0.05);
    setTimeout(() => playSound(180, 0.1), 30);
  }

  // Boss Battle System
  const bossModal = document.getElementById('bossModal');
  const closeBossBtn = document.getElementById('closeBossBtn');
  const attackBtn = document.getElementById('attackBtn');
  const battleLog = document.getElementById('battleLog');
  
  const bosses = {
    diamond: {
      name: 'Shadow Guardian',
      emoji: '👹',
      maxHealth: 150,
      reward: 1000,
      difficulty: 'Medium'
    },
    revolver: {
      name: 'Dark Phantom',
      emoji: '💀',
      maxHealth: 250,
      reward: 5000,
      difficulty: 'Hard'
    }
  };
  
  let currentBattle = null;
  let bossHealth = 0;
  let playerHealth = 100;
  let battleInProgress = false;

  function startBossBattle(bossType) {
    const boss = bosses[bossType];
    if (!boss) return;
    
    currentBattle = { type: bossType, ...boss };
    bossHealth = boss.maxHealth;
    playerHealth = 100;
    battleInProgress = true;
    
    document.getElementById('bossTitle').textContent = `⚔️ ${boss.name}`;
    document.getElementById('bossName').textContent = `Difficulty: ${boss.difficulty} | Reward: ${boss.reward} coins`;
    document.getElementById('bossCharacter').textContent = boss.emoji;
    battleLog.innerHTML = '';
    addBattleLog(`${boss.name} appears! Prepare for battle!`, 'victory');
    const weaponInfo = getWeaponDamage();
    addBattleLog(`Equipped: ${weaponInfo.name}`, 'normal');
    
    bossModal.style.display = 'flex';
    bossModal.classList.add('battle-active');
    attackBtn.disabled = false;
    attackBtn.textContent = '⚡ Attack';
    updateBattleUI();
  }

  function updateBattleUI() {
    const maxHealth = currentBattle.maxHealth;
    document.getElementById('bossHealthFill').style.width = (bossHealth / maxHealth * 100) + '%';
    document.getElementById('bossStats').textContent = `HP: ${Math.max(0, bossHealth)}/${maxHealth}`;
    document.getElementById('playerHealth').textContent = Math.max(0, playerHealth);
    document.getElementById('playerHealthFill').style.width = (playerHealth / 100 * 100) + '%';
  }

  function addBattleLog(text, type = 'normal') {
    const entry = document.createElement('div');
    entry.className = 'battle-log-entry';
    if (type === 'damage') entry.classList.add('battle-log-damage');
    if (type === 'heal') entry.classList.add('battle-log-heal');
    if (type === 'victory') entry.classList.add('battle-log-victory');
    if (type === 'defeat') entry.classList.add('battle-log-defeat');
    entry.textContent = text;
    battleLog.appendChild(entry);
    battleLog.scrollTop = battleLog.scrollHeight;
  }

  function getWeaponDamage() {
    const weaponItem = items.find(it => it.id === currentWeapon);
    if (!weaponItem || !weaponItem.weapon) return { base: 20, max: 30, name: 'Fists' };
    return { base: weaponItem.damage - 15, max: 15, name: weaponItem.name };
  }

  function performAttack() {
    if (!battleInProgress || !currentBattle) return;
    
    attackBtn.disabled = true;
    attackBtn.textContent = '⏳ Boss attacking...';
    
    // Player attack with weapon
    const weaponInfo = getWeaponDamage();
    const playerDamage = weaponInfo.base + Math.floor(Math.random() * weaponInfo.max);
    bossHealth -= playerDamage;
    document.getElementById('bossCharacter').style.animation = 'none';
    setTimeout(() => {
      document.getElementById('bossCharacter').style.animation = 'shake 0.5s ease';
    }, 10);
    document.getElementById('damageDisplay').textContent = `-${playerDamage} ⚡`;
    document.getElementById('damageDisplay').style.color = '#4dd0e1';
    setTimeout(() => document.getElementById('damageDisplay').textContent = '', 800);
    
    addBattleLog(`You dealt ${playerDamage} damage with ${weaponInfo.name}!`, 'damage');
    playSound(880, 0.15);
    
    if (bossHealth <= 0) {
      endBattle(true);
      return;
    }
    
    updateBattleUI();
    
    // Boss counterattack
    setTimeout(() => {
      if (!battleInProgress) return;
      
      const bossDamage = 15 + Math.floor(Math.random() * 25);
      playerHealth -= bossDamage;
      document.getElementById('playerHealth').style.color = '#ff6b6b';
      addBattleLog(`${currentBattle.name} hit you for ${bossDamage} damage!`, 'damage');
      playSound(440, 0.2);
      
      if (playerHealth <= 0) {
        endBattle(false);
        return;
      }
      
      updateBattleUI();
      attackBtn.disabled = false;
      attackBtn.textContent = '⚡ Attack';
      document.getElementById('playerHealth').style.color = '#4dd0e1';
    }, 800);
  }

  function endBattle(victory) {
    battleInProgress = false;
    attackBtn.disabled = true;
    
    if (victory) {
      addBattleLog(`🎉 VICTORY! Earned ${currentBattle.reward} coins!`, 'victory');
      balance += currentBattle.reward;
      totalEarned += currentBattle.reward;
      
      // Mark the skin as won (free to buy)
      const skinId = currentBattle.type === 'diamond' ? 'skin-diamond' : 'skin-revolver';
      if (!bossWonItems.includes(skinId)) {
        bossWonItems.push(skinId);
      }
      
      // Unlock Diamond Skin milestone when beating Shadow Guardian
      if (currentBattle.type === 'diamond' && !milestone1000Reached) {
        milestone1000Reached = true;
        localStorage.setItem(MILESTONE_1000_KEY, 'true');
      }
      
      save();
      renderBalance();
      renderItems(); // Update store to show free skin
      milestoneSound();
      checkMilestones();
      
      setTimeout(() => {
        // Close battle modal
        bossModal.classList.remove('battle-active');
        bossModal.style.display = 'none';
        
        // Show victory result modal
        resultContent.innerHTML = `
          <div class="result-victory">🎉 VICTORY! 🎉</div>
          <div class="result-title">You defeated ${currentBattle.name}!</div>
          <div class="result-message">Excellent battle, warrior!</div>
          <div class="result-reward">+${currentBattle.reward} coins earned!</div>
          <div class="result-message">A new skin is now available for free!</div>
        `;
        battleResultModal.style.display = 'flex';
      }, 1000);
    } else {
      addBattleLog('💀 You were defeated... Try again!', 'defeat');
      playSound(200, 0.3);
      
      setTimeout(() => {
        // Close battle modal
        bossModal.classList.remove('battle-active');
        bossModal.style.display = 'none';
        
        // Show defeat result modal
        resultContent.innerHTML = `
          <div class="result-defeat">💀 DEFEATED! 💀</div>
          <div class="result-title">You lost this battle!</div>
          <div class="result-message">Don't worry! Collect more coins and try again.</div>
          <div class="result-message">Train harder and upgrade your weapons!</div>
        `;
        battleResultModal.style.display = 'flex';
      }, 800);
    }
  }

  closeBossBtn.addEventListener('click', () => {
    battleInProgress = false;
    attackBtn.disabled = false;
    bossModal.style.display = 'none';
    bossModal.classList.remove('battle-active');
  });

  resultCloseBtn.addEventListener('click', () => {
    battleResultModal.style.display = 'none';
  });

  attackBtn.addEventListener('click', performAttack);

  // Game functions
  function renderBalance() { 
    coinEl.textContent = balance;
    if (coinElMobile) coinElMobile.textContent = balance;
  }

  function save() { 
    localStorage.setItem(STORAGE_KEY, String(balance)); 
    localStorage.setItem(TOTAL_EARNED_KEY, String(totalEarned)); 
    localStorage.setItem(MILESTONE_1000_KEY, String(milestone1000Reached)); 
    localStorage.setItem(MILESTONE_2000_KEY, String(milestone2000Reached));
    localStorage.setItem(STREAK_KEY, String(streak));
    localStorage.setItem(LAST_CLICK_KEY, String(lastClickTime));
    localStorage.setItem(COMBO_KEY, String(combo));
    localStorage.setItem(CLICKS_KEY, String(totalClicks));
    localStorage.setItem(REVOLVER_KEY, String(revolverOwned));
    localStorage.setItem(PURCHASED_ITEMS_KEY, JSON.stringify(purchasedItems));
    localStorage.setItem(BOSS_WON_KEY, JSON.stringify(bossWonItems));
    localStorage.setItem(WEAPON_KEY, currentWeapon);
  }

  function showToast(text) { 
    toast.textContent = text; 
    toast.style.opacity = '1'; 
    setTimeout(() => { toast.style.opacity = '0'; }, 1600); 
  }

  function updateCombo() {
    clearTimeout(comboTimeout);
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    if (timeSinceLastClick < 3000) {
      combo = Math.min(combo + 1, 10);
      if (combo > 1) {
        comboSound();
        showToast(`🔥 Combo x${combo}!`);
      }
    } else {
      combo = 1;
    }
    
    lastClickTime = now;
    
    comboTimeout = setTimeout(() => {
      combo = 1;
      save();
    }, 3500);
  }

  function addCoins(n) { 
    updateCombo();
    const finalCoins = Math.floor(n * combo);
    balance += finalCoins; 
    totalEarned += finalCoins; 
    totalClicks++;
    save(); 
    renderBalance(); 
    renderItems();
    animateAdd(finalCoins); 
    coinSound(); 
    checkMilestones();
    checkRandomReward();
  }

  function checkRandomReward() {
    const random = Math.random();
    if (random < 0.02) {
      const bonus = 25;
      balance += bonus;
      showToast(`✨ Bonus! +${bonus} coins!`);
      animateAdd(bonus);
      successSound();
      save();
      renderBalance();
      renderItems();
    }
  }

  function animateAdd(n) { 
    const el = document.createElement('div'); 
    el.textContent = `+${n}`; 
    el.style.position = 'fixed'; 
    el.style.left = '50%'; 
    el.style.top = '50%'; 
    el.style.transform = 'translate(-50%,-50%)'; 
    el.style.fontSize = '32px'; 
    el.style.color = '#ff7043'; 
    el.style.fontWeight = '700'; 
    el.style.pointerEvents = 'none';
    el.style.textShadow = '0 2px 8px rgba(0,0,0,0.2)';
    el.style.zIndex = '999';
    document.body.appendChild(el); 
    setTimeout(() => el.style.transition = 'transform 800ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 800ms ease', 50); 
    setTimeout(() => { 
      el.style.transform = 'translate(-50%, -300px) scale(0.5)'; 
      el.style.opacity = '0'; 
    }, 50); 
    setTimeout(() => el.remove(), 900);
    createParticles(Math.min(n / 5, 20));
  }

  function shootBullets() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    shootSound();
    
    for (let i = 0; i < 8; i++) {
      const bullet = document.createElement('div');
      bullet.style.position = 'fixed';
      bullet.style.left = '50%';
      bullet.style.top = '50%';
      bullet.style.width = '8px';
      bullet.style.height = '8px';
      bullet.style.background = '#FFD54A';
      bullet.style.borderRadius = '50%';
      bullet.style.boxShadow = '0 0 4px #ff9800, 0 0 8px #ff7043';
      bullet.style.pointerEvents = 'none';
      bullet.style.zIndex = '997';
      
      const angle = (Math.PI * 2 * i) / 8;
      const velocity = 200;
      const x = Math.cos(angle) * velocity;
      const y = Math.sin(angle) * velocity;
      
      bullet.style.transition = 'all 600ms ease-out';
      container.appendChild(bullet);
      
      setTimeout(() => {
        bullet.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0)`;
        bullet.style.opacity = '0';
      }, 20);
      
      setTimeout(() => bullet.remove(), 620);
    }
  }

  function createParticles(coinCount) {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < coinCount; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'fixed';
      particle.style.left = '50%';
      particle.style.top = '50%';
      particle.style.width = '12px';
      particle.style.height = '12px';
      particle.style.background = 'radial-gradient(circle at 30% 30%, #ffd54a, #ff9800)';
      particle.style.borderRadius = '50%';
      particle.style.pointerEvents = 'none';
      particle.style.boxShadow = '0 2px 8px rgba(255,212,74,0.6)';
      particle.style.zIndex = '998';
      const angle = (Math.PI * 2 * i) / coinCount;
      const velocity = 120 + Math.random() * 100;
      const x = Math.cos(angle) * velocity;
      const y = Math.sin(angle) * velocity;
      particle.style.transition = 'all 800ms cubic-bezier(0.25,0.46,0.45,0.94)';
      container.appendChild(particle);
      setTimeout(() => {
        particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0)`;
        particle.style.opacity = '0';
      }, 20);
      setTimeout(() => particle.remove(), 820);
    }
  }

  function checkMilestones() {
    const milestones = [
      { key: '500', value: 500, message: '🎉 500 coins!' },
      { key: '1000', value: 1000, message: '🌟 1000 coins! Sun transformed!' },
      { key: '2000', value: 2000, message: '🔴 2000 coins! Pokéball unlocked!' },
      { key: '5000', value: 5000, message: '👑 5000 coins! You\'re a legend!' },
    ];

    let milestoneMet = false;
    milestones.forEach(m => {
      const storageKey = `milestone_${m.key}`;
      if (totalEarned >= m.value && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, 'true');
        milestoneSound();
        showToast(m.message);
        milestoneMet = true;
      }
    });

    if (!milestone1000Reached && totalEarned >= 1000) {
      milestone1000Reached = true;
      save();
      applySun1000Milestone();
      milestoneMet = true;
    }

    if (!milestone2000Reached && totalEarned >= 2000) {
      milestone2000Reached = true;
      save();
      applyPokeBallSkin();
      milestoneMet = true;
    }

    if (milestoneMet) {
      renderItems();
    }
  }

  function applySun1000Milestone() {
    const sun = document.querySelector('.sun');
    if (!sun) return;
    sun.innerHTML = `<defs><radialGradient id="goldenGlow" cx="50%" cy="50%"><stop offset="0%" style="stop-color:#fff700;stop-opacity:1" /><stop offset="100%" style="stop-color:#ffa500;stop-opacity:1" /></radialGradient></defs><circle cx="50" cy="50" r="22" fill="url(#goldenGlow)" stroke="#ff6b35" stroke-width="2"></circle><text x="50" y="56" text-anchor="middle" font-size="18" fill="#fff" font-weight="bold">⭐</text>`;
  }

  function applyPokeBallSkin() {
    const sun = document.querySelector('.sun');
    if (!sun) return;
    sun.innerHTML = `<g><circle cx="50" cy="50" r="22" fill="#e63946" stroke="#000" stroke-width="1.5"></circle><circle cx="50" cy="27" r="22" fill="#f1faee" stroke="#000" stroke-width="1.5"></circle><circle cx="50" cy="50" r="6" fill="#000"></circle><line x1="28" y1="50" x2="72" y2="50" stroke="#000" stroke-width="1.5"></line></g>`;
  }

  collectBtn.addEventListener('click', () => {
    if (revolverOwned) {
      shootBullets();
    } else {
      buttonClickSound();
    }
    const baseCoins = 5 + Math.floor(Math.random() * 6);
    addCoins(baseCoins);
    
    const messages = [`Nice! 👍`, `Great! 🎉`, `You got coins! 💰`, `Yay! 🌟`, `Awesome! 🚀`, `Keep going! 💪`];
    message.textContent = messages[Math.floor(Math.random() * messages.length)];
    tapCoinsEl.textContent = `+${baseCoins}${combo > 1 ? `x${combo}` : ''}`;
  });

  // Reset button
  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the game? All coins and skins will be lost!')) {
      // Clear all localStorage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOTAL_EARNED_KEY);
      localStorage.removeItem(MILESTONE_1000_KEY);
      localStorage.removeItem(MILESTONE_2000_KEY);
      localStorage.removeItem(STREAK_KEY);
      localStorage.removeItem(LAST_CLICK_KEY);
      localStorage.removeItem(COMBO_KEY);
      localStorage.removeItem(CLICKS_KEY);
      localStorage.removeItem(REVOLVER_KEY);
      localStorage.removeItem(PURCHASED_ITEMS_KEY);
      localStorage.removeItem(BOSS_WON_KEY);
      localStorage.removeItem(WEAPON_KEY);
      
      // Reset game state
      balance = 0;
      totalEarned = 0;
      milestone1000Reached = false;
      milestone2000Reached = false;
      streak = 0;
      lastClickTime = 0;
      combo = 1;
      totalClicks = 0;
      revolverOwned = false;
      purchasedItems = [];
      bossWonItems = [];
      currentWeapon = 'fists';
      
      // Reset UI
      renderBalance();
      renderItems();
      
      // Reset sun skin to default
      const sun = document.querySelector('.sun');
      if (sun) {
        sun.innerHTML = '<circle cx="50" cy="50" r="22" fill="#FFD54A"></circle>';
      }
      
      showToast('Game reset! Starting fresh! 🎮');
    }
  });

  function renderItems() { 
    itemsEl.innerHTML = '';
    items.forEach(it => {
      // Hide purchased items (don't show them in the store)
      if (purchasedItems.includes(it.id)) {
        return; // Skip this item, don't display it
      }
      
      const div = document.createElement('div'); 
      div.className = 'item';
      const requiresDiamondNotOwned = it.requiresDiamond && !milestone1000Reached;
      const isLocked = (it.premium && balance < it.price) || requiresDiamondNotOwned;
      const lockReason = requiresDiamondNotOwned ? ' (Need Diamond)' : '';
      const isBossWon = bossWonItems.includes(it.id);
      const isWeapon = it.weapon;
      const isEquipped = isWeapon && currentWeapon === it.id;
      
      let btnText = 'Buy';
      let priceText = it.price;
      
      if (isWeapon) {
        if (isEquipped) {
          btnText = '✅ Equipped';
        } else if (purchasedItems.includes(it.id)) {
          btnText = '🔄 Equip';
        } else {
          btnText = isLocked ? '🔒 Locked' : 'Buy';
        }
      } else if (it.id === 'skin-diamond') {
        if (isBossWon) {
          btnText = '🎁 FREE';
          priceText = 'FREE!';
        } else {
          btnText = isLocked ? '🔒 Locked' : '⚔️ Battle Boss';
        }
      } else if (it.id === 'skin-revolver') {
        if (isBossWon) {
          btnText = '🎁 FREE';
          priceText = 'FREE!';
        } else {
          btnText = isLocked ? '🔒 Locked' : '⚔️ Battle Boss';
        }
      } else {
        btnText = isLocked ? '🔒 Locked' : 'Buy';
      }
      
      div.innerHTML = `<div class="meta"><strong>${it.name}</strong><div style="opacity:.8">${priceText} coins${lockReason}</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = btnText;
      btn.disabled = (isLocked && !isBossWon) || isEquipped;
      btn.style.opacity = ((isLocked && !isBossWon) || isEquipped) ? '0.5' : '1';
      if (!isLocked || isBossWon || (isWeapon && purchasedItems.includes(it.id))) {
        btn.addEventListener('click', () => attemptBuy(it));
      }
      div.appendChild(btn);
      itemsEl.appendChild(div);
    })
  }

  async function attemptBuy(item) {
    // Handle weapon equipping (if already purchased, just equip it)
    if (item.weapon && purchasedItems.includes(item.id)) {
      currentWeapon = item.id;
      save();
      renderItems();
      showToast(`Equipped ${item.name}! +${item.damage} damage!`);
      return;
    }
    
    // For premium skins that haven't been won via boss battle, start a boss battle instead
    if (item.id === 'skin-diamond' && !bossWonItems.includes('skin-diamond')) {
      startBossBattle('diamond');
      return;
    }
    if (item.id === 'skin-revolver' && !bossWonItems.includes('skin-revolver')) {
      // Check if diamond battle has been won first
      if (!bossWonItems.includes('skin-diamond')) {
        showToast('⚔️ Defeat Shadow Guardian first!');
        return;
      }
      startBossBattle('revolver');
      return;
    }
    
    // Handle boss-won free skins (0 coins needed)
    const isBossWon = bossWonItems.includes(item.id);
    const actualPrice = isBossWon ? 0 : item.price;
    
    // STRICT validation: ensure we have enough coins BEFORE attempting purchase
    if (balance < actualPrice) { 
      showToast('Not enough coins — keep playing!'); 
      return; 
    }
    
    const requiresDiamond = item.requiresDiamond && !milestone1000Reached;
    if (requiresDiamond) { 
      showToast('You need to unlock Diamond Skin first!'); 
      return; 
    }
    
    try {
      const res = await fetch('/api/purchase', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ itemId: item.id, price: actualPrice, currentBalance: balance }) 
      });
      const data = await res.json();
      
      if (data && data.success) {
        // Double-check balance is still sufficient before deducting
        if (balance >= actualPrice) {
          buttonClickSound();
          balance -= actualPrice;
          // Ensure balance never goes negative
          if (balance < 0) balance = 0;
          // Mark item as purchased
          if (!purchasedItems.includes(item.id)) {
            purchasedItems.push(item.id);
          }
          
          // If it's a weapon, equip it immediately
          if (item.weapon) {
            currentWeapon = item.id;
          }
          
          save(); 
          renderBalance(); 
          successSound(); 
          let message = isBossWon ? 'Skin acquired for free! 🎁' : 'Purchase successful! 🎁';
          if (item.weapon) {
            message = `${item.name} equipped! +${item.damage} damage!`;
          }
          showToast(message); 
          applyItem(item); 
          renderItems();
        } else {
          // Edge case: balance changed between check and purchase
          showToast('Balance changed. Please try again.');
          renderBalance();
        }
      } else {
        showToast('Purchase failed. Try again.');
      }
    } catch (e) { 
      showToast('Network error.'); 
    }
  }

  function applyItem(item) {
    if (item.id === 'skin-flower') document.querySelector('.character').style.background = 'radial-gradient(circle at 30% 30%,#fff9f1,#ffcc80)';
    if (item.id === 'skin-sunglasses') document.querySelector('.sun circle').setAttribute('fill', '#90caf9');
    if (item.id === 'skin-diamond') {
      const sun = document.querySelector('.sun');
      if (!sun) return;
      sun.innerHTML = `<circle cx="50" cy="50" r="22" fill="#b8a6ff" stroke="#7c6be8" stroke-width="1"></circle><text x="50" y="56" text-anchor="middle" font-size="20" fill="#fff" font-weight="bold">◆</text>`;
    }
    if (item.id === 'skin-revolver') {
      revolverOwned = true;
      save();
      const sun = document.querySelector('.sun');
      if (!sun) return;
      sun.innerHTML = `<g transform="scale(0.75)">
        <!-- Barrel -->
        <rect x="45" y="42" width="35" height="8" rx="2" fill="#5a7c8f" stroke="#2d3e50" stroke-width="1.5"/>
        <rect x="50" y="44" width="30" height="4" fill="#8fa4b8"/>
        <!-- Cylinder -->
        <circle cx="40" cy="50" r="12" fill="#8b6f47" stroke="#5c4b35" stroke-width="2"/>
        <!-- Cylinder Details -->
        <circle cx="35" cy="45" r="1.5" fill="#c0a080"/>
        <circle cx="38" cy="42" r="1.5" fill="#c0a080"/>
        <circle cx="42" cy="41" r="1.5" fill="#c0a080"/>
        <circle cx="46" cy="42" r="1.5" fill="#c0a080"/>
        <!-- Frame -->
        <path d="M 40 62 Q 35 68 32 72 L 32 68 Q 35 62 40 62" fill="#8b6f47" stroke="#5c4b35" stroke-width="1.5"/>
        <!-- Trigger Guard -->
        <path d="M 35 58 L 35 65 Q 32 67 28 65" fill="none" stroke="#5a7c8f" stroke-width="2" stroke-linecap="round"/>
        <!-- Trigger -->
        <ellipse cx="33" cy="63" rx="3" ry="4" fill="#5c4b35" stroke="#3d2e23" stroke-width="1"/>
        <!-- Hammer -->
        <path d="M 50 35 L 52 32 L 54 35 Z" fill="#8b6f47" stroke="#5c4b35" stroke-width="1.5"/>
        <!-- Sight -->
        <rect x="68" y="40" width="2" height="6" fill="#5a7c8f" stroke="#2d3e50" stroke-width="1"/>
      </g>`;
      collectBtn.innerHTML = '<span class="tap-text">💥 SHOOT!</span><span id="tapCoins" class="tap-coins">+2</span>';
      showToast('🔫 Revolver unlocked! Tap to shoot!');
    }
    if (item.id === 'boost-2x') {
      showToast('2x booster active for 60s ⚡');
      const oldAdd = addCoins;
      window.addCoins = function(n) { oldAdd(n * 2); };
      setTimeout(() => { window.addCoins = oldAdd; showToast('Booster ended'); }, 60000);
    }
  }

  window._app = { addCoins };
  renderBalance(); 
  renderItems();
  if (revolverOwned) {
    const sun = document.querySelector('.sun');
    if (sun) {
      sun.innerHTML = `<g transform="scale(0.75)">
        <!-- Barrel -->
        <rect x="45" y="42" width="35" height="8" rx="2" fill="#5a7c8f" stroke="#2d3e50" stroke-width="1.5"/>
        <rect x="50" y="44" width="30" height="4" fill="#8fa4b8"/>
        <!-- Cylinder -->
        <circle cx="40" cy="50" r="12" fill="#8b6f47" stroke="#5c4b35" stroke-width="2"/>
        <!-- Cylinder Details -->
        <circle cx="35" cy="45" r="1.5" fill="#c0a080"/>
        <circle cx="38" cy="42" r="1.5" fill="#c0a080"/>
        <circle cx="42" cy="41" r="1.5" fill="#c0a080"/>
        <circle cx="46" cy="42" r="1.5" fill="#c0a080"/>
        <!-- Frame -->
        <path d="M 40 62 Q 35 68 32 72 L 32 68 Q 35 62 40 62" fill="#8b6f47" stroke="#5c4b35" stroke-width="1.5"/>
        <!-- Trigger Guard -->
        <path d="M 35 58 L 35 65 Q 32 67 28 65" fill="none" stroke="#5a7c8f" stroke-width="2" stroke-linecap="round"/>
        <!-- Trigger -->
        <ellipse cx="33" cy="63" rx="3" ry="4" fill="#5c4b35" stroke="#3d2e23" stroke-width="1"/>
        <!-- Hammer -->
        <path d="M 50 35 L 52 32 L 54 35 Z" fill="#8b6f47" stroke="#5c4b35" stroke-width="1.5"/>
        <!-- Sight -->
        <rect x="68" y="40" width="2" height="6" fill="#5a7c8f" stroke="#2d3e50" stroke-width="1"/>
      </g>`;
    }
    collectBtn.innerHTML = '<span class="tap-text">💥 SHOOT!</span><span id="tapCoins" class="tap-coins">+2</span>';
  } else if (milestone2000Reached) {
    applyPokeBallSkin();
  } else if (milestone1000Reached) {
    applySun1000Milestone();
  }
})();
