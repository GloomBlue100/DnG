// CONFIG & GAME STATE
const TILE_SIZE = 16;

let mainMenuOpen = true;
let mainMenuIndex = 0;

let slotMenuOpen = false;
let slotMenuIndex = 0;
let slotMenuMode = ""; // "new", "load", "delete"

let stepCount = 0;
let nextPesterStep = 0;
let justClosedDialogue = false;
let moveCooldown = 0;
let gameStarted = false;
let currentMap = "town";
let playerTrail = [];
const TRAIL_LENGTH = 10;
let mapSwitchCooldown = 0;
let gold = 0;

let itemsMenuOpen = false;
let itemsMenuIndex = 0;

let equipmentMenuOpen = false;
let equipmentMenuIndex = 0;

let statsMenuOpen = false;

let encounterCounter = 0;
let nextEncounterStep = 0;
let encounterMin = 10;
let encounterMax = 20;

let lastBattleEnemyId = null;

let shopOpen = false;
let shopIndex = 0;

// AUDIO SYSTEM
const musicTracks = {
    town: new Audio("assets/audio/peaceful_village.mp3"),
    overworld: new Audio("assets/audio/spirits_forest.mp3"),
    dungeon1: new Audio("assets/audio/hidden_cavern.mp3"),
    dungeon2: new Audio("assets/audio/hidden_cavern.mp3"),
    battle: new Audio("assets/audio/battle_theme.mp3")
};

let currentMusic = null;

function playMusic(trackName) {
    if (!musicTracks[trackName]) return;

    // Stop previous track
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
    }

    if (inCombat && trackName !== "battle") return;

    // Play new track
    currentMusic = musicTracks[trackName];
    currentMusic.loop = true;
    currentMusic.volume = 0.6;
    currentMusic.play().catch(e => console.warn("Autoplay blocked:", e));
}

const sfxMove = new Audio("assets/audio/menu.mp3");
const sfxSelect = new Audio("assets/audio/menu.mp3");
sfxMove.volume = 0.4;
sfxSelect.volume = 0.5;

// CANVAS & CAMERA
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const camera = { x: 0, y: 0 };

const playerStats = {
    level: 1,
    xp: 0,
    nextXP: 20,   // XP needed for next level
    maxHP: 50,
    maxMP: 20,
    hp: 50,
    mp: 20,
    atk: 10,
    def: 5
};

// CAMERA UPDATE
function updateCamera() {
    camera.x = player.x * TILE_SIZE - canvas.width / 2 + TILE_SIZE / 2;
    camera.y = player.y * TILE_SIZE - canvas.height / 2 + TILE_SIZE / 2;
}

// PLAYER
const player = {
    x: 19,
    y: 28,
    direction: 0,
    frame: 1,
    spriteX: 0,
    spriteY: 0
};

// INPUT STATE
let keys = {};
let menuOpen = false;
let menuIndex = 0;
let inputCooldown = 0;

function handleSlotMenuInput(code) {
    const options = document.querySelectorAll("#slotMenu .slot-option");

    if (code === "ArrowUp") {
        slotMenuIndex = (slotMenuIndex - 1 + options.length) % options.length;
        sfxMove.currentTime = 0;
        sfxMove.play();
        sfxSelect.play();
    }
    if (code === "ArrowDown") {
        slotMenuIndex = (slotMenuIndex + 1) % options.length;
        sfxMove.currentTime = 0;
        sfxMove.play();
        sfxSelect.play();
    }

    options.forEach((opt, i) => {
        opt.classList.toggle("selected", i === slotMenuIndex);
    });

    if (code === "Escape") {
        closeSlotMenu();
        return;
    }

    if (code === "Space") {
        if (slotMenuIndex === 3) { // Back
            closeSlotMenu();
            return;
        }

        const slot = slotMenuIndex + 1;

        if (slotMenuMode === "new") {
            startNewGame(slot);
        }
        if (slotMenuMode === "load") {
            loadGame(slot);
        }
        if (slotMenuMode === "delete") {
            deleteSave(slot);
            closeSlotMenu();
        }
        if (slotMenuMode === "save") {
            saveGame(slot);
            closeSlotMenu();
        }
    }
}

// SLOT MENU
function openSlotMenu(mode) {
    slotMenuMode = mode;
    slotMenuOpen = true;
    slotMenuIndex = 0;

    document.getElementById("slotMenu").style.display = "block";
}

function closeSlotMenu() {
    slotMenuOpen = false;
    document.getElementById("slotMenu").style.display = "none";
}

// MENU TOGGLE
function toggleMainMenu() {
    menuOpen = !menuOpen;
    const menuBox = document.getElementById("menuBox");

    if (menuBox) menuBox.style.display = menuOpen ? "block" : "none";

    if (menuOpen) {
        menuIndex = 0;
        updateMenuHighlight();
    }
}

// OPEN STATS MENU
function openStatsMenu() {
    statsMenuOpen = true;

    const box = document.getElementById("statsBox");
    const content = document.getElementById("statsContent");

    content.innerHTML = `
    <div>Level: ${playerStats.level}</div>
    <div>XP: ${playerStats.xp}/${playerStats.nextXP}</div>
    <div>Gold: ${gold}</div>
    <div>HP: ${playerStats.hp}/${playerStats.maxHP}</div>
    <div>MP: ${playerStats.mp}/${playerStats.maxMP}</div>
    <div>ATK: ${playerStats.atk}</div>
    <div>DEF: ${playerStats.def}</div>
    `;

    box.style.display = "block";
}

function closeStatsMenu() {
    statsMenuOpen = false;
    document.getElementById("statsBox").style.display = "none";
}

// ENCOUNTER SYSTEM
function resetEncounterCounter() {
    encounterCounter = encounterMin + Math.floor(Math.random() * (encounterMax - encounterMin + 1));
}

// LEVEL UP SYSTEM
function checkLevelUp() {
    while (playerStats.xp >= playerStats.nextLevelXP) {
        playerStats.xp -= playerStats.nextLevelXP;
        playerStats.level++;

        // Increase next level requirement
        playerStats.nextLevelXP = Math.floor(playerStats.nextLevelXP * 1.4);

        // Stat growth
        playerStats.maxHP += 10;
        playerStats.maxMP += 3;
        playerStats.atk += 2;
        playerStats.def += 1;

        // Heal on level up
        playerStats.hp = playerStats.maxHP;
        playerStats.mp = playerStats.maxMP;

        // Show level-up message
        dialogueBox.style.display = "block";
        dialogueBox.innerHTML =
            `<strong>Level Up!</strong><br>You reached level ${playerStats.level}!`;
        activeDialogue = { name: "LevelUp", dialogueIndex: 0, dialogue: [] };
    }
}

