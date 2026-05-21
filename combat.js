// combat.js - handles battle logic and rendering
let inCombat = false;
let battleMenuIndex = 0;

let battlePlayer = null;
let battleEnemy = null;

let battleState = "player"; // "player" or "enemy"

const battleCanvas = document.getElementById("battleCanvas");
const bctx = battleCanvas.getContext("2d");

const RANDOM_ENEMIES = [
    { spriteX: 28*16, spriteY: 1*16 },   // alt enemy 1
    { spriteX: 28*16, spriteY: 3*16 },   // alt enemy 2
    { spriteX: 28*16, spriteY: 7*16 },   // alt enemy 3
    { spriteX: 28*16, spriteY: 9*16 }    // alt enemy 4
];

// Add after RANDOM_ENEMIES
const BOSSES = {
    boss: {
        name: "Dungeon Lord",
        level: 10,
        maxHP: 200,
        atk: 25,
        def: 10,
        spriteX: 7 * 16, // set to the tile in your dungeon sprite sheet
        spriteY: 28 * 16
    }
};


// Store the last enemy ID for boss tracking
if (typeof dungeonSheet === "undefined") {
    console.warn("dungeonSheet not loaded yet");
}

// Start combat with a given enemy ID
function startCombat(enemyId) {
    lastBattleEnemyId = enemyId || null;
    inCombat = true;

    // player snapshot
    battlePlayer = {
        hp: playerStats.hp,
        mp: playerStats.mp,
        maxHP: playerStats.maxHP,
        maxMP: playerStats.maxMP,
        atk: playerStats.atk,
        def: playerStats.def,
        sprite: dungeonSheet,
        spriteX: player.spriteX,
        spriteY: player.spriteY
    };

    // If an explicit boss id was passed and exists in BOSSES, use it
    if (enemyId && BOSSES[enemyId]) {
        const b = BOSSES[enemyId];
        battleEnemy = {
            name: b.name || enemyId,
            level: b.level || 1,
            hp: b.maxHP,
            maxHP: b.maxHP,
            atk: b.atk,
            def: b.def,
            sprite: dungeonSheet,
            spriteX: b.spriteX,
            spriteY: b.spriteY
        };
    } else {
        // fallback to a simple default enemy
        battleEnemy = {
            hp: 30,
            maxHP: 30,
            atk: 10,
            def: 3,
            sprite: dungeonSheet,
            spriteX: 28 * 16,
            spriteY: 1 * 16
        };
    }

    battleState = "player";
    battleMenuIndex = 0;

    document.getElementById("battleScreen").style.display = "block";

    updateBattleMenu();
    updateBattleStats();
    renderBattle();
    playMusic("battle");
}


// Get random enemy stats based on current map
function getRandomEnemyStats() {
    let level = 1;

    if (currentMap === "overworld") {
        level = 2 + Math.floor(Math.random() * 2); // 2–3
    }
    else if (currentMap === "dungeon1" || currentMap === "dungeon2") {
        level = 4 + Math.floor(Math.random() * 2); // 4–5
    }

    return {
        level,
        maxHP: 20 + level * 10,
        atk: 5 + level * 3,
        def: 2 + level * 2
    };
}

// Start a random encounter (used when walking around)
function startRandomEncounter() {
    const enemySprite = RANDOM_ENEMIES[Math.floor(Math.random() * RANDOM_ENEMIES.length)];
    const stats = getRandomEnemyStats();

    inCombat = true;

    battlePlayer = {
        hp: playerStats.hp,
        mp: playerStats.mp,
        maxHP: playerStats.maxHP,
        maxMP: playerStats.maxMP,
        atk: playerStats.atk,
        def: playerStats.def,
        sprite: dungeonSheet,
        spriteX: player.spriteX,
        spriteY: player.spriteY
    };

    battleEnemy = {
        level: stats.level,
        hp: stats.maxHP,
        maxHP: stats.maxHP,
        atk: stats.atk,
        def: stats.def,
        sprite: dungeonSheet,
        spriteX: enemySprite.spriteX,
        spriteY: enemySprite.spriteY
    };

    battleState = "player";
    battleMenuIndex = 0;

    document.getElementById("battleScreen").style.display = "block";

    updateBattleMenu();
    updateBattleStats();
    renderBattle();

    playMusic("battle");
}


// Handle using an item in battle
function doItem() {
    if (inventory.length === 0) {
        document.getElementById("battleMessage").innerText = "No items!";
        return;
    }

    const slot = inventory[itemsMenuIndex];
    const def = getItemDef(slot.id);

    if (!def) return;

    // HP potion
    if (def.id === "potion") {
        const heal = 20;
        battlePlayer.hp = Math.min(battlePlayer.maxHP, battlePlayer.hp + heal);

        slot.qty--;
        if (slot.qty <= 0) inventory.splice(itemsMenuIndex, 1);

        document.getElementById("battleMessage").innerText =
            `You used a Potion! Restored ${heal} HP.`;

        updateBattleStats();
        renderItemsMenu();

        // Enemy turn after item
        battleState = "enemy";
        setTimeout(enemyTurn, 700);
        return;
    }

    // MP potion
    if (def.id === "mPotion") {
        const restore = 10;
        battlePlayer.mp = Math.min(battlePlayer.maxMP, battlePlayer.mp + restore);

        slot.qty--;
        if (slot.qty <= 0) inventory.splice(itemsMenuIndex, 1);

        document.getElementById("battleMessage").innerText =
            `You used a Magic Potion! Restored ${restore} MP.`;

        updateBattleStats();
        renderItemsMenu();

        battleState = "enemy";
        setTimeout(enemyTurn, 700);
        return;
    }
    // If item is not usable in battle
    document.getElementById("battleMessage").innerText = "Can't use that now.";
}

// Get player's battle stats, including equipment bonuses
function getPlayerBattleStats() {
    const base = {
        maxHP: 50,
        maxMP: 20,
        atk: 10,
        def: 5
    };

    if (equipment.weapon) {
        base.atk += equipment.weapon.stats.stats.atk || 0;
    }

    if (equipment.armor) {
        base.def += equipment.armor.stats.stats.def || 0;
    }

    return base;
}

// End combat and return to exploration
function endCombat(result = "win") {
    inCombat = false;

    // Save HP/MP back to overworld stats
    playerStats.hp = battlePlayer.hp;
    playerStats.mp = battlePlayer.mp;

    if (result === "defeat") {
        // Show defeat message
        dialogueBox.style.display = "block";
        dialogueBox.innerHTML = `<strong>You were defeated...</strong>`;
        activeDialogue = { name: "Defeat", dialogueIndex: 0, dialogue: [] };

        // Restart the game after a short delay
        setTimeout(() => {
            location.reload();
        }, 1500);

        document.getElementById("battleScreen").style.display = "none";
        return;
    }

    if (result === "run") {
        dialogueBox.style.display = "block";
        dialogueBox.innerHTML = `<strong>You ran away!</strong>`;
        activeDialogue = { name: "RunAway", dialogueIndex: 0, dialogue: [] };
        inputCooldown = 6;

        document.getElementById("battleScreen").style.display = "none";

        playMusic(currentMap);

        return;
    }

    // Victory - grant rewards
    const xpGain = battleEnemy.level ? battleEnemy.level * 5 : 5;
    gainXP(xpGain);

    const goldGain = (battleEnemy.level || 1) * 3;
    gold += goldGain;

    const droppedPotion = Math.random() < 0.25;

    if (lastBattleEnemyId === "boss") {
        const bossNpc = npcs.find(n => n.isBoss && n.map === "dungeon2");
        if (bossNpc) bossNpc.isDefeated = true;
    }

    dialogueBox.style.display = "block";
    dialogueBox.innerHTML = `
        <strong>Victory!</strong><br>
        Gained ${xpGain} XP<br>
        Found ${goldGain} Gold<br>
        ${droppedPotion ? "Found a Potion!" : ""}
    `;
    activeDialogue = { name: "Loot", dialogueIndex: 0, dialogue: [] };
    inputCooldown = 10;

    document.getElementById("battleScreen").style.display = "none";

    playMusic(currentMap);
}

// Render the battle screen
function renderBattle() {
    bctx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);

    // Draw player sprite (upscaled)
    bctx.drawImage(
        battlePlayer.sprite,
        battlePlayer.spriteX, battlePlayer.spriteY, 16, 16,
        40, 100, 64, 64
    );

    // Draw enemy sprite (upscaled)
    bctx.drawImage(
        battleEnemy.sprite,
        battleEnemy.spriteX, battleEnemy.spriteY, 16, 16,
        220, 40, 64, 64
    );
}

// Update the battle menu to highlight the current selection
function updateBattleMenu() {
    const options = document.querySelectorAll(".battle-option");
    options.forEach((opt, i) => {
        opt.classList.toggle("selected", i === battleMenuIndex);
    });
}

// Handle player input during battle
function handleBattleInput(code) {
    if (!inCombat) return;
    if (battleState !== "player") return;

    const BATTLE_OPTIONS = 4; // Attack, Magic, Item, Run

    if (code === "ArrowUp") {
        battleMenuIndex = (battleMenuIndex - 1 + BATTLE_OPTIONS) % BATTLE_OPTIONS;
        updateBattleMenu();
        return;
    }

    if (code === "ArrowDown") {
        battleMenuIndex = (battleMenuIndex + 1) % BATTLE_OPTIONS;
        updateBattleMenu();
        return;
    }

    if (code === "Space") {
        if (battleMenuIndex === 0) doAttack();
        if (battleMenuIndex === 1) doMagic();
        if (battleMenuIndex === 2) {
            itemsMenuOpen = true;
            itemsMenuIndex = 0;
            document.getElementById("itemsBox").style.display = "block";
            renderItemsMenu();
            return;
        }
        if (battleMenuIndex === 3) doRun();
        return;
    }

}

// Handle the Attack option
function doAttack() {
    if (battleState !== "player") return;

    const dmg = Math.max(1, battlePlayer.atk - battleEnemy.def);
    battleEnemy.hp -= dmg;

    document.getElementById("battleMessage").innerText =
        `You dealt ${dmg} damage!`;

    updateBattleStats();
    renderBattle();

    if (battleEnemy.hp <= 0) {
        document.getElementById("battleMessage").innerText = "Enemy defeated!";
        setTimeout(() => endCombat("win"), 1500);
        return;
    }

    // Switch to enemy turn after a short delay
    battleState = "enemy";
    setTimeout(enemyTurn, 700);
}

// Handle the Magic option
function doMagic() {
    if (battleState !== "player") return;

    const cost = 6;
    const magicDamage = 15;

    // Not enough MP
    if (battlePlayer.mp < cost) {
        document.getElementById("battleMessage").innerText =
            "Not enough MP!";
        return;
    }

    // Spend MP
    battlePlayer.mp -= cost;

    // Deal damage
    battleEnemy.hp -= magicDamage;

    document.getElementById("battleMessage").innerText =
        `You cast Magic! Dealt ${magicDamage} damage!`;

    updateBattleStats();
    renderBattle();

    // Enemy defeated?
    if (battleEnemy.hp <= 0) {
        document.getElementById("battleMessage").innerText = "Enemy defeated!";
        setTimeout(() => endCombat("win"), 1500);
        return;
    }

    // Enemy turn
    battleState = "enemy";
    setTimeout(enemyTurn, 700);
}

// Handle the Run option
function doRun() {
    document.getElementById("battleMessage").innerText = "You ran away!";
    setTimeout(() => endCombat("run"), 800);
}


// Handle the enemy's turn
function enemyTurn() {

    itemsMenuOpen = false;
    document.getElementById("itemsBox").style.display = "none";

    if (!inCombat) return;

    const dmg = Math.max(1, battleEnemy.atk - battlePlayer.def);
    battlePlayer.hp -= dmg;

    document.getElementById("battleMessage").innerText =
        `Enemy attacks! You take ${dmg} damage.`;

    updateBattleStats();
    renderBattle();

    if (battlePlayer.hp <= 0) {
        document.getElementById("battleMessage").innerText = "You were defeated...";
        setTimeout(() => endCombat("defeat"), 1500);
        return;
    }
    // Back to player turn
    battleState = "player";
}

// Update the displayed HP/MP for player and enemy
function updateBattleStats() {
    const p = battlePlayer;
    const e = battleEnemy;

    document.getElementById("playerStats").innerText =
        `Player HP: ${p.hp}/${p.maxHP} MP: ${p.mp}/${p.maxMP}`;

    document.getElementById("enemyStats").innerText =
        `Enemy HP: ${e.hp}/${e.maxHP}`;
}
