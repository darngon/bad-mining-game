// noinspection DuplicatedCode

let settings = {aiTooltips: false, mapSize: 15, blockTextures: true};
let liquids = [];
let player = {
    falling: false,
    health: 100,
    foodPoints: 100,
    drinkPoints: 100,
    maxHealth: 100,
    maxFood: 100,
    maxDrink: 100,
    flight: false,
    pickaxe: items.stickPickaxe,
    axe: items.stickAxe,
    pos: {x: ~~(Math.random() - 0.5 * 10 ** (Math.random() * 6)), y: 1},
    size: {w: 2, h: 6},
    lastDirection: "l",
    tempMod: 0,
    bodyTemperature: 98.6
};
let game = {
    time: 7000
};
let debug = {
    frames: 0,
    lastSave: localStorage.getItem("lastSave"),
    liquidLoopIds: [],
    oreLocations: [],
    liquidLocations: [],
    textures: {
        item: [],
        block: []
    },
    loadTextures: () => {
        let output = "";
        for (const key in items)
            output += `<img alt='${key}' src='textures/item/${key}.png' onload="debug.textures.item.push('${key}'); document.getElementById('textureProgress').value = (Array.from(new Set(debug.textures.item)).length + Array.from(new Set(debug.textures.block)).length) / (Object.keys(items).length + ores.length);">`;
        for (const ore of ores)
            output += `<img alt='${ore.id}' src='textures/block/${ore.id}.png' onload="debug.textures.block.push('${ore.id}'); document.getElementById('textureProgress').value = (Array.from(new Set(debug.textures.item)).length + Array.from(new Set(debug.textures.block)).length) / (Object.keys(items).length + ores.length);">`;
        document.getElementById("debugTextureLoading").innerHTML = output;
    }
};
let buildMode = {enabled: false, id: "airBlock"};

function addItemsToOres() {
    for (let i = 0; i < ores.length; i++) {
        if (items[ores[i].id] === undefined || items[ores[i].id] === null) {
            items[ores[i].id] = {
                name: capitalize(camelCaseToRegular(ores[i].id)),
                size: ores[i].size === undefined || ores[i].size === null ? 1 : ores[i].size,
                types: ores[i].commonness === undefined || ores[i].commonness === null ? ["block"] : []
            };
            for (const k of Object.keys(ores[i])) {
                items[ores[i].id][k] = ores[i][k];
            }
            if (ores[i].excludeSize) items[ores[i].id].size = undefined;
            if (ores[i].types.includes("liquid")) {
                name += " Bucket";
            }
        }
        if (ores[i].maxY === undefined || ores[i].maxY === null) {
            ores[i].foundBelow = Infinity;
        }
        if (ores[i].minY === undefined || ores[i].minY === null) {
            ores[i].foundAbove = Infinity;
        }
    }
}

function itemsUpdate() {
    for (const key in items) {
        if (items[key].types === undefined) {
            items[key].types = [];
        }
    }
    for (let o = 0; o < ores.length; o++) {
        const minHeight = ores[o].minY !== -Infinity ? ores[o].minY : -1000000;
        const maxHeight = ores[o].maxY !== Infinity ? ores[o].maxY : 1000000;
        const distanceFrom0 = Math.abs(ores[o].maxY) > Math.abs(ores[o].minY) ? Math.abs(ores[o].minY) : Math.abs(ores[o].maxY);
        const overallCommonness = ores[o].commonness * (maxHeight - minHeight + 1) - distanceFrom0;
        let setRarity;
        if (overallCommonness >= 2000000) {
            setRarity = "Common";
        } else if (overallCommonness >= 60000) {
            setRarity = "Uncommon";
        } else if (overallCommonness >= 15000) {
            setRarity = "Rare";
        } else if (overallCommonness >= 5000) {
            setRarity = "Epic";
        } else if (overallCommonness >= -50000) {
            setRarity = "Legendary";
        } else {
            setRarity = "Mythical";
        }
        if (!items[ores[o].id].types.includes("block") && items[ores[o].id].rarity === undefined) {
            items[ores[o].id].rarity = setRarity;
        }
    }
    for (let j = 0; j < recipes.length; j++) {
        if (items[recipes[j].output.id].size === undefined || items[recipes[j].output.id].size === null) {
            let size = 0;
            for (let i = 0; i < recipes[j].ingredients.length; i++) {
                size += items[recipes[j].ingredients[i].id].size * recipes[j].ingredients[i].count / (recipes[j].output.count !== 0 ? recipes[j].output.count : 1);
            }
            items[recipes[j].output.id].size = size;
        }
        if (items[recipes[j].output.id].rarity === undefined || items[recipes[j].output.id].rarity === null) {
            const rarities = {undefined: -1, Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythical: 5};
            let highestRarity = -1;
            for (let i = 0; i < recipes[j].ingredients.length; i++) {
                if (rarities[String(items[recipes[j].ingredients[i].id].rarity)] > highestRarity) {
                    /* if (rarities[String(items[recipes[j].ingredients[i].id].rarity)] === -1) {
                        itemsUpdate();
                    } */
                    highestRarity = rarities[items[recipes[j].ingredients[i].id].rarity];
                }
            }
            items[recipes[j].output.id].rarity = highestRarity === 5 ? "Mythical" : highestRarity === 4 ? "Legendary" : highestRarity === 3 ? "Epic" : highestRarity === 2 ? "Rare" : highestRarity === 1 ? "Uncommon" : highestRarity === 0 ? "Common" : undefined;
        }
    }
    for (let i = 0; i < recipes.length; i++) {
        if (items[recipes[i].output.id].size === undefined || items[recipes[i].output.id].size === null || items[recipes[i].output.id].rarity === undefined || items[recipes[i].output.id].rarity === null) {
            itemsUpdate();
            break;
        }
    }
}

const healthText = document.getElementById("health");
const healthBar = document.getElementById("healthBar");
const inventoryGui = document.getElementById("inventory");
let isInventoryOpen = false;
debug.oreLocations[0] = [];
generateOre(player.pos.x - 1, player.pos.y);
generateOre(player.pos.x + 1, player.pos.y);
generateOre(player.pos.x, player.pos.y - 1);
generateOre(player.pos.x, player.pos.y + 1);
debug.oreLocations[0][0] = {id: "air"};

if (localStorage.getItem("inventoryHTML") !== null) {
    document.getElementById("inventory").innerHTML = localStorage.getItem("inventoryHTML");
}

if (localStorage.getItem("recipesHTML") !== null) {
    document.getElementById("recipes").innerHTML = localStorage.getItem("recipesHTML");
}

function start() {
    document.getElementById("controls").style.display = "none";
    document.getElementById("main").style.display = "";
    document.getElementById("music").play();
    document.getElementById("music").volume = 0.5;
    reload();
    addItem("airBlock", 100);
}

function openInventory() {
    isInventoryOpen = true;
    inventoryGui.style.top = "0";
    document.getElementById("recipes").style.top = "0";
    document.getElementById("openInventory").style.display = "none";
    document.getElementById("closeInventory").style.display = "";
    document.querySelector("#map").style.filter = "blur(0.25vw)";
    document.querySelector("#statBars").style.filter = "blur(0.25vw)";
}

function closeInventory() {
    isInventoryOpen = false;
    inventoryGui.style.top = "100vh";
    document.getElementById("recipes").style.top = "100vh";
    document.querySelector("#map").style.filter = "blur(0)";
    document.querySelector("#statBars").style.filter = "blur(0)";
    document.getElementById("openInventory").style.display = "";
    document.getElementById("closeInventory").style.display = "none";
    document.querySelector("#itemMenu").style.display = "none";
}

function craft(recipe) {
    const canCraft = checkForIngredients(recipe);
    if (canCraft[0]) {
        for (let i = 1; i < canCraft.length; i++) {
            addItem(canCraft[i].id, -canCraft[i].count);
        }
        addItem(recipe.output.id, recipe.output.count);
        if (recipe.output.function !== undefined && recipe.output.function !== null) {
            recipe.output.function();
            addItem("dirt", 0);
        }
        if (items[recipe.output.id].types.includes("pickaxe") && items[recipe.output.id].strength >= player.pickaxe.strength) {
            player.pickaxe = items[recipe.output.id];
        }
        if (items[recipe.output.id].types.includes("axe") && items[recipe.output.id].durability >= player.axe.durability) {
            player.axe = items[recipe.output.id];
        }
    }
}

function recycle(id) {
    if (items[id].recycle !== undefined) {
        addItem(id, -1);
        for (let i = 0; i < items[id].recycle.length; i++) {
            addItem(items[id].recycle[i].id, items[id].recycle[i].count);
        }
    }
}

function rarityColor(rarity) {
    if (rarity === "Mythical") {
        return "#08f";
    } else if (rarity === "Legendary") {
        return "#f80";
    } else if (rarity === "Epic") {
        return "#f0f";
    } else if (rarity === "Rare") {
        return "#0ff";
    } else if (rarity === "Uncommon") {
        return "#ff4";
    } else {
        return "#fff";
    }
}

function updateRecipeBook() {
    let output = "";
    for (let r = 0; r < recipes.length; r++) {
        if (checkForIngredients(recipes[r])[0]) {
            const recipe = recipes[r];
            const rarityColor1 = rarityColor(items[recipe.output.id].rarity);
            output += `<button class='recipe' onclick='craft(recipes[${r}]); updateRecipeBook();' oncontextmenu='while (checkForIngredients(recipes[${r}])[0]) {craft(recipes[${r}]); updateRecipeBook();}'><p style="color: ${rarityColor1};">${items[String(recipe.output.id)].name} (${recipe.output.count})</p>`;
            for (let c = 0; c < recipe.ingredients.length; c++) {
                const {count, id, name} = recipe.ingredients[c];
                const rarity = items[id].rarity;
                let color = rarityColor(rarity);
                output += `<p class='recipeIngredient' style="color: ${color};">${items[Array.isArray(name) ? id[0] : id].name} (${count > 0 ? count : "1"})</p>`;
            }
            output += "</button>";
        }
    }

    const arrow = document.createElement("img");
    arrow.src = "textures/gui/arrow.png";
    arrow.alt = "arrow";
    arrow.className = "leftArrow";
    arrow.addEventListener("click", () => {
        document.querySelector("#inventory").style.left = "0";
        document.querySelector("#recipes").style.left = "100vw";
    });

    document.getElementById("recipes").innerHTML = `<span>Crafting</span><br>${String(output).replace("undefined", "")}`;
    document.querySelector("#recipes").append(arrow);
}

function checkForIngredients(recipe, inv) {
    inv = inventory || inv;
    let availableIngredients = [];
    for (let i = 0; i < recipe.ingredients.length; i++) {
        for (let j = 0; j < inv.length; j++) {
            const {count, id} = recipe.ingredients[i];
            if ((inv[j].id === id || Array.isArray(id) && id.includes(inv[j].id)) && inv[j].count.gten(count)) {
                availableIngredients.push({id: id, count: count});
            }
        }
    }
    availableIngredients.unshift(availableIngredients.length >= recipe.ingredients.length);
    return availableIngredients;
}

function isLiquid(x, y) {
    for (let i = 0; i < ores.length; i++) {
        if (debug.oreLocations[x] === undefined)
            return false;
        if (debug.oreLocations[x][y] && ores[i].id === debug.oreLocations[x][y].id) {
            if (ores[i].types !== undefined) {
                return ores[i].types.includes("liquid");
            } else {
                return false;
            }
        }
    }
}

function generateAroundPlayer() {
    if (debug.oreLocations[player.pos.x] === undefined || debug.oreLocations[player.pos.x][player.pos.y] === undefined || debug.oreLocations[player.pos.x] === null || debug.oreLocations[player.pos.x][player.pos.y] === null) {
        generateOre(player.pos.x, player.pos.y);
    }
    if (debug.oreLocations[player.pos.x - 1] === undefined || debug.oreLocations[player.pos.x - 1][player.pos.y] === undefined || debug.oreLocations[player.pos.x - 1] === null || debug.oreLocations[player.pos.x - 1][player.pos.y] === null) {
        generateOre(player.pos.x - 1, player.pos.y);
    }
    if (debug.oreLocations[player.pos.x + 1] === undefined || debug.oreLocations[player.pos.x + 1][player.pos.y] === undefined || debug.oreLocations[player.pos.x + 1] === null || debug.oreLocations[player.pos.x + 1][player.pos.y] === null) {
        generateOre(player.pos.x + 1, player.pos.y);
    }
    if (debug.oreLocations[player.pos.x] === undefined || debug.oreLocations[player.pos.x][player.pos.y - 1] === undefined || debug.oreLocations[player.pos.x] === null || debug.oreLocations[player.pos.x][player.pos.y - 1] === null) {
        generateOre(player.pos.x, player.pos.y - 1);
    }
    if (debug.oreLocations[player.pos.x] === undefined || debug.oreLocations[player.pos.x][player.pos.y + 1] === undefined || debug.oreLocations[player.pos.x] === null || debug.oreLocations[player.pos.x][player.pos.y + 1] === null) {
        generateOre(player.pos.x, player.pos.y + 1);
    }
}

function checkInventoryFor(id) {
    if (id[0] === "#") {
        for (let i = 0; i < inventory.length; i++) {
            if (items[inventory[i].id].types.includes(id.slice(1)) && inventory[i].count.number() > 0) return inventory[i].id;
        }
    } else {
        for (let i = 0; i < inventory.length; i++) {
            if (inventory[i].id === id && inventory[i].count.number() > 0) return id;
        }
    }
    return false;
}

function teleport(x, y) {
    player.pos.x = x;
    player.pos.y = y;
    generateAroundPlayer();
}

function move(direction) {
    player.lastDirection = direction;
    const {x, y} = player.pos;

    if (direction === "l") {
        if (!isSolid(x - 1, y)) {
            player.pos.x--;
        } else if (!isSolid(x - 1, y + 1) && !isSolid(x, y + 1)) {
            player.pos.x--;
            player.pos.y++;
        }
    } else if (direction === "r") {
        if (!isSolid(x + 1, y)) {
            player.pos.x++;
        } else if (!isSolid(x + 1, y + 1) && !isSolid(x, y + 1)) {
            player.pos.x++;
            player.pos.y++;
        }
    } else if (direction === "u" && !player.falling) {
        if (!isSolid(x, y + 1)) {
            player.pos.y++;
        }
    } else if (direction === "d") {
        if (!isSolid(x, y - 1)) {
            player.pos.y--;
        }
    }
    generateAroundPlayer();
    if (getOreData(debug.oreLocations[player.pos.x][player.pos.y - 1].id).types.includes("notSolid") || isLiquid(player.pos.x, player.pos.y - 1)) {
        if (!player.flight) {
            player.falling = true;
            move("d");
        }
    } else {
        player.falling = false;
    }
    updateVision();
    document.getElementById("altitude").innerHTML = `Altitude: ${simplify(player.pos.y)} ft<br>Position: ${player.pos.x >= 0 ? simplify(player.pos.x) + " ft" + " east" : simplify(-player.pos.x) + " ft" + " west"}`;
}

function buildBelow(onlyCheck) {
    let placed = false;
    if (!player.flight) {
        for (let i = 0; i < inventory.length; i++) {
            if (items[inventory[i].id].types.includes("block") && inventory[i].count.gten(1)) {
                if (!onlyCheck) {
                    if (!debug.oreLocations[player.pos.x][player.pos.y - 1]) debug.oreLocations[player.pos.x][player.pos.y - 1] = {};
                    debug.oreLocations[player.pos.x][player.pos.y - 1].id = inventory[i].id;
                    addItem(inventory[i].id, -1);
                }
                placed = true;
                break;
            }
        }
    } else {
        placed = true;
    }
    return placed;
}

function updateVision(x, y) {
    debug.liquidLocations = [];
    const cvs = document.getElementById("map");
    const ctx = cvs.getContext("2d");
    const squareSize = 810 / settings.mapSize;
    if (x === undefined && y === undefined) {
        // noinspection SillyAssignmentJS
        cvs.width = cvs.width;
    } else {
        ctx.clearRect((x - player.pos.x) * squareSize + 405 - 5 * squareSize / 10, 810 - ((y - player.pos.y) * squareSize + 405 + 5 * squareSize / 10), squareSize, squareSize);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.rect(0, 0, 810, 810);
    ctx.stroke();

    function update(x1, y1) {
        if (debug.oreLocations[x1] !== undefined && debug.oreLocations[x1] !== null && debug.oreLocations[x1][y1] !== undefined && debug.oreLocations[x1][y1] !== null) {
            let hasImage = false;
            for (let i = 0; i < ores.length; i++) {
                if (ores[i].id === debug.oreLocations[x1][y1].id) {
                    ctx.fillStyle = ores[i].color;
                    break;
                }
            }
            if (debug.textures.block.includes(debug.oreLocations[x1][y1].id)) hasImage = true;
            if (!hasImage) {
                ctx.fillRect((x1 - player.pos.x) * squareSize + 405 - 5 * squareSize / 10, 810 - ((y1 - player.pos.y) * squareSize + 405 + 5 * squareSize / 10), squareSize, squareSize);
            } else {
                const blockImg = new Image();
                blockImg.src = `./textures/block/${debug.oreLocations[x1][y1].id}.png`;
                ctx.drawImage(blockImg, (x1 - player.pos.x) * squareSize + 405 - 5 * squareSize / 10, 810 - ((y1 - player.pos.y) * squareSize + 405 + 5 * squareSize / 10), squareSize, squareSize);
            }
            ctx.fillStyle = "#ff0";
        } else {
            generateOre(x1, y1);
        }
        for (const e of [{x: -1, y: 0}, {x: 1, y: 0}, {x: 0, y: -1}, {x: 0, y: 1}, {x: 0, y: 0}]) {
            x1 += e.x;
            y1 += e.y;
            if (isLiquid(x1, y1) && !debug.liquidLocations.includes(`${x1},${y1} ♸${debug.oreLocations[x1][y1].id}♸`)) {
                debug.liquidLocations.push(`${x1},${y1} ♸${debug.oreLocations[x1][y1].id}♸`);
            }
        }
    }

    if (x === undefined && y === undefined) {
        for (let x1 = player.pos.x - (settings.mapSize / 2 - 0.5) - 3; x1 < player.pos.x + (settings.mapSize / 2 - 0.5) + 3; x1++) {
            for (let y1 = player.pos.y - (settings.mapSize / 2 - 0.5) - 3; y1 < player.pos.y + (settings.mapSize / 2 - 0.5) + 3; y1++) {
                update(x1, y1);
            }
        }
    } else {
        update(x, y);
    }
    const playerImg = new Image();
    playerImg.src = "./textures/player.png";
    ctx.drawImage(playerImg, 405 - squareSize / 2, 405 - squareSize / 2, squareSize, squareSize);
}

function generateOre(x, y) {
    let ore;
    let possibleOres = [];
    let maxCommonness = 0;
    for (let o = 0; o < ores.length; o++) {
        if (y >= ores[o].minY && y <= ores[o].maxY) {
            const possibleOreLength = possibleOres.length;
            possibleOres.push(ores[o]);
            maxCommonness += ores[o].commonness;
            possibleOres[possibleOreLength].common = maxCommonness;
        }
    }
    const randomNumber = Math.random() * maxCommonness;
    for (let i = 0; i < possibleOres.length; i++) {
        if (randomNumber < possibleOres[i].common) {
            ore = possibleOres[i];
            break;
        }
    }
    if (debug.oreLocations[x] === undefined || debug.oreLocations[x] === null) {
        debug.oreLocations[x] = [];
    }
    if (debug.oreLocations[x][y] === undefined || debug.oreLocations[x][y] === null) debug.oreLocations[x][y] = {};
    debug.oreLocations[x][y].id = ore.id;
    if (isLiquid(x, y) && !debug.liquidLocations.includes(`${x},${y} ♸${debug.oreLocations[x][y].id}♸`)) {
        debug.liquidLocations.push(`${x},${y} ♸${debug.oreLocations[x][y].id}♸`);
    }
    let number;
    if (ore.veinSize !== undefined) {
        number = Math.ceil(Math.random() * ore.veinSize);
    } else {
        number = Math.ceil(Math.random() * 2 ** (ore.commonness / 30));
    }
    let radius = 1;
    for (let i = 0; i < number; i++) {
        if (ore.replaceableOres === undefined || ore.replaceableOres === null) {
            ore.replaceableOres = [];
        }
        const x2 = x + ~~(Math.random() * radius - radius / 2);
        const y2 = y + ~~(Math.random() * radius - radius / 2);
        if (debug.oreLocations[x2] === undefined || debug.oreLocations[x2] === null) {
            debug.oreLocations[x2] = [];
        }
        if (debug.oreLocations[x2][y2] === undefined || debug.oreLocations[x2][y2] === null || ore.replaceableOres.includes[debug.oreLocations[x2][y2].id]) {
            radius = 0;
            debug.oreLocations[x2][y2] = {};
            debug.oreLocations[x2][y2].id = ore.id;
        } else {
            radius++;
            i--;
        }
    }
}

function generateLoot(lootTable) {
    let maxWeight = 0;
    for (let i = 0; i < lootTable.length; i++) {
        maxWeight += lootTable[i].weight;
        lootTable[i].weight = maxWeight;
    }
    const randNum = Math.random() * maxWeight;
    for (let i = 0; i < lootTable.length; i++) {
        if (randNum < lootTable[i].weight) {
            return [lootTable[i].id, Math.round((Math.random() * lootTable[i].count.max - lootTable[i].count.min + lootTable[i].count.min) / lootTable[i].count.round) * lootTable[i].count.round];
        }
    }
}

function exportSave() {
    let output = {};
    output.inventory = inventory;
    output.player = player;
    output.maxSize = maxSize;
    output.mapSize = settings.mapSize;
    // output.items = items;
    // output.recipes = recipes;
    // output.ores = ores;
    output.settings = settings;
    output.game = game;

    output.oreLocations = Object.assign({}, debug.oreLocations);
    for (const x in output.oreLocations) output.oreLocations[x] = Object.assign({}, output.oreLocations[x]);

    const date = Date().split(" ");
    date.splice(5);

    download(`save-${date.join("_")}.bmgsave`, btoa(JSON.stringify(output)));
    localStorage.setItem("lastSave", debug.lastSave);
}

async function importSave(file) {
    const save = await file.text();
    let input = JSON.parse(atob(save));
    inventory = input.inventory;
    for (let i = 0; i < inventory.length; i++) {
        inventory[i].count = new hugeNumber(inventory[i].count);
    }
    player = input.player;
    game = input.game;
    maxSize = input.maxSize;
    settings.mapSize = input.mapSize;
    // items = input.items;
    // ores = input.ores;
    // recipes = input.recipes;
    settings = input.settings;
    debug.oreLocations = Object.assign([], input.oreLocations);
    for (const x in debug.oreLocations) debug.oreLocations[x] = Object.assign([], debug.oreLocations[x]);
    reload();
}

function updateInventory() {
    addItem("air", 0);
}

function die(deathMessage) {
    if (deathMessage === undefined || deathMessage === null) {
        deathMessage = "";
    }
    player.health = 100;
    player.foodPoints = 100;
    player.drinkPoints = 100;
    inventory = [];
    player.pos = {x: 0, y: 0};
    addItem("airBlock", 100);
    document.getElementById("main").style.display = "none";
    document.getElementById("deathMessage").style.display = "";
    document.getElementById("deathMessageText").innerHTML = deathMessage;
    document.body.style.backgroundColor = "darkred";
    updateRecipeBook();
}

function godMode() {
    player.flight = true;
    player.pickaxe.durability = Infinity;
    player.pickaxe.strength = Infinity;
    player.axe.durability = Infinity;
    maxSize = Infinity;
    player.maxHealth = Infinity;
    player.maxFood = Infinity;
    player.maxDrink = Infinity;
    player.health = Infinity;
    player.foodPoints = Infinity;
    player.drinkPoints = Infinity;
    for (let i = 0; i < Object.keys(items).length; i++) {
        addItem(Object.keys(items)[i], 1e12);
    }
    updateRecipeBook();
}

function updateCheatSheets() {
    let output = "<legend>Recipe Cheat Sheet</legend>";
    for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        output += `<fieldset class="recipe"><p style="color: ${rarityColor(items[recipe.output.id].rarity)}"><u>${items[String(recipe.output.id)].name} (${recipe.output.count})</u></p>`;
        for (let c = 0; c < recipe.ingredients.length; c++) {
            const color = rarityColor(items[recipe.ingredients[c].id].rarity);
            output += `<p class='recipeIngredient' style="color: ${color};">${items[recipe.ingredients[c].id].name} (${recipe.ingredients[c].count > 0 ? recipe.ingredients[c].count : "1"})</p>`;
        }
        output += `</fieldset>`;
    }
    document.getElementById("recipeCheatSheet").innerHTML = output.replaceAll("undefined", "");

    output = "<legend>Ore Cheat Sheet</legend>";
    for (let i = 0; i < ores.length; i++) {
        if (ores[i].commonness !== undefined && ores[i].commonness !== null) {
            let heightRange;
            if (ores[i].minY === -Infinity) {
                heightRange = `Below ${ores[i].maxY} ft`;
            } else if (ores[i].maxY === Infinity) {
                heightRange = `Above ${ores[i].minY} ft`;
            } else {
                heightRange = `${ores[i].minY} ft to ${ores[i].maxY} ft`;
            }
            output += `<fieldset class="recipe" style='background: ${ores[i].color}; color: ${oppositeColor({hex: ores[i].color})};'><p><b><u>${items[ores[i].id].name}</u></b></p><p>Hardness: ${ores[i].hardness}</p><p>Commonness: ${ores[i].commonness}</p><p>Obtainable Height Range: ${heightRange}</p></fieldset>`;
        }
    }
    document.getElementById("oreCheatSheet").innerHTML = output.replaceAll(undefined, "");
}

async function loadMod(mod, variable) {
    let add = false;
    let text;
    if (variable !== "other") {
        add = confirm("Add to current variable? (OK for appending, Cancel to replace)");
        text = JSON.parse(await mod.text());
    }
    const scriptText = await mod.text();
    if (!add) {
        eval(`${variable} = text`);
    } else {
        if (variable === "items") {
            const keys = Object.keys(text);
            for (let i = 0; i < keys.length; i++) {
                items[keys[i]] = text[keys[i]];
            }
        } else if (variable === "recipes") {
            for (let i = 0; i < text.length; i++) {
                if (text[i].output.function !== undefined && text[i].output.function !== null) {
                    text[i].output.function = eval(text[i].output.function);
                }
            }
            recipes = recipes.concat(text);
        } else if (variable === "ores") {
            ores = ores.concat(text);
        } else if (variable === "other") {
            eval(scriptText);
        }
    }
    reload();
}

function reload() {
    addItemsToOres();
    itemsUpdate();
    updateCheatSheets();
    updateInventory();
    liquidUpdate();
    generateDesc();
    debug.loadTextures();
    resizeCanvas();
}

async function loadScript(script) {
    eval(await script.text());
    reload();
}

function navigateTo(location) {
    const locations = ["main", "options"];
    for (let i = 0; i < locations.length; i++) {
        if (locations[i] === location) {
            document.getElementById(locations[i]).style.display = "";
        } else {
            document.getElementById(locations[i]).style.display = "none";
        }
    }
}

function secondsToOtherUnits(n) {
    if (typeof n === "number") {
        if (n < 60) {
            return `${Math.floor(n)} sec`;
        } else if (n < 3600) {
            return `${Math.floor(n / 60)} min`;
        } else if (n < 172800) {
            return `${Math.floor(n / 3600)} hr`;
        } else if (n < 31557600) {
            return `${Math.floor(n / 86400)} d`;
        } else {
            return `${Math.floor(n / 31557600)} yr`;
        }
    } else {
        return n;
    }
}

reload();

function getOreData(id) {
    for (let i = 0; i < ores.length; i++) {
        if (ores[i].id === id) {
            return ores[i];
        }
    }
    return false;
}

setInterval(() => {
    // Health System
    if (player.health < player.maxHealth && player.foodPoints >= 0.1 * player.maxFood) player.health++;
    if (player.health <= 0) die();
    if (player.health > player.maxHealth) player.health = player.maxHealth;

    if (player.foodPoints > player.maxFood) player.foodPoints = player.maxFood;
    if (player.foodPoints > 0) {
        player.foodPoints -= Math.random() * 0.2;
    } else {
        player.health--;
        if (player.health <= 0) die("You starved to death!");
    }

    if (player.drinkPoints > player.maxDrink) player.drinkPoints = player.maxDrink;
    if (player.drinkPoints > 0) {
        player.drinkPoints -= Math.random() * 0.3;
    } else {
        player.health -= 5;
        if (player.health <= 0) die("You died of dehydration!");
    }
    game.time += 20;

    const dayTime = game.time % 24000;
    const hour = dayTime / 1000;
    let baseTemperature = 50 - player.pos.y ** 3 / 1e10, tempColor;
    const n = hour > 5 && hour <= 20 ? (56.25 - (hour - 12.5) ** 2) / 200 - 0.11718729167 : -0.11718729167;
    player.tempMod += Math.random() * n * 1.5 - n / 2;
    player.tempMod += Math.random() * 0.04 - 0.02; // temperature modifier
    let temperatureModifier = player.tempMod;
    if (debug.oreLocations[player.pos.x][player.pos.y].id === "water") {
        temperatureModifier -= 10;
        temperatureModifier /= 4;
    }
    if (debug.oreLocations[player.pos.x][player.pos.y].id === "lava") temperatureModifier += 1200 + Math.random() * 100 - 50;
    player.temperature = baseTemperature + temperatureModifier;

    if (player.temperature > 140) {
        tempColor = "#e61a1a";
    } else if (player.temperature > 100) {
        tempColor = lerpColor("#e6d51a", "#e61a1a", (player.temperature - 100) / 40);
    } else if (player.temperature > 72) {
        tempColor = lerpColor("#ffffff", "#e6d51a", (player.temperature - 72) / 28);
    } else if (player.temperature > 40) {
        tempColor = lerpColor("#1a91e6", "#ffffff", (player.temperature - 40) / 32);
    } else if (player.temperature > 0) {
        tempColor = lerpColor("#7c2eda", "#1a91e6", player.temperature / 40);
    } else {
        tempColor = "#7c2eda";
    }

    if (player.temperature > 100 && !checkInventoryFor("heatProtection")) {
        player.bodyTemperature += (player.temperature - player.bodyTemperature) / 1000;
    } else if (player.temperature < 40 && !checkInventoryFor("coldProtection")) {
        player.bodyTemperature += ((player.temperature + 58.6) - player.bodyTemperature) / 1000;
    }

    document.querySelector("#temperature").style.animationName = player.temperature > 140 || player.temperature < 0 ? "flash" : "";

    document.querySelector("#temperature").innerHTML = `Environment ${player.temperature.toLocaleString(undefined, {maximumFractionDigits: 2})}°F<br>Body ${player.bodyTemperature.toLocaleString(undefined, {maximumFractionDigits: 2})}°F`;
    document.querySelector("#temperature").style.color = tempColor;

    function setBG(color) {
        document.querySelector("body").style.backgroundColor = color;
    }

    // 194 - 260
    // 5 - 8 sunrise | 17 - 20 sunset
    if (dayTime >= 5000 && dayTime < 8000) {
        setBG("hsl(" + (260 - (dayTime - 5000) / 3000 * 66) + ", 100%, " + (dayTime - 5000) / 3000 * 50 + "%");
    } else if (dayTime >= 8000 && dayTime < 17000) {
        setBG("hsl(194,100%,50%)");
    } else if (dayTime >= 17000 && dayTime < 20000) {
        setBG("hsl(" + ((dayTime - 17000) / 3000 * 66 + 194) + ", 100%, " + (250 - (dayTime - 5000) / 3000 * 50) + "%");
    } else {
        setBG("black");
    }

    healthText.innerHTML = `${Math.round(player.health).toLocaleString()}/${Math.round(player.maxHealth).toLocaleString()} HP`;
    healthBar.style.width = `${player.health / player.maxHealth * 100}%`;
    document.getElementById("food").innerHTML = `${Math.abs(Math.round(player.foodPoints)).toLocaleString()}/${Math.abs(Math.round(player.maxFood)).toLocaleString()} FP`;
    document.getElementById("foodBar").style.width = `${player.foodPoints / player.maxFood * 100}%`;
    document.getElementById("drink").innerHTML = `${Math.abs(Math.round(player.drinkPoints)).toLocaleString()}/${Math.abs(Math.round(player.maxDrink)).toLocaleString()} DP`;
    document.getElementById("drinkBar").style.width = `${player.drinkPoints / player.maxDrink * 100}%`;

    const lastSaveRelative = String(localStorage.getItem("lastSave")) !== "null" ? (Date.now() - debug.lastSave) / 1000 : "never";
    document.getElementById("exportSave").innerText = `Export Save (Last saved ${secondsToOtherUnits(lastSaveRelative)} ago)`;
}, 1000);

// Auto build blocks underneath player if there is air there

setInterval(() => {
    const ore = getOreData((debug.oreLocations[player.pos.x][player.pos.y] || "space").id);

    if (ore.deadliness !== undefined) {
        player.health -= ore.deadliness;
    }
    if (ore.onTouch !== undefined) {
        ore.onTouch();
    }
}, 250);

function liquidUpdate() {
    for (let i = 0; i < debug.liquidLoopIds.length; i++) {
        clearInterval(debug.liquidLoopIds[i]);
    }
    liquids = [];
    debug.liquidLoopIds = [];
    for (let i = 0; i < ores.length; i++) {
        if (ores[i].types.includes("liquid")) {
            liquids.push(ores[i]);
        }
    }
    for (let i = 0; i < liquids.length; i++) {
        debug.liquidLoopIds.push(setInterval(() => {
            for (let j = 0; j < debug.liquidLocations.length; j++) {
                if (debug.liquidLocations[j].match(RegExp(`♸${liquids[i].id}♸`)) !== null) {
                    let x = Number(debug.liquidLocations[j].split(",")[0].split(" ")[0]),
                        y = Number(debug.liquidLocations[j].split(",")[1].split(" ")[0]),
                        newX = x,
                        newY = y;

                    // Adds arrays for the x pos if they don't exist to prevent errors

                    if (debug.oreLocations[x + 1] === undefined) {
                        debug.oreLocations[x + 1] = [];
                    }
                    if (debug.oreLocations[x - 1] === undefined) {
                        debug.oreLocations[x - 1] = [];
                    }
                    if (debug.oreLocations[x] === undefined) {
                        debug.oreLocations[x] = [];
                    }

                    function l() {
                        debug.oreLocations[x - 1][y] = {id: liquids[i].id};
                        newX--;
                        debug.oreLocations[x][y].id = "air";
                        debug.liquidLocations[j] = `${Number(debug.liquidLocations[j].split(",")[0]) - 1},${Number(debug.liquidLocations[j].split(",")[1].split(" ")[0])} ${debug.liquidLocations[j].split(" ")[1]}`;
                    }

                    function r() {
                        debug.oreLocations[x + 1][y] = {id: liquids[i].id};
                        newX++;
                        debug.oreLocations[x][y].id = "air";
                        debug.liquidLocations[j] = `${Number(debug.liquidLocations[j].split(",")[0]) + 1},${Number(debug.liquidLocations[j].split(",")[1].split(" ")[0])} ${debug.liquidLocations[j].split(" ")[1]}`;
                    }

                    if (debug.oreLocations[x][y - 1] && debug.oreLocations[x][y - 1].id === "air") {
                        // If block below is air, then move liquid down
                        debug.oreLocations[x][y - 1] = {id: liquids[i].id};
                        newY--;
                        debug.oreLocations[x][y].id = "air";
                        debug.liquidLocations[j] = `${Number(debug.liquidLocations[j].split(",")[0])},${Number(debug.liquidLocations[j].split(",")[1].split(" ")[0]) - 1} ${debug.liquidLocations[j].split(" ")[1]}`;
                    } else if (debug.oreLocations[x + 1][y] && debug.oreLocations[x - 1][y] && debug.oreLocations[x + 1][y].id === "air" && debug.oreLocations[x - 1][y].id === "air") {
                        // If both left and right are air, then pick a direction
                        if (Math.random() > 0.5) r(); else l();
                    } else if (debug.oreLocations[x + 1][y] && debug.oreLocations[x + 1][y].id === "air") {
                        // If right is air, move liquid right
                        r();
                    } else if (debug.oreLocations[x - 1][y] && debug.oreLocations[x - 1][y].id === "air") {
                        // If left is air, move liquid left
                        l();
                    }
                    debug.liquidLocations.splice(j, 1);
                    updateVision(newX, newY);
                    updateVision(x, y);
                }
            }
        }, liquids[i].viscosity));
    }
}

liquidUpdate();

// Liquid Physics

function oreAtMouse(e) {
    const a = Number(document.getElementById("map").style.zoom);
    const squareSize = 810 * a / settings.mapSize;
    const rect = e.target.getBoundingClientRect();
    const left = e.clientX - rect.left * a;
    const top = e.clientY - rect.top * a;
    let ore = "Unknown", x, y;
    if (debug.oreLocations[player.pos.x - settings.mapSize / 2 + 0.5 + Math.floor(left / squareSize)] !== undefined && debug.oreLocations[player.pos.x - settings.mapSize / 2 + 0.5 + Math.floor(left / squareSize)][-(-player.pos.y - settings.mapSize / 2 + 0.5 + Math.floor(top / squareSize))] !== undefined) {
        x = player.pos.x - settings.mapSize / 2 + 0.5 + Math.floor(left / squareSize);
        y = -(-player.pos.y - settings.mapSize / 2 + 0.5 + Math.floor(top / squareSize));
        ore = debug.oreLocations[x][y].id;
    }
    return {ore, x, y};
}

document.getElementById("map").onmousemove = e => {
    let ore = oreAtMouse(e).ore;
    mapTooltip(ore, ore !== "Unknown" && items[ore] !== undefined ? (settings.aiTooltips ? items[ore].aiTooltip : items[ore].desc) : "You haven't uncovered this block yet!");
};

document.querySelector("#map").addEventListener("mousedown", e => {
    let data = oreAtMouse(e);
    const {ore, x, y} = data;
    if (e.button === 2) {
        if (buildMode.enabled && inventory[inventory.map(g => g.id).indexOf(buildMode.id)].count.gten(1) && !isSolid(x, y) && !(player.pos.x === x && player.pos.y === y)) {
            debug.oreLocations[x][y].id = buildMode.id;
            addItem(buildMode.id, -1);
            updateVision(x, y);
        }
        if (getOreData(ore).onInteract) getOreData(ore).onInteract();
    }
    if (e.button === 0 && player.pickaxe.strength >= getOreData(ore).hardness && !isLiquid(x, y)) {
        addItem(ore, 1);
        debug.oreLocations[x][y].id = "air";
        updateVision(x, y);
    }
});

document.addEventListener("mousemove", e => {
    document.getElementById("mapTooltip").style.left = e.pageX + "px";
    document.getElementById("mapTooltip").style.top = e.pageY + "px";
});

window.addEventListener("beforeunload", e => {
    (e || window.event).returnValue = true;
});

document.onkeydown = e => {
    if (e.code === "KeyE") {
        if (isInventoryOpen) {
            closeInventory();
        } else {
            openInventory();
        }
    } else if (e.code === "KeyR") {
        document.getElementById("recipeCheatSheet").style.display = document.getElementById("recipeCheatSheet").style.display === "" ? "none" : "";
        document.getElementById("openRecipeCheatSheet").innerText = document.getElementById("openRecipeCheatSheet").innerText === "Open Recipe Cheat Sheet" ? "Close Recipe Cheat Sheet" : "Open Recipe Cheat Sheet";
    } else if (e.code === "KeyO") {
        document.getElementById("oreCheatSheet").style.display = document.getElementById("oreCheatSheet").style.display === "" ? "none" : "";
        document.getElementById("openOreCheatSheet").innerText = document.getElementById("openOreCheatSheet").innerText === "Open Ore Cheat Sheet" ? "Close Ore Cheat Sheet" : "Open Ore Cheat Sheet";
    } else if (e.code === "KeyW" || e.code === "ArrowUp") {
        move("u");
    } else if (e.code === "KeyS" || e.code === "ArrowDown") {
        move("d");
    } else if (e.code === "KeyA" || e.code === "ArrowLeft") {
        move("l");
    } else if (e.code === "KeyD" || e.code === "ArrowRight") {
        move("r");
    } else if (e.code === "KeyZ") {
        buildMode.enabled = !buildMode.enabled;
        buildText();
    }
    if (e.code.includes("Arrow")) e.preventDefault();
};

function buildText() {
    document.querySelector("#buildModeActive").innerHTML = buildMode.enabled ? `You are in build mode<br>Block: ${items[buildMode.id].name} x${simplify(inventory[inventory.map(g => g.id).indexOf(buildMode.id)].count)}` : "";
}

function mapTooltip(ore, desc) {
    if (desc === undefined) {
        desc = "No description yet";
    }
    let oreData = {types: []};
    if (items[ore] !== undefined) {
        oreData = getOreData(ore);
    }
    let output = "";
    output += `<p><b>${ore !== "Unknown" && items[ore] !== undefined && !oreData.types.includes("liquid") ? items[ore].name : oreData.types.includes("liquid") ? items[ore].name.slice(0, items[ore].name.length - 7) : ore}</b></p>`;
    if (debug.textures.item.includes(ore)) output += `<img alt="${ore}" src="textures/item/${ore}.png" width="64">`;
    output += `<p style="color: #ccc;"><i>${desc}</i></p>`;
    document.getElementById("mapTooltip").style.display = "";
    document.getElementById("mapTooltip").innerHTML = output;
}

// 1000 lines!! :)
// I should really split up my code
// This is impossible to navigate

setInterval(() => {
    debug.frames++;
}, 1);

setInterval(() => {
    document.getElementById("fps").innerText = `${debug.frames} FPS`;
    debug.frames = 0;
}, 1000);

updateCheatSheets();

function generateDesc() {
    for (const key in items) {
        const ore = getOreData(key);
        let oreDepthText = "";
        if (ore) {
            if (ore.maxY < -1000000) {
                oreDepthText = " that can be found extremely deep in the earth";
            } else if (ore.maxY < -100000) {
                oreDepthText = " that can be found very deep in the earth";
            } else if (ore.maxY < -10000) {
                oreDepthText = " that can be found deep in the earth";
            } else if (ore.maxY < -1000) {
                oreDepthText = " that can be found somewhat deep in the earth";
            } else if (ore.maxY < -100) {
                oreDepthText = " that can be found somewhat close to the surface";
            } else if (ore.maxY < 1) {
                oreDepthText = " that can be found below the surface";
            } else if (ore.minY < 10) {
                oreDepthText = " that can be found near the surface";
            } else if (ore.minY < 100) {
                oreDepthText = " that can be found in the sky";
            } else if (ore.minY < 1000) {
                oreDepthText = " that can be found high up in the sky";
            } else if (ore.minY < 10000) {
                oreDepthText = " that can be found very high up in the sky";
            } else if (ore.minY !== Infinity && ore.maxY !== Infinity) {
                oreDepthText = " that can be found in space";
            } else {
                oreDepthText = " that cannot be found anywhere in nature";
            }
        }
        let output = [];
        if (items[key].rarity !== undefined) {
            output[0] = `${items[key].name} is a ${items[key].rarity.toLowerCase()} item${oreDepthText}.`;
        } else {
            output[0] = `${items[key].name} is an item that does not have a specified rarity.`;
        }
        let recipeCount = 0;
        let craftableItems = [];
        for (let i = 0; i < recipes.length; i++) {
            for (let j = 0; j < recipes[i].ingredients.length; j++) {
                if (recipes[i].ingredients[j].id === key) {
                    recipeCount++;
                    craftableItems.push(items[recipes[i].output.id].name);
                    break;
                }
            }
        }
        if (recipeCount > 5) {
            output[1] = `It can be used to craft ${recipeCount} items, such as ${craftableItems[~~(Math.random() * craftableItems.length)]}.`;
        } else if (recipeCount > 2) {
            output[1] = `It can be used to craft ${recipeCount} items: ${craftableItems.join(", ")}.`;
        } else if (recipeCount === 2) {
            output[1] = `It can be used to craft ${craftableItems.join(" and ")}.`;
        } else if (recipeCount === 1) {
            output[1] = `It can be used to craft ${craftableItems[0]}.`;
        } else {
            output[1] = `It has no crafting purposes.`;
            // "You have no crafting purposes" -GooseterV 2022
        }

        recipeCount = 0;
        craftableItems = [];

        for (let i = 0; i < recipes.length; i++) {
            if (recipes[i].output.id === key) {
                recipeCount++;
                craftableItems.push(recipes[i].ingredients);
            }
        }

        let materials = [];

        if (craftableItems !== []) {
            for (let i = 0; i < craftableItems.length; i++) {
                materials[i] = [];
                for (let j = 0; j < craftableItems[i].length; j++) {
                    materials[i][j] = items[craftableItems[i][j].id].name;
                }
            }
        }

        if (recipeCount > 1) {
            output[2] = "It can also be crafted multiple ways.";
        } else if (recipeCount === 1) {
            output[2] = `It can also be crafted with ${materials[0].join(", ")}.`;
        } else {
            output[2] = "It cannot be crafted.";
        }

        if (items[key].types.length > 2) {
            output[3] = `It is a ${items[key].types.join(", a ")}.`;
        } else if (items[key].types.length > 0) {
            output[3] = `It is a ${camelCaseToRegular(items[key].types.join(" and a "))}.`;
        } else {
            output[3] = "It is not a special item.";
        }

        items[key].aiTooltip = output.join(" ");
    }
}

function runCommand(command) {
    let parts = command.split(" ");
    const commandsMessage = `js <code> (run raw JavaScript code)
give <item> [count] (Give items to player inventory)
set <x> <y> <block> (Set a block position to a certain block type)
die [deathMessage] (Kills the player)
food <points> (Set food points)
maxFood <points> (Set max food points)
drink <points> (Set drink points)
maxDrink <points> (Set max drink points)
clear (Clears inventory)
fill <x1> <y1> <x2> <y2> <block> (Fills an area with a specified block; x1 and y1 must be less than x2 and y2)
help (Shows this message)
    `;
    if (parts[0] === "js") {
        console.log(command.slice(3));
        eval(command.slice(3));
    } else if (parts[0] === "give") {
        addItem(parts[1], parts[2]);
    } else if (parts[0].match(/set|setBlock|blockSet/)) {
        parts[1] = ~~parts[1];
        parts[2] = ~~parts[2];
        if (debug.oreLocations[parts[1]] === undefined) {
            debug.oreLocations[parts[1]] = [];
        }
        debug.oreLocations[parts[1]][parts[2]] = {id: parts[3]};
    } else if (parts[0].match(/kill|die/)) {
        die(parts[1]);
    } else if (parts[0].match(/setFood|food|foodPoints|setFoodPoints/)) {
        player.foodPoints = Number(parts[1]);
    } else if (parts[0].match(/setMaxFood|maxFood|maxFoodPoints|setMaxFoodPoints/)) {
        player.maxFood = Number(parts[1]);
    } else if (parts[0].match(/setDrink|drink|drinkPoints|setDrinkPoints/)) {
        player.drinkPoints = Number(parts[1]);
    } else if (parts[0].match(/setMaxDrink|maxDrink|maxDrinkPoints|setMaxDrinkPoints/)) {
        player.maxDrink = Number(parts[1]);
    } else if (parts[0].match(/clear|clearInv|clearInventory/)) {
        inventory = [];
        updateInventory();
        updateRecipeBook();
    } else if (parts[0].match(/fill|fillBlocks/)) {
        for (let i = parts[1]; i <= parts[3]; i++) {
            for (let j = parts[2]; j <= parts[4]; j++) {
                runCommand(`set ${i} ${j} ${parts[5]}`);
            }
        }
    } else if (parts[0].match(/help|\?/)) {
        alert(commandsMessage);
    }
}

function resizeCanvas() {
    document.getElementById("map").style.zoom = `${(window.innerHeight < window.innerWidth ? window.innerHeight : window.innerWidth) / 900}`;
}