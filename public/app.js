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
  const message = document.getElementById('message');
  const tapCoinsEl = document.getElementById('tapCoins');
  const itemsEl = document.getElementById('items');
  const toast = document.getElementById('toast');
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const openShopMenu = document.getElementById('openShopMenu');
  const resetBtnMenu = document.getElementById('resetBtnMenu');
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
  const BOSS_LEVEL_KEY = 'sunny_coins_boss_level';
  const HIGHEST_COIN_MILESTONE_KEY = 'sunny_coins_highest_milestone';
  
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
  let bossLevel = parseInt(localStorage.getItem(BOSS_LEVEL_KEY) || '0', 10);
  let highestCoinMilestone = parseInt(localStorage.getItem(HIGHEST_COIN_MILESTONE_KEY) || '0', 10);
  let comboTimeout = null;

  const items = [
    { id: 'boost-2x', name: '2x Booster (1min)', price: 300 },
    { id: 'weapon-sword', name: '⚔️ Iron Sword', price: 5500, weapon: true, damage: 60, unlockBossLevel: 0 },
    { id: 'weapon-axe', name: '🪓 Battle Axe', price: 6200, weapon: true, damage: 85, unlockBossLevel: 1 },
    { id: 'weapon-lance', name: '🔱 Holy Lance', price: 7500, weapon: true, damage: 110, unlockBossLevel: 2 },
    { id: 'weapon-katana', name: '🗡️ Shadow Katana', price: 9000, weapon: true, damage: 140, unlockBossLevel: 3 },
    { id: 'weapon-hammer', name: '🔨 Thunder Hammer', price: 11000, weapon: true, damage: 175, unlockBossLevel: 4 },
    { id: 'weapon-bow', name: '🏹 Dragon Bow', price: 13500, weapon: true, damage: 215, unlockBossLevel: 5 }
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
  
  const bossTemplates = [
    { name: 'Shadow Guardian', emoji: '👹', baseHealth: 150, baseReward: 1000 },
    { name: 'Dark Phantom', emoji: '💀', baseHealth: 150, baseReward: 1000 },
    { name: 'Fire Dragon', emoji: '🐉', baseHealth: 150, baseReward: 1000 },
    { name: 'Ice Demon', emoji: '😈', baseHealth: 150, baseReward: 1000 },
    { name: 'Ancient Wyrm', emoji: '🐲', baseHealth: 150, baseReward: 1000 },
    { name: 'Void Beast', emoji: '👾', baseHealth: 150, baseReward: 1000 },
    { name: 'Storm Titan', emoji: '⚡', baseHealth: 150, baseReward: 1000 },
    { name: 'Chaos Lord', emoji: '🔥', baseHealth: 150, baseReward: 1000 }
  ];
  
  function getBossForLevel(level) {
    const templateIndex = level % bossTemplates.length;
    const template = bossTemplates[templateIndex];
    const healthIncrease = Math.floor(level / bossTemplates.length) * 100;
    const tier = Math.floor(level / bossTemplates.length) + 1;
    
    return {
      name: `${template.name} (Tier ${tier})`,
      emoji: template.emoji,
      maxHealth: template.baseHealth + (level * 100) + healthIncrease,
      reward: template.baseReward + (level * 500),
      difficulty: level < 3 ? 'Easy' : level < 6 ? 'Medium' : level < 10 ? 'Hard' : 'Extreme',
      level: level
    };
  }
  
  function isBossUnlocked(level) {
    // Bosses unlock purely based on total coins earned (every 5000 coins)
    const requiredMilestone = level * 5000;
    return totalEarned >= requiredMilestone;
  }
  
  function getNextBossUnlockRequirement() {
    const nextLevel = bossLevel;
    const requiredMilestone = nextLevel * 5000;
    const coinsNeeded = Math.max(0, requiredMilestone - totalEarned);
    return { requiredMilestone, coinsNeeded, isUnlocked: isBossUnlocked(nextLevel) };
  }
  
  let currentBattle = null;
  let bossHealth = 0;
  let playerHealth = 100;
  let battleInProgress = false;
  let currentMathQuestion = null;
  let waitingForAnswer = false;

  function startBossBattle(bossType) {
    // Check if boss is unlocked
    if (!isBossUnlocked(bossLevel)) {
      const requirement = getNextBossUnlockRequirement();
      showToast(`🔒 Next boss unlocks at ${requirement.requiredMilestone} total coins! (${requirement.coinsNeeded} more needed)`);
      return;
    }
    
    // For legacy boss calls (diamond/revolver), use boss level system
    let boss;
    if (bossType === 'diamond' || bossType === 'revolver' || bossType === 'next') {
      boss = getBossForLevel(bossLevel);
    } else {
      boss = getBossForLevel(bossLevel);
    }
    
    currentBattle = { ...boss };
    bossHealth = boss.maxHealth;
    playerHealth = 100;
    battleInProgress = true;
    
    document.getElementById('bossTitle').textContent = `⚔️ ${boss.name}`;
    document.getElementById('bossName').textContent = `Difficulty: ${boss.difficulty} | Reward: ${boss.reward} coins`;
    document.getElementById('bossCharacter').textContent = boss.emoji;
    
    // Use currently equipped weapon, no selection needed
    const weaponInfo = getWeaponDamage(currentWeapon);
    addBattleLog(`${boss.name} appears!`, 'victory');
    addBattleLog(`Fighting with: ${weaponInfo.name} (${weaponInfo.base}-${weaponInfo.base + weaponInfo.max} damage)`, 'normal');
    
    // Hide weapon selector (not needed)
    document.getElementById('weaponSelector').style.display = 'none';
    
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
    // Battle log element removed for UI simplicity
    // This function is kept for code compatibility but does nothing
    return;
  }

  function getWeaponDamage(weaponId = null) {
    const weaponToUse = weaponId || currentWeapon;
    const weaponItem = items.find(it => it.id === weaponToUse);
    if (!weaponItem || !weaponItem.weapon) return { base: 15, max: 25, name: '👊 Fists', id: 'fists' };
    return { base: weaponItem.damage - 20, max: 30, name: weaponItem.name, id: weaponItem.id };
  }
  
  function performAttack() {
    console.log('performAttack called!', {battleInProgress, currentBattle, waitingForAnswer});
    if (!battleInProgress || !currentBattle || waitingForAnswer) return;
    
    attackBtn.disabled = true;
    attackBtn.textContent = '🧮 Solve...';
    
    showMathQuestion();
  }

  function generateMathQuestion() {
    const operations = ['+', '-', '×', '÷'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, correctAnswer;
    
    const difficulty = Math.min(10, bossLevel + 1);
    
    switch(operation) {
      case '+':
        num1 = Math.floor(Math.random() * (10 + difficulty * 5)) + 1;
        num2 = Math.floor(Math.random() * (10 + difficulty * 5)) + 1;
        correctAnswer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * (10 + difficulty * 5)) + 10;
        num2 = Math.floor(Math.random() * num1) + 1;
        correctAnswer = num1 - num2;
        break;
      case '×':
        num1 = Math.floor(Math.random() * (5 + difficulty)) + 1;
        num2 = Math.floor(Math.random() * (5 + difficulty)) + 1;
        correctAnswer = num1 * num2;
        break;
      case '÷':
        num2 = Math.floor(Math.random() * (5 + Math.floor(difficulty / 2))) + 2;
        correctAnswer = Math.floor(Math.random() * (5 + difficulty)) + 1;
        num1 = num2 * correctAnswer;
        break;
    }
    
    // Generate wrong answers
    const wrongAnswers = new Set();
    while(wrongAnswers.size < 3) {
      let wrong;
      if(operation === '÷') {
        wrong = correctAnswer + Math.floor(Math.random() * 6) - 3;
      } else {
        const offset = Math.floor(Math.random() * 20) - 10;
        wrong = correctAnswer + offset;
      }
      if(wrong !== correctAnswer && wrong > 0) {
        wrongAnswers.add(wrong);
      }
    }
    
    const options = [correctAnswer, ...Array.from(wrongAnswers)];
    // Shuffle options
    for(let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    return { num1, num2, operation, correctAnswer, options };
  }
  
  function showMathQuestion() {
    console.log('showMathQuestion called!');
    if(waitingForAnswer) return;
    
    waitingForAnswer = true;
    currentMathQuestion = generateMathQuestion();
    
    const mathOverlay = document.getElementById('mathOverlay');
    const mathQuestionEl = document.getElementById('mathQuestion');
    const mathOptionsEl = document.getElementById('mathOptions');
    
    console.log('Elements:', {mathOverlay, mathQuestionEl, mathOptionsEl});
    console.log('Question:', currentMathQuestion);
    
    mathQuestionEl.textContent = `${currentMathQuestion.num1} ${currentMathQuestion.operation} ${currentMathQuestion.num2} = ?`;
    mathOptionsEl.innerHTML = '';
    
    currentMathQuestion.options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'math-option';
      btn.textContent = option;
      btn.onclick = () => checkAnswer(option);
      mathOptionsEl.appendChild(btn);
    });
    
    mathOverlay.style.display = 'flex';
    playSound(600, 0.1);
    console.log('Math overlay shown!');
  }
  
  function checkAnswer(selectedAnswer) {
    const mathOverlay = document.getElementById('mathOverlay');
    mathOverlay.style.display = 'none';
    waitingForAnswer = false;
    
    if(selectedAnswer === currentMathQuestion.correctAnswer) {
      // Correct! Execute attack
      playSound(1200, 0.15);
      executeAttack();
    } else {
      // Wrong! Player takes damage and no attack
      playSound(300, 0.2);
      playerHealth -= 15;
      
      if(playerHealth <= 0) {
        endBattle(false);
        return;
      }
      
      updateBattleUI();
      showToast(`❌ Wrong! Correct answer: ${currentMathQuestion.correctAnswer}`);
      
      // Boss attacks anyway
      setTimeout(() => {
        if(!battleInProgress) return;
        const bossDamage = 15 + Math.floor(Math.random() * 25);
        playerHealth -= bossDamage;
        playSound(440, 0.2);
        
        if(playerHealth <= 0) {
          endBattle(false);
          return;
        }
        
        updateBattleUI();
        attackBtn.disabled = false;
        attackBtn.textContent = '⚡ Attack';
      }, 800);
    }
  }
  
  function executeAttack() {
    // Player attack with weapon
    const weaponInfo = getWeaponDamage();
    const playerDamage = weaponInfo.base + Math.floor(Math.random() * weaponInfo.max);
    bossHealth -= playerDamage;
    
    showToast(`✅ Correct! ${playerDamage} damage!`);
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
      addBattleLog(`${currentBattle.name} hit you for ${bossDamage} damage!`, 'damage');
      playSound(440, 0.2);
      
      if (playerHealth <= 0) {
        endBattle(false);
        return;
      }
      
      updateBattleUI();
      attackBtn.disabled = false;
      attackBtn.textContent = '⚡ Attack';
    }, 800);
  }

  function endBattle(victory) {
    battleInProgress = false;
    attackBtn.disabled = true;
    
    if (victory) {
      addBattleLog(`🎉 VICTORY! Earned ${currentBattle.reward} coins!`, 'victory');
      balance += currentBattle.reward;
      totalEarned += currentBattle.reward;
      
      // Increment boss level for infinite progression
      bossLevel++;
      localStorage.setItem(BOSS_LEVEL_KEY, bossLevel.toString());
      
      // Update challenge boss button state
      updateChallengeBossButton();
      
      save();
      renderBalance();
      renderItems(); // Update store to show free skin
      milestoneSound();
      checkMilestones();
      
      setTimeout(() => {
        // Close battle modal
        bossModal.classList.remove('battle-active');
        bossModal.style.display = 'none';
        
        // Show victory result modal with next boss option
        const nextBoss = getBossForLevel(bossLevel);
        
        resultContent.innerHTML = `
          <div class="result-victory">🎉 VICTORY! 🎉</div>
          <div class="result-title">You defeated ${currentBattle.name}!</div>
          <div class="result-message">Excellent battle, warrior!</div>
          <div class="result-reward">+${currentBattle.reward} coins earned!</div>
          <div class="next-boss-info">
            <p style="margin: 15px 0 5px 0; font-weight: bold;">Next Challenge:</p>
            <p style="margin: 5px 0;">${nextBoss.emoji} ${nextBoss.name}</p>
            <p style="margin: 5px 0; font-size: 14px;">HP: ${nextBoss.maxHealth} | Reward: ${nextBoss.reward} coins</p>
            <button id="nextBossBtn" class="next-boss-btn" style="margin-top: 15px; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;">⚔️ Fight Next Boss</button>
          </div>
        `;
        battleResultModal.style.display = 'flex';
        
        // Add next boss button handler
        setTimeout(() => {
          const nextBossBtn = document.getElementById('nextBossBtn');
          if (nextBossBtn) {
            nextBossBtn.addEventListener('click', () => {
              battleResultModal.style.display = 'none';
              startBossBattle('next');
            });
          }
        }, 100);
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
  
  const challengeBossBtn = document.getElementById('challengeBossBtn');
  
  function updateChallengeBossButton() {
    if (!challengeBossBtn) return;
    
    const requirement = getNextBossUnlockRequirement();
    const nextBoss = getBossForLevel(bossLevel);
    
    if (requirement.isUnlocked) {
      challengeBossBtn.disabled = false;
      challengeBossBtn.textContent = `⚔️ Challenge ${nextBoss.emoji} Boss #${bossLevel + 1}`;
      challengeBossBtn.title = `Fight ${nextBoss.name}!`;
      challengeBossBtn.style.opacity = '1';
    } else {
      challengeBossBtn.disabled = true;
      challengeBossBtn.textContent = `🔒 Boss Locked`;
      challengeBossBtn.title = `Reach ${requirement.requiredMilestone} total coins to unlock (${requirement.coinsNeeded} more needed)`;
      challengeBossBtn.style.opacity = '0.6';
    }
  }
  
  if (challengeBossBtn) {
    challengeBossBtn.addEventListener('click', () => {
      startBossBattle('next');
    });
    // Initialize button state
    updateChallengeBossButton();
  }

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
    updateChallengeBossButton();
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

    // Check for boss unlock milestones (every 5000 coins)
    const currentMilestone = Math.floor(totalEarned / 5000) * 5000;
    if (currentMilestone > highestCoinMilestone) {
      highestCoinMilestone = currentMilestone;
      localStorage.setItem(HIGHEST_COIN_MILESTONE_KEY, highestCoinMilestone.toString());
      
      // Notify about boss unlock if conditions are met
      if (currentMilestone > 0 && isBossUnlocked(bossLevel)) {
        const nextBoss = getBossForLevel(bossLevel);
        showToast(`⚔️ New boss unlocked: ${nextBoss.name}!`);
        updateChallengeBossButton();
        milestoneMet = true;
      }
    }

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

  const character = document.getElementById('character');
  
  character.addEventListener('click', () => {
    if (revolverOwned) {
      shootBullets();
    } else {
      buttonClickSound();
    }
    const baseCoins = 5 + Math.floor(Math.random() * 6);
    addCoins(baseCoins);
    
    const messages = [`Nice! 👍`, `Great! 🎉`, `You got coins! 💰`, `Yay! 🌟`, `Awesome! 🚀`, `Keep going! 💪`];
    message.textContent = messages[Math.floor(Math.random() * messages.length)];
    
    // Show tap feedback
    tapCoinsEl.textContent = `+${baseCoins}${combo > 1 ? `x${combo}` : ''}`;
    tapCoinsEl.style.opacity = '1';
    setTimeout(() => {
      tapCoinsEl.style.opacity = '0';
    }, 800);
  });

  // Menu button toggle
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = dropdownMenu.style.display === 'block';
    dropdownMenu.style.display = isVisible ? 'none' : 'block';
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && e.target !== menuBtn) {
      dropdownMenu.style.display = 'none';
    }
  });

  // Open shop menu item
  openShopMenu.addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
    const storeEl = document.querySelector('.store');
    storeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('🏪 Shop opened!');
  });

  // Reset button from menu
  resetBtnMenu.addEventListener('click', () => {
    dropdownMenu.style.display = 'none';
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
      localStorage.removeItem(BOSS_LEVEL_KEY);
      localStorage.removeItem(HIGHEST_COIN_MILESTONE_KEY);
      
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
      bossLevel = 0;
      highestCoinMilestone = 0;
      
      // Reset UI
      renderBalance();
      renderItems();
      updateChallengeBossButton();
      
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
    
    // Find the first unpurchased weapon
    const weapons = items.filter(it => it.weapon);
    let nextWeaponToShow = null;
    
    for (let i = 0; i < weapons.length; i++) {
      if (!purchasedItems.includes(weapons[i].id)) {
        nextWeaponToShow = weapons[i];
        break;
      }
    }
    
    console.log('Rendering items. Next weapon to show:', nextWeaponToShow);
    console.log('Purchased items:', purchasedItems);
    
    items.forEach(it => {
      const div = document.createElement('div'); 
      div.className = 'item';
      
      const isWeapon = it.weapon;
      const isPurchased = purchasedItems.includes(it.id);
      
      // For weapons: only show the next unpurchased weapon
      if (isWeapon) {
        console.log(`Checking weapon ${it.name}: purchased=${isPurchased}, isNext=${nextWeaponToShow && it.id === nextWeaponToShow.id}`);
        
        // If this weapon is already purchased, don't show it
        if (isPurchased) {
          console.log(`  Skipping ${it.name} - already purchased`);
          return; // Skip this weapon
        }
        // If this is not the next weapon to show, skip it
        if (nextWeaponToShow && it.id !== nextWeaponToShow.id) {
          console.log(`  Skipping ${it.name} - not the next weapon`);
          return; // Skip this weapon
        }
        // If all weapons are purchased, don't show any
        if (!nextWeaponToShow) {
          console.log(`  Skipping ${it.name} - all weapons purchased`);
          return; // Skip this weapon
        }
        
        console.log(`  Showing ${it.name} - this is the next weapon!`);
      }
      
      const isEquipped = isWeapon && currentWeapon === it.id;
      
      // For weapons, check if unlocked based on boss level
      const weaponUnlocked = !isWeapon || (it.unlockBossLevel !== undefined && totalEarned >= it.unlockBossLevel * 5000);
      
      let btnText = 'Buy';
      let priceText = it.price;
      let lockReason = '';
      
      if (isWeapon) {
        if (!weaponUnlocked) {
          const requiredCoins = it.unlockBossLevel * 5000;
          lockReason = ` (Unlocks at ${requiredCoins} coins)`;
          btnText = '🔒 Locked';
        } else {
          btnText = balance < it.price ? '💰 Need More Coins' : 'Buy';
        }
      }
      
      div.innerHTML = `<div class="meta"><strong>${it.name}</strong><div style="opacity:.8">${priceText} coins${lockReason}</div></div>`;
      const btn = document.createElement('button');
      btn.textContent = btnText;
      btn.disabled = !weaponUnlocked || (!isPurchased && balance < it.price);
      btn.style.opacity = (!weaponUnlocked || (!isPurchased && balance < it.price)) ? '0.5' : '1';
      
      if (weaponUnlocked && (balance >= it.price || !isWeapon)) {
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
    
    // STRICT validation: ensure we have enough coins BEFORE attempting purchase
    if (balance < item.price) { 
      showToast('Not enough coins — keep playing!'); 
      return; 
    }
    
    try {
      const res = await fetch('/api/purchase', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ itemId: item.id, price: item.price, currentBalance: balance }) 
      });
      const data = await res.json();
      
      if (data && data.success) {
        // Double-check balance is still sufficient before deducting
        if (balance >= item.price) {
          buttonClickSound();
          balance -= item.price;
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
          let message = 'Purchase successful! 🎁';
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
  if (milestone2000Reached) {
    applyPokeBallSkin();
  } else if (milestone1000Reached) {
    applySun1000Milestone();
  }
})();