function gainXP(amount) {
    if (playerStats.level >= 10) return; // hard cap

    playerStats.xp += amount;

    while (playerStats.xp >= playerStats.nextXP && playerStats.level < 10) {
        playerStats.xp -= playerStats.nextXP;
        levelUp();
    }
}

function levelUp() {
    playerStats.level++;

    // Stat increases
    playerStats.maxHP += 10;
    playerStats.maxMP += 5;
    playerStats.atk += 2;
    playerStats.def += 2;

    // Heal fully
    playerStats.hp = playerStats.maxHP;
    playerStats.mp = playerStats.maxMP;

    // Increase XP requirement
    playerStats.nextXP = Math.floor(playerStats.nextXP * 1.4);

    // Show message
    dialogueBox.style.display = "block";
    dialogueBox.innerHTML = `<strong>Level Up!</strong><br>You reached level ${playerStats.level}!`;
    activeDialogue = { name: "LevelUp", dialogueIndex: 0, dialogue: [] };
}

// INPUT HANDLING
document.addEventListener("keyup", e => {
    if (e.key.startsWith("Arrow")) keys[e.key] = false;
});

document.addEventListener("keydown", e => {

    if (slotMenuOpen) {
        handleSlotMenuInput(e.code);
        return;
    }

    if (mainMenuOpen) {
        handleMainMenuInput(e.code);
        return;
    }

    const CRITICAL_KEYS = [
        "Escape", "Space", "KeyR", "KeyB", "KeyN",
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
    ];

    if (inCombat) {
        // If items menu is open, allow overworld item navigation
        if (itemsMenuOpen) {
            if (e.code === "ArrowUp") {
                itemsMenuIndex = (itemsMenuIndex - 1 + inventory.length) % inventory.length;
                renderItemsMenu();
                return;
            }
            if (e.code === "ArrowDown") {
                itemsMenuIndex = (itemsMenuIndex + 1) % inventory.length;
                renderItemsMenu();
                return;
            }
            if (e.code === "Space") {
                handleItemsMenuConfirm();
                return;
            }
            if (e.code === "Escape") {

                if (statsMenuOpen) {
                    closeStatsMenu();
                    return;
                }

                if (itemsMenuOpen) {
                    closeItemsMenu();
                    return;
                }

                if (equipmentMenuOpen) {
                    closeEquipmentMenu();
                    return;
                }

                if (activeDialogue) {
                    activeDialogue = null;
                    dialogueBox.style.display = "none";
                    justClosedDialogue = true;
                    setTimeout(() => justClosedDialogue = false, 200);
                    return;
                }
                toggleMainMenu();
                return;
            }
        }
        // Otherwise, normal battle input
        handleBattleInput(e.code);
        return;
    }

    // SHOP NAVIGATION — handle shop input early so generic handlers don't swallow keys
    if (shopOpen) {
        // Up / Down to move selection
        if (e.code === "ArrowUp") {
            shopIndex = (shopIndex - 1 + shops.tifa.length) % shops.tifa.length;
            renderShop("tifa");
            return;
        }
        if (e.code === "ArrowDown") {
            shopIndex = (shopIndex + 1) % shops.tifa.length;
            renderShop("tifa");
            return;
        }

        // Confirm purchase
        if (e.code === "Space") {
            buyItem("tifa");
            return;
        }

        // Close shop
        if (e.code === "Escape") {
            closeShop();
            return;
        }
        // Prevent other handlers from running while shop is open
        return;
    }

    // Non-combat input handling
    if (inputCooldown > 0 && !CRITICAL_KEYS.includes(e.code)) return;
    if (!CRITICAL_KEYS.includes(e.code)) inputCooldown = 8;

    // Global shortcuts
    if (e.code === "KeyR") { resetPlayer(); return; }
    if (e.code === "KeyB") { switchMap("dungeon1", 11, 15); return; }
    if (e.code === "KeyN") { switchMap("dungeon2", 8, 15); return; }

    if (e.code === "KeyF") {
        startCombat("slime");
        return;
    }

    // Confirm / interact
    if (e.code === "Space") {

        if (activeDialogue) {
            activeDialogue = null;
            dialogueBox.style.display = "none";
            justClosedDialogue = true;
            setTimeout(() => justClosedDialogue = false, 200);
            return;
        }

        if (itemsMenuOpen) { 
            handleItemsMenuConfirm(); 
            return; 
        }

        if (statsMenuOpen) return;

        if (equipmentMenuOpen) { 
            handleEquipmentMenuConfirm(); 
            return; 
        }

        if (menuOpen) { 
            handleMenuSelect(); 
            return; 
        }

        if (tryChest()) return;

        tryTalk();
        return;
    }

    // ESC logic
    if (e.code === "Escape") {

        if (itemsMenuOpen) { 
            closeItemsMenu(); 
            return; 
        }

        if (equipmentMenuOpen) { 
            closeEquipmentMenu(); 
            return; 
        }

        if (statsMenuOpen) { 
            closeStatsMenu(); 
            return; 
        }

        if (activeDialogue) {
            activeDialogue = null;
            dialogueBox.style.display = "none";
            justClosedDialogue = true;
            setTimeout(() => justClosedDialogue = false, 200);
            return;
        }
        toggleMainMenu();
        return;
    }

    // Menu navigation
    if (menuOpen) {

        if (e.code === "ArrowUp") {
            menuIndex = (menuIndex - 1 + 5) % 5;

            sfxMove.currentTime = 0;
            sfxMove.play();

            updateMenuHighlight();
            return;
        }

        if (e.code === "ArrowDown") {
            menuIndex = (menuIndex + 1) % 5;

            sfxMove.currentTime = 0;
            sfxMove.play();

            updateMenuHighlight();
            return;
        }

        if (e.code === "Space") {
            sfxSelect.currentTime = 0;
            sfxSelect.play();

            handleMenuSelect();
            return;
        }
    }

    // Items menu navigation
    if (itemsMenuOpen) {

        if (e.code === "ArrowUp") {

            itemsMenuIndex =
                (itemsMenuIndex - 1 + inventory.length) % inventory.length;

            sfxMove.currentTime = 0;
            sfxMove.play();

            renderItemsMenu();
            return;
        }

        if (e.code === "ArrowDown") {

            itemsMenuIndex =
                (itemsMenuIndex + 1) % inventory.length;

            sfxMove.currentTime = 0;
            sfxMove.play();

            renderItemsMenu();
            return;
        }

        if (e.code === "Space") {

            sfxSelect.currentTime = 0;
            sfxSelect.play();

            handleItemsMenuConfirm();
            return;
        }

        if (e.code === "Escape") {

            sfxSelect.currentTime = 0;
            sfxSelect.play();

            closeItemsMenu();
            return;
        }
    }

    if (equipmentMenuOpen) {

        if (e.code === "ArrowUp") {

            equipmentMenuIndex =
                (equipmentMenuIndex - 1 + 2) % 2;

            sfxMove.currentTime = 0;
            sfxMove.play();

            renderEquipmentMenu();
            return;
        }

        if (e.code === "ArrowDown") {

            equipmentMenuIndex =
                (equipmentMenuIndex + 1) % 2;

            sfxMove.currentTime = 0;
            sfxMove.play();

            renderEquipmentMenu();
            return;
        }

        if (e.code === "Space") {

            sfxSelect.currentTime = 0;
            sfxSelect.play();

            handleEquipmentMenuConfirm();
            return;
        }

        if (e.code === "Escape") {

            sfxSelect.currentTime = 0;
            sfxSelect.play();

            closeEquipmentMenu();
            return;
        }
    }


    // Movement
    if (!activeDialogue && !menuOpen && !itemsMenuOpen && !equipmentMenuOpen && !statsMenuOpen) {
        if (e.key.startsWith("Arrow")) keys[e.key] = true;
    }
});

// MAIN MENU
function handleMainMenuInput(code) {
    const options = document.querySelectorAll("#mainMenuBox .menu-option");

    if (code === "ArrowUp") {
        mainMenuIndex = (mainMenuIndex - 1 + options.length) % options.length;
        sfxMove.currentTime = 0;
        sfxMove.play();
        sfxSelect.play();
    }
    if (code === "ArrowDown") {
        mainMenuIndex = (mainMenuIndex + 1) % options.length;
        sfxMove.currentTime = 0;
        sfxMove.play();
        sfxSelect.play();
    }

    options.forEach((opt, i) => {
        opt.classList.toggle("selected", i === mainMenuIndex);
    });

    if (code === "Space") {

        // NEW GAME — start immediately
        if (mainMenuIndex === 0) {
            startNewGame(1);
            return;
        }

        // LOAD GAME — open slot menu
        if (mainMenuIndex === 1) {
            openSlotMenu("load");
            return;
        }

        // DELETE SAVE — open slot menu
        if (mainMenuIndex === 2) {
            openSlotMenu("delete");
            return;
        }

        // EXIT
        if (mainMenuIndex === 3) {
            window.close();
        }
    }
}

// SLOT MENU
function openNewGameMenu() {
    openSlotMenu("new");
}

// These functions are called from the main menu when selecting Load or Delete
function openLoadMenu() {
    openSlotMenu("load");
}

function openDeleteMenu() {
    openSlotMenu("delete");
}

// GAME START, LOAD, SAVE, DELETE
function startNewGame(slot) {
    localStorage.removeItem("doom_save_" + slot);

    // Reset player stats, inventory, map, etc.
    resetPlayer();
    currentMap = "town";
    player.x = 19;
    player.y = 28;

    mainMenuOpen = false;
    document.getElementById("mainMenu").style.display = "none";

    playMusic("town");

}

function loadGame(slot) {
    const data = JSON.parse(localStorage.getItem("doom_save_" + slot));
    if (!data) return;

    // Restore stats
    Object.assign(playerStats, data.stats);

    // Restore inventory
    inventory.length = 0;
    data.inventory.forEach(i => inventory.push(i));

    // Restore equipment
    equipment.weapon = data.equipment.weapon;
    equipment.armor = data.equipment.armor;

    // Restore chests
    chestTriggers.opened = data.chests.opened;

    // Restore boss state
    const bossNpc = npcs.find(n => n.isBoss);
    if (bossNpc) bossNpc.isDefeated = data.bossDefeated;

    // ⭐ Load the correct map properly ⭐
    switchMap(data.map, data.x, data.y);

    // Close menu
    mainMenuOpen = false;
    document.getElementById("mainMenu").style.display = "none";

    playMusic(currentMap);

}

function deleteSave(slot) {
    localStorage.removeItem("doom_save_" + slot);
}

function saveGame(slot) {
    const data = {
        map: currentMap,
        x: player.x,
        y: player.y,
        stats: playerStats,
        inventory: inventory,
        equipment: equipment,
        chests: chestTriggers,
        bossDefeated: npcs.find(n => n.isBoss)?.isDefeated
    };
    localStorage.setItem("doom_save_" + slot, JSON.stringify(data));
}


// MOVEMENT
function handleMovement() {
    if (activeDialogue || menuOpen || itemsMenuOpen || equipmentMenuOpen || inCombat) return;

    if (moveCooldown > 0) {
        moveCooldown--;
        return;
    }
    
    if (keys["ArrowUp"]) {
        player.direction = 3;
        tryMove(0, -1);
        moveCooldown = 10;
        keys["ArrowUp"] = false;
    } else if (keys["ArrowDown"]) {
        player.direction = 0;
        tryMove(0, 1);
        moveCooldown = 10;
        keys["ArrowDown"] = false;
    } else if (keys["ArrowLeft"]) {
        player.direction = 1;
        tryMove(-1, 0);
        moveCooldown = 10;
        keys["ArrowLeft"] = false;
    } else if (keys["ArrowRight"]) {
        player.direction = 2;
        tryMove(1, 0);
        moveCooldown = 10;
        keys["ArrowRight"] = false;
    }
}

// MENU SELECTION
function updateMenuHighlight() {
    const options = document.querySelectorAll("#menuBox .menu-option");
    options.forEach((opt, i) => opt.classList.toggle("selected", i === menuIndex));
}

// Handle main menu selection
function handleMenuSelect() {
    const options = ["Items", "Equipment", "Stats", "Save", "Exit"];
    const choice = options[menuIndex];

    if (choice === "Exit") {
        menuOpen = false;
        document.getElementById("menuBox").style.display = "none";
        return;
    }

    if (choice === "Items") {
        menuOpen = false;
        document.getElementById("menuBox").style.display = "none";
        openItemsMenu();
        return;
    }

    if (choice === "Equipment") {
        menuOpen = false;
        document.getElementById("menuBox").style.display = "none";
        openEquipmentMenu();
        return;
    }

    if (choice === "Stats") {
        menuOpen = false;
        document.getElementById("menuBox").style.display = "none";
        openStatsMenu();
        return;
    }

    if (choice === "Save") {
        menuOpen = false;
        document.getElementById("menuBox").style.display = "none";
        openSlotMenu("save");
        return;
    }
}

// RESET PLAYER
function resetPlayer() {
    if (currentMap === "town") {
        player.x = 19;
        player.y = 28;
    }
    if (currentMap === "overworld") {
        player.x = 74;
        player.y = 28;
    }
    if (currentMap === "dungeon1") {
        player.x = 79;
        player.y = 35;
    }
    if (currentMap === "dungeon2") {
        player.x = 0;
        player.y = 16;
    }

    playerTrail = [];

    const f = getFollower();
    if (f && f.followsPlayer) {
        f.moveTimer = 0;
        f.pesterTimer = 20 + Math.floor(Math.random() * 30);
    }

    moveCooldown = 0;
    activeDialogue = null;
    dialogueBox.style.display = "none";

    justClosedDialogue = true;
    setTimeout(() => justClosedDialogue = false, 300);
}

// SHOP SYSTEM
function openShop(shopId) {
    shopOpen = true;
    shopIndex = 0;

    const box = document.getElementById("shopBox");
    box.style.display = "block";

    renderShop(shopId);
}

function closeShop() {
    shopOpen = false;
    shopIndex = 0;

    const box = document.getElementById("shopBox");
    box.style.display = "none";
}

function renderShop(shopId) {
    const box = document.getElementById("shopBox");
    const stock = shops[shopId];

    box.innerHTML = "<strong>Tifa's Shop</strong><br><br>";

    stock.forEach((item, i) => {
        const def = getItemDef(item.id);
        const selected = (i === shopIndex) ? "selected" : "";
        box.innerHTML += `
            <div class="items-row ${selected}">
                ${def.name} - ${item.price}g
            </div>
        `;
    });
    box.innerHTML += `<br><div>Your Gold: ${gold}</div>`;
}

function buyItem(shopId) {
    const stock = shops[shopId];
    const item = stock[shopIndex];

    if (gold < item.price) {
        dialogueBox.style.display = "block";
        dialogueBox.innerHTML = "Not enough gold!";
        activeDialogue = { name: "Shop", dialogueIndex: 0, dialogue: [] };
        return;
    }
    gold -= item.price;
    addToInventory(item.id, 1);

    renderShop(shopId);
}


// TALKING TO NPCs
function tryTalk() {
    if (activeDialogue) return;

    let tx = player.x;
    let ty = player.y;

    if (player.direction === 0) ty += 1;   // down
    if (player.direction === 1) tx -= 1;   // left
    if (player.direction === 2) tx += 1;   // right
    if (player.direction === 3) ty -= 1;   // up

    // debug: show where we're looking and whether dialogue is active
    console.log("tryTalk: facing", tx, ty, "map", currentMap, "activeDialogue", !!activeDialogue);

    // find NPC at the tile the player is facing
    const npc = npcs.find(n => n.x === tx && n.y === ty && (n.map === currentMap || n.map === "global"));

    if (!npc) return;

    // Safe to log now
    console.log("tryTalk: found npc.isBoss =", npc.isBoss, "isDefeated =", npc.isDefeated);
    console.log("npc object keys:", Object.keys(npc));
    console.log("tryTalk: found npc:", npc);

    // Boss interaction
    if (npc.isBoss) {
        if (npc.isDefeated) {
            // optional message after boss is defeated
            dialogueBox.style.display = "block";
            dialogueBox.innerHTML = `<strong>${npc.name}:</strong> ...it's already over.`;
            activeDialogue = { name: "NPC", dialogueIndex: 0, dialogue: [] };
            return;
        }
        // start boss combat
        startCombat("boss");
        return;
    }
    // SHOPKEEPER
    if (npc.isShopkeeper) {
        openShop("tifa");
        return;
    }
    // NORMAL DIALOGUE
    showDialogue(npc);
}

// DIALOGUE SYSTEM
let activeDialogue = null;
const dialogueBox = document.getElementById("dialogueBox");

function showDialogue(npc) {
    activeDialogue = npc;

    const line = npc.dialogue[npc.dialogueIndex];
    dialogueBox.style.display = "block";
    dialogueBox.innerHTML = `<strong>${npc.name}:</strong> ${line}`;

    npc.dialogueIndex++;
    if (npc.dialogueIndex >= npc.dialogue.length) {
        npc.dialogueIndex = 0;
    }
}

// MOVEMENT + MAP TRANSITIONS
function tryMove(dx, dy) {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (!isBlocked(newX, newY)) {
        playerTrail.unshift({ x: player.x, y: player.y });
        if (playerTrail.length > TRAIL_LENGTH) playerTrail.pop();

        player.x = newX;
        player.y = newY;

        gameStarted = true;
        stepCount++;
        checkFollowerPester();
        checkRandomEncounter();
    }

    // Town → Overworld
    if (
        (player.x === 18 && player.y === 29) ||
        (player.x === 19 && player.y === 29) ||
        (player.x === 20 && player.y === 29) ||
        (player.x === 21 && player.y === 29)
    ) {
        switchMap("overworld", 74, 28);
        return;
    }

    // Overworld → Town
    if (
        (player.x === 73 && player.y === 25) ||
        (player.x === 74 && player.y === 25) ||
        (player.x === 75 && player.y === 25) ||
        (player.x === 73 && player.y === 26) ||
        (player.x === 74 && player.y === 26) ||
        (player.x === 75 && player.y === 26) ||
        (player.x === 73 && player.y === 27) ||
        (player.x === 74 && player.y === 27) ||
        (player.x === 75 && player.y === 27)
    ) {
        switchMap("town", 19, 28);
        return;
    }

    // Overworld → Dungeon1
    if (currentMap === "overworld" && player.x === 15 && player.y === 56) {
        switchMap("dungeon1", 79, 35);
        return;
    }

    // Dungeon1 → Overworld
    if (currentMap === "dungeon1") {
        if (player.x === 79 && (player.y === 35 || player.y === 34)) {
            switchMap("overworld", 15, 56);
            return;
        }
    }

    // Dungeon1 → Dungeon2
    if (currentMap === "dungeon1") {
        if (player.x === 74 && (player.y === 18 || player.y === 19)) {
            switchMap("dungeon2", 0, 16);
            return;
        }
    }

    // Dungeon2 → Dungeon1
    if (currentMap === "dungeon2") {
        if (player.x === 0 && (player.y === 16 || player.y === 17)) {
            switchMap("dungeon1", 74, 18);
            return;
        }
    }

    checkRandomEncounter();
}

// FOLLOWER PESTER LOGIC
function checkFollowerPester() {
    const follower = getFollower();
    if (!follower || !follower.followsPlayer) return;
    if (activeDialogue) return;
    if (justClosedDialogue) return;

    const dist = Math.abs(follower.x - player.x) + Math.abs(follower.y - player.y);
    if (dist > 6) return;

    if (nextPesterStep === 0) {
        nextPesterStep = stepCount + 20 + Math.floor(Math.random() * 31);
        return;
    }

    if (stepCount < nextPesterStep) return;

    showDialogue(follower);
    nextPesterStep = stepCount + 20 + Math.floor(Math.random() * 31);
}

// Check if player has reached the step count for a random encounter
function checkRandomEncounter() {
    // No encounters in town
    if (currentMap === "town") return;

    // Don't trigger during dialogue or menus
    if (activeDialogue || menuOpen || itemsMenuOpen || equipmentMenuOpen || statsMenuOpen) return;

    // If no encounter scheduled yet, schedule one
    if (nextEncounterStep === 0) {
        nextEncounterStep = stepCount + encounterMin + Math.floor(Math.random() * (encounterMax - encounterMin + 1));
        return;
    }

    // Not reached the step yet
    if (stepCount < nextEncounterStep) return;

    // Trigger encounter
    nextEncounterStep = 0;
    startRandomEncounter();
}

// DRAW PLAYER
function drawPlayer() {
    const sx = player.spriteX;
    const sy = player.spriteY;

    const dx = player.x * TILE_SIZE - camera.x;
    const dy = player.y * TILE_SIZE - camera.y;

    ctx.save();

    if (player.direction === 1) {
        ctx.translate(dx + TILE_SIZE, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(
            dungeonSheet,
            sx, sy, TILE_SIZE, TILE_SIZE,
            0, 0,
            TILE_SIZE, TILE_SIZE
        );
    } else {
        ctx.drawImage(
            dungeonSheet,
            sx, sy, TILE_SIZE, TILE_SIZE,
            dx, dy,
            TILE_SIZE, TILE_SIZE
        );
    }
    ctx.restore();
}

player.spriteX = 8 * 16;
player.spriteY = 5 * 16;

// GAME LOOP
function tickInputCooldown() {
    if (inputCooldown > 0) inputCooldown--;
}

function gameLoop() {
    if (!mainMenuOpen && !slotMenuOpen) {
        handleMovement();
        updateNPCs();
        updateCamera();
        drawBottomLayers();
        drawNPCs();
        drawPlayer();
        drawTopLayers();
    }

    tickInputCooldown();
    requestAnimationFrame(gameLoop);

    console.log(`Player: x=${player.x}, y=${player.y}, map=${currentMap}`);
}

// INVENTORY & EQUIPMENT
const inventory = []; // { id, qty }
const equipment = { weapon: null, armor: null };

function getItemDef(id) {
    return (typeof ITEMS !== "undefined") ? ITEMS.find(it => it.id === id) || null : null;
}

// Add an item to the inventory, respecting stack limits
function addToInventory(id, qty = 1) {
    const def = getItemDef(id);
    if (!def) return;

    if (def.stack && def.stack > 1) {
        const slot = inventory.find(s => s.id === id);
        if (slot) {
            slot.qty = Math.min(def.stack, slot.qty + qty);
            return;
        }
    }
    inventory.push({ id, qty });
}

// Handle equipping an item (for weapons and armor)
function equipItem(id) {
    const itemData = getItemDef(id);
    if (!itemData) return;

    // Remove old bonuses
    if (equipment.weapon) {
        playerStats.atk -= equipment.weapon.stats.atk || 0;
    }
    if (equipment.armor) {
        playerStats.def -= equipment.armor.stats.def || 0;
    }

    // Equip new item
    if (itemData.type === "weapon") {
        equipment.weapon = { id: itemData.id, name: itemData.name, stats: itemData };
        playerStats.atk += itemData.stats.atk || 0;
        return;
    }

    if (itemData.type === "armor") {
        equipment.armor = { id: itemData.id, name: itemData.name, stats: itemData };
        playerStats.def += itemData.stats.def || 0;
        return;
    }
}

// Handle using an item in battle
function addLoot(id, qty = 1) {
    const itemData = getItemDef(id);
    if (!itemData) return;

    if (itemData.type === "consumable") {
        const existing = inventory.find(i => i.id === id);
        if (existing) existing.qty += qty;
        else inventory.push({ id, qty });
        return;
    }

    if (itemData.type === "weapon" || itemData.type === "armor") {
        equipItem(id);
        if (qty > 1) {
            const existing = inventory.find(i => i.id === id);
            if (existing) existing.qty += (qty - 1);
            else inventory.push({ id, qty: qty - 1 });
        }
        return;
    }

    const existing = inventory.find(i => i.id === id);
    if (existing) existing.qty += qty;
    else inventory.push({ id, qty });
}

// Render current equipment in the equipment menu
function renderEquipment() {
    const eqBox = document.getElementById("equipmentBox");
    if (!eqBox) return;

    eqBox.innerHTML = `
        <div>Weapon: ${equipment.weapon ? equipment.weapon.name : "None"}</div>
        <div>Armor: ${equipment.armor ? equipment.armor.name : "None"}</div>
    `;
}

// OPEN ITEMS MENU
function openItemsMenu() {
    itemsMenuOpen = true;
    itemsMenuIndex = 0;

    const box = document.getElementById("itemsBox");
    if (box) box.style.display = "block";

    renderItemsMenu();
}

// OPEN EQUIPMENT MENU
function openEquipmentMenu() {
    equipmentMenuOpen = true;
    equipmentMenuIndex = 0;

    const box = document.getElementById("equipmentBox");
    if (box) box.style.display = "block";

    renderEquipmentMenu();
}

function closeEquipmentMenu() {
    equipmentMenuOpen = false;
    equipmentMenuIndex = 0;

    const box = document.getElementById("equipmentBox");
    if (box) box.style.display = "none";
}

function renderEquipmentMenu() {
    const box = document.getElementById("equipmentBox");
    if (!box) return;

    const weaponName = equipment.weapon ? equipment.weapon.name : "None";
    const armorName  = equipment.armor  ? equipment.armor.name  : "None";

    const rows = [
        `Weapon: ${weaponName}`,
        `Armor: ${armorName}`
    ];

    box.innerHTML = rows
        .map((txt, i) => `<div class="equip-row ${i === equipmentMenuIndex ? "selected" : ""}">${txt}</div>`)
        .join("");
}

function handleEquipmentMenuConfirm() {
    closeEquipmentMenu();
}

function renderItemsMenu() {
    const box = document.getElementById("itemsBox");
    if (!box) return;

    if (inventory.length === 0) {
        box.innerHTML = "<div class='items-empty'>No items</div>";
        return;
    }

    box.innerHTML = "";

    inventory.forEach((slot, i) => {
        const def = getItemDef(slot.id) || { name: slot.id };
        const row = document.createElement("div");

        row.className = "items-row" + (i === itemsMenuIndex ? " selected" : "");
        row.textContent = `${def.name} x${slot.qty}`;
        box.appendChild(row);
    });
}

function closeItemsMenu() {
    itemsMenuOpen = false;
    itemsMenuIndex = 0;

    const box = document.getElementById("itemsBox");
    if (box) box.style.display = "none";

    dialogueBox.style.display = "none";
}

// CHEST LOGIC (NEWEST VERSION)

const chestTriggers = [
    // ===== OVERWORLD =====
        {
        map: "town",
        opened: false,
        tiles: [
            { x: 19, y: 1 },
            { x: 19, y: 2 },
            { x: 20, y: 1 },
            { x: 20, y: 2 }
        ],
        items: [
            { id: "potion", qty: 3 },
            { id: "mPotion", qty: 2 },
            { id: "sword", qty: 1 },
            { id: "helmet", qty: 1 }
        ],
        gold: 100
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 68, y: 12 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 72, y: 44 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 53, y: 60 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 33, y: 46 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 11, y: 26 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 46, y: 10 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 47, y: 11 }],
        items: [
            { id: "eHelmet", qty: 1 },
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 49, y: 12 }],
        items: [
            { id: "eSword", qty: 1 },
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "overworld",
        opened: false,
        tiles: [{ x: 10, y: 59 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },

    // ===== DUNGEON 1 =====
    {
        map: "dungeon1",
        opened: false,
        tiles: [{ x: 10, y: 59 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "dungeon1",
        opened: false,
        tiles: [{ x: 62, y: 37 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "dungeon1",
        opened: false,
        tiles: [{ x: 52, y: 33 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "dungeon1",
        opened: false,
        tiles: [{ x: 18, y: 15 }],
        items: [
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "dungeon1",
        opened: false,
        tiles: [{ x: 44, y: 18 }],
        items: [
            { id: "lHelmet", qty: 1 },
            { id: "potion", qty: 2 }
        ],
        gold: 10
    },
    {
        map: "dungeon1",
        opened: false,
        tiles: [{ x: 74, y: 2 }],
        items: [
            { id: "lSword", qty: 1 },
            { id: "potion", qty: 2 }
        ],
        gold: 10
    }
];


// Try to open a chest if player is facing it
function tryChest() {
    // Tile in front of player
    let tx = player.x;
    let ty = player.y;

    if (player.direction === 0) ty += 1;   // down
    if (player.direction === 1) tx -= 1;   // left
    if (player.direction === 2) tx += 1;   // right
    if (player.direction === 3) ty -= 1;   // up

    // Loop through all chests
    for (const chest of chestTriggers) {

        // Skip chests from other maps
        if (chest.map !== currentMap) continue;

        // Check if player is facing any tile of this chest
        const touching = chest.tiles.some(t => t.x === tx && t.y === ty);

        if (touching && !chest.opened) {

            // Mark chest opened
            chest.opened = true;

            // Give items
            if (chest.items) {
                for (const item of chest.items) {
                    addToInventory(item.id, item.qty);
                }
            }

            // Give gold
            if (chest.gold) {
                gold += chest.gold;
            }

            // Show popup
            dialogueBox.style.display = "block";
            dialogueBox.innerHTML = `<strong>Found:</strong><br>` +
                chest.items.map(i => `${i.qty} × ${getItemDef(i.id).name}`).join("<br>") +
                (chest.gold ? `<br>${chest.gold} Gold` : "");

            activeDialogue = { name: "Chest", dialogueIndex: 0, dialogue: [] };
            return true;
        }
    }
    return false;
}

// SHOP DEFINITIONS
const shops = {
    tifa: [
        { id: "potion", price: 10 }
    ]
};

// CONFIRM ITEM USE / EQUIP
function handleItemsMenuConfirm() {
    if (!itemsMenuOpen || inventory.length === 0) return;

    const slot = inventory[itemsMenuIndex];
    if (!slot) return;

    const def = getItemDef(slot.id);
    if (!def) return;

    if (inCombat) {
        doItem(); // heals HP/MP + consumes item + triggers enemy turn
        itemsMenuOpen = false;
        document.getElementById("itemsBox").style.display = "none";
        return;
    }

    if (def.type === "consumable") {
        // Apply HP/MP effects from def.effect
        if (def.effect) {
            if (def.effect.hp) {
                playerStats.hp = Math.min(playerStats.maxHP, playerStats.hp + def.effect.hp);
            }

            if (def.effect.mp) {
                playerStats.mp = Math.min(playerStats.maxMP, playerStats.mp + def.effect.mp);
            }
        }

        // Consume item
        slot.qty--;
        if (slot.qty <= 0) {
            inventory.splice(itemsMenuIndex, 1);
            itemsMenuIndex = Math.max(0, itemsMenuIndex - 1);
        }

        renderItemsMenu();

        // Refresh stats menu if open
        if (statsMenuOpen) {
            openStatsMenu();
        }
        return;
    }

    if (def.type === "weapon" || def.type === "armor") {
        equipItem(def.id);
        renderEquipment();
        renderItemsMenu();
        return;
    }
}

// TILESET LOADING
async function loadMap(name) {
    const response = await fetch(`assets/maps/${name}.json`);
    return await response.json();
}

async function loadTilesets(map) {
    const tilesets = [];

    for (const ts of map.tilesets) {
        if (ts.source) {
            const tsxPath = ts.source.split(/[/\\]/).pop();
            const tsx = await fetch(`assets/maps/${tsxPath}`).then(r => r.text());

            const imageMatch = tsx.match(/<image source="([^"]+)"/);
            if (!imageMatch) continue;

            const imageFile = imageMatch[1].split(/[/\\]/).pop();
            const img = new Image();
            img.src = `assets/tilesets/${imageFile}`;
            await img.decode();

            tilesets.push({
                firstgid: ts.firstgid,
                image: img,
                columns: ts.columns,
                tilecount: ts.tilecount,
                tilewidth: ts.tilewidth,
                tileheight: ts.tileheight
            });
            continue;
        }

        const img = new Image();
        const fileName = ts.image.split(/[/\\]/).pop();
        img.src = `assets/tilesets/${fileName}`;
        await img.decode();

        tilesets.push({
            firstgid: ts.firstgid,
            image: img,
            columns: ts.columns,
            tilecount: ts.tilecount,
            tilewidth: ts.tilewidth,
            tileheight: ts.tileheight
        });
    }
    return tilesets;
}

// MAP SWITCHING
async function switchMap(newMapName, newPlayerX, newPlayerY) {
    if (currentMap === newMapName) return;

    townMap = await loadMap(newMapName);
    tilesets = await loadTilesets(townMap);
    currentMap = newMapName;

    // After setting currentMap
    playMusic(currentMap);

    const collisionLayer = townMap.layers.find(
        l => l.name.toLowerCase() === "collision"
    );

    const collisionData = collisionLayer
        ? collisionLayer.data
        : new Array(townMap.width * townMap.height).fill(0);

    const cols = townMap.width;
    const rows = townMap.height;

    collisionGrid = [];
    for (let y = 0; y < rows; y++) {
        collisionGrid[y] = collisionData.slice(y * cols, (y + 1) * cols);
    }

    player.x = newPlayerX;
    player.y = newPlayerY;
    playerTrail = [];

    if (newMapName === "dungeon1") {
        const skele = getFollower();
        if (skele && !skele.followsPlayer) {
            skele.x = 71;
            skele.y = 35;
        }
    }

    const f = getFollower();
    if (f && f.followsPlayer) {
        f.x = player.x;
        f.y = player.y + 1;
        f.moveTimer = 0;
    }
    resetEncounterCounter();
}

// DRAW LAYERS (NEWEST VERSION)
function drawLayer(layer) {
    for (let y = 0; y < townMap.height; y++) {
        for (let x = 0; x < townMap.width; x++) {

            let rawGid = layer.data[y * townMap.width + x];
            if (rawGid === 0) continue;

            const FLIP_H = 0x80000000;
            const FLIP_V = 0x40000000;
            const FLIP_D = 0x20000000;

            const flipH = (rawGid & FLIP_H) !== 0;
            const flipV = (rawGid & FLIP_V) !== 0;
            const flipD = (rawGid & FLIP_D) !== 0;

            const gid = rawGid & 0x1FFFFFFF;
            if (gid === 0) continue;

            const ts = tilesets.find(t => gid >= t.firstgid && gid < t.firstgid + t.tilecount);
            if (!ts) continue;

            const localId = gid - ts.firstgid;

            const sx = (localId % ts.columns) * ts.tilewidth;
            const sy = Math.floor(localId / ts.columns) * ts.tileheight;

            const dx = x * TILE_SIZE - camera.x;
            const dy = y * TILE_SIZE - camera.y;

            ctx.save();
            ctx.translate(dx + TILE_SIZE / 2, dy + TILE_SIZE / 2);

            if (flipD) {
                ctx.rotate(Math.PI / 2);
                const newFlipH = flipV;
                const newFlipV = flipH;
                ctx.scale(newFlipH ? -1 : 1, newFlipV ? -1 : 1);
            } else {
                ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
            }

            ctx.drawImage(
                ts.image,
                sx, sy, ts.tilewidth, ts.tileheight,
                -TILE_SIZE / 2, -TILE_SIZE / 2,
                TILE_SIZE, TILE_SIZE
            );
            ctx.restore();
        }
    }
}

// DRAW BOTTOM + TOP LAYERS
function drawBottomLayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const layer of townMap.layers) {
        if (layer.type !== "tilelayer") continue;
        if (layer.name === "Collision") continue;
        if (layer.name === "Top") continue;
        drawLayer(layer);
    }
}

function drawTopLayers() {
    const topLayer = townMap.layers.find(l => l.name === "Top");
    if (topLayer) drawLayer(topLayer);
}

// COLLISION
let townMap;
let tilesets;
let collisionGrid = [];

function isBlocked(x, y) {
    if (!collisionGrid[y] || collisionGrid[y][x] === undefined) return true;
    if (collisionGrid[y][x] !== 0) return true;

    for (const npc of npcs) {
        if (npc.x === x && npc.y === y) return true;
    }
    return false;
}

// FOLLOWER MOVEMENT
function followPlayer(npc) {
    if (activeDialogue) return;
    if (!gameStarted) return;

    npc.moveTimer--;
    if (npc.moveTimer > 0) return;

    if (playerTrail.length === 0) return;

    const target = playerTrail[0];
    if (!target) return;

    if (!isBlocked(target.x, target.y)) {
        npc.x = target.x;
        npc.y = target.y;
    }
    npc.moveTimer = 4;
}

// NPC UPDATE
function updateNPCs() {
    if (activeDialogue) return;

    for (const npc of npcs) {

        if (!npc.followsPlayer && npc.map !== currentMap && npc.map !== "global") continue;

        if (npc.followsPlayer) {
            followPlayer(npc);
            continue;
        }

        if (npc.isFollower && !npc.followsPlayer) {
            const dist = Math.abs(npc.x - player.x) + Math.abs(npc.y - player.y);
            if (dist <= 10) {
                activateFollower();
                continue;
            }
        }

        if (!npc.isFollower && currentMap !== "town") continue;

        npc.moveTimer--;
        if (npc.moveTimer <= 0) {

            if (npc.stepsTaken >= npc.maxSteps) {
                npc.direction = (npc.direction === 1) ? 2 : 1;
                npc.stepsTaken = 0;
            }

            const dx = npc.direction === 1 ? -1 : npc.direction === 2 ? 1 : 0;
            const dy = npc.direction === 3 ? -1 : npc.direction === 0 ? 1 : 0;

            const newX = npc.x + dx;
            const newY = npc.y + dy;

            if (!isBlocked(newX, newY)) {
                npc.x = newX;
                npc.y = newY;
                npc.stepsTaken++;
            }
            npc.moveTimer = 30 + Math.floor(Math.random() * 30);
        }
    }
}

// ACTIVATE FOLLOWER
function activateFollower() {
    const follower = npcs.find(n => n.isFollower);
    if (!follower) return;

    follower.followsPlayer = true;
    follower.map = "global";
    follower.moveTimer = 0;

    playerTrail = [];

    const dx = player.x - follower.x;
    const dy = player.y - follower.y;
    const steps = Math.abs(dx) + Math.abs(dy);

    let x = follower.x;
    let y = follower.y;

    for (let i = 0; i < steps; i++) {
        if (Math.abs(player.x - x) > Math.abs(player.y - y)) {
            x += Math.sign(player.x - x);
        } else {
            y += Math.sign(player.y - y);
        }
        playerTrail.push({ x, y });
    }
    gameStarted = true;
}

// NPC CREATION
function createNPC(
    x, y, spriteX, spriteY,
    direction = 1,
    maxSteps = 4,
    followsPlayer = false,
    dialogue = [],
    name = "NPC",
    isFollower = false,
    map = "town",
    isShopkeeper = false
) {
    return {
        x, y,
        spriteX, spriteY,
        direction,
        moveTimer: 0,
        maxSteps,
        stepsTaken: 0,
        followsPlayer,
        isFollower,
        dialogue,
        dialogueIndex: 0,
        pesterTimer: 20 + Math.floor(Math.random() * 30),
        name,
        map,
        isShopkeeper
    };
}


// NPC DEFINITIONS
const dungeonSheet = new Image();
dungeonSheet.src = "assets/sprites/dungeon.png";

const npcs = [
    createNPC(10, 6, 8*16, 1*16, 1, 4, false, [
        "Welcome! Want to buy something?",
    ], "Tifa", false, "town", true),


    createNPC(12, 18, 8*16, 9*16, 2, 3, false, [
        "The forest is dangerous.",
        "Make sure to stock up on supplies!"
    ], "Yuna"),

    createNPC(30, 11, 8*16, 3*16, 1, 2, false, [
        "I lost my cat somewhere around here.",
        "Have you seen it?"
    ], "Auron"),

    createNPC(30, 19, 8*16, 11*16, 1, 2, false, [
        "The old well is said to be haunted.",
        "I wouldn't go near it if I were you."
    ], "Vivi"),

    createNPC(30, 3, 8*16, 17*16, 1, 2, false, [
        "This is a mysterious place.",
        "Be careful where you step!"
    ], "Cloud"),

    createNPC(9, 11, 8*16, 19*16, 1, 2, false, [
        "The town guard is always watching.",
        "Try not to cause any trouble."
    ], "Wakka"),

    createNPC(71, 35, 28*16, 5*16, 0, 0, false, [
        "Hey! YOU!!! I know you! Let's battle!",
        "No... a rap battle duh..... w-w-wait!!!",
        "You better lose yourself in the music, the magic, you own it, you better never let it go!",
        "H-h-hey! Wait for me!",
        "I think Ja Rules lives in here... he is only level 1 though, so don't worry!",
        "Oh no.... Did you hear that? I don't think we should go any deeper, it sounds like a Diddy part down there...",
        "asdfaggfjooidsgjefsfdsgfsjtyjkhgjdtyjdkukjhfkupirjgioooehowhhfhuohfrohf! RAP GOD!!!"
    ], "SkeleStan", true, "dungeon1"),

];

// create boss NPC on dungeon2 at 7,7
const bossNPC = createNPC(
    7, 7,            // x, y
    7 * 16, 28 * 16, // spriteX, spriteY (map sprite)
    0,               // direction
    0,               // maxSteps (stationary)
    false,           // followsPlayer
    ["You dare challenge me?"], // dialogue
    "Dungeon Lord",  // name
    false,           // isFollower
    "dungeon2",      // map
    false,           // isShopkeeper
    true             // isBoss (if your createNPC supports this param)
);

// Ensure flags exist (in case createNPC doesn't set them)
bossNPC.isBoss = true;
bossNPC.isDefeated = false;

// Add to the global NPC list
npcs.push(bossNPC);


// GET FOLLOWER
function getFollower() {
    return npcs.find(n => n.isFollower);
}

// DRAW NPCs
function drawNPCs() {
    for (const npc of npcs) {
        if (!npc.followsPlayer && npc.map !== currentMap && npc.map !== "global") continue;

        ctx.drawImage(
            dungeonSheet,
            npc.spriteX, npc.spriteY, 16, 16,
            npc.x * TILE_SIZE - camera.x,
            npc.y * TILE_SIZE - camera.y,
            16, 16
        );
    }
}

// INIT
async function init() {
    townMap = await loadMap("town");
    tilesets = await loadTilesets(townMap);

    const collisionLayer = townMap.layers.find(
        l => l.name.toLowerCase() === "collision"
    );

    const collisionData = collisionLayer
        ? collisionLayer.data
        : new Array(townMap.width * townMap.height).fill(0);

    const cols = townMap.width;
    const rows = townMap.height;

    collisionGrid = [];
    for (let y = 0; y < rows; y++) {
        collisionGrid[y] = collisionData.slice(y * cols, (y + 1) * cols);
    }
    resetEncounterCounter();

    gameLoop();
}

window.addEventListener("load", () => {
    init();
});