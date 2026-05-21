// Define items
const ITEMS = [
    {
        id: "potion",
        name: "Potion",
        type: "consumable",
        description: "Heals 20 HP.",
        effect: { hp: +20 },
        stack: 99,
        iconX: 0,
        iconY: 0
    },

    {
        id: "mPotion",
        name: "Magic Potion",
        type: "consumable",
        description: "Heals 5 MP.",
        effect: { mp: +5 },
        stack: 99,
        iconX: 0,
        iconY: 0
    },

    {
        id: "sword",
        name: "Sword",
        type: "weapon",
        description: "A basic sword.",
        stats: { atk: 5 },
        rarity: "common",
        iconX: 0,
        iconY: 0
    },

    {
        id: "eSword",
        name: "Epic Sword",
        type: "weapon",
        description: "A powerful sword.",
        stats: { atk: 7 },
        rarity: "epic",
        iconX: 0,
        iconY: 0
    },

    {
        id: "lSword",
        name: "Legendary Sword",
        type: "weapon",
        description: "A legendary blade.",
        stats: { atk: 10 },
        rarity: "legendary",
        iconX: 0,
        iconY: 0
    },

    {
        id: "sSword",
        name: "Skele Sword",
        type: "weapon",
        description: "A Skeletal blade.",
        stats: { atk: 20 },
        rarity: "special",
        iconX: 0,
        iconY: 0
    },

    {
        id: "helmet",
        name: "Helmet",
        type: "armor",
        slot: "head",
        description: "Basic head protection.",
        stats: { def: 3 },
        rarity: "common",
        iconX: 0,
        iconY: 0
    },

    {
        id: "eHelmet",
        name: "Epic Helmet",
        type: "armor",
        slot: "head",
        description: "Strong head protection.",
        stats: { def: 4 },
        rarity: "epic",
        iconX: 0,
        iconY: 0
    },

    {
        id: "lHelmet",
        name: "Legendary Helmet",
        type: "armor",
        slot: "head",
        description: "Legendary head protection.",
        stats: { def: 6 },
        rarity: "legendary",
        iconX: 0,
        iconY: 0
    }
];
