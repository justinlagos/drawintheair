/**
 * Expanded Word Search Vocabulary - 400+ Words
 * 
 * Categorized by difficulty (easy, medium, hard) for ages 3-7
 * Includes word tracking to avoid repetition
 */

export interface WordCategory {
    name: string;
    difficulty: 1 | 2 | 3;  // 1 = easy (3-4 letters), 2 = medium (4-5), 3 = hard (5-7)
    words: string[];
}

export const WORD_CATEGORIES: WordCategory[] = [
    // ===========================================
    // DIFFICULTY 1: Easy (3-4 letter words)
    // ===========================================
    {
        name: 'Animals (Easy)',
        difficulty: 1,
        words: [
            'CAT', 'DOG', 'PIG', 'COW', 'HEN', 'BEE', 'ANT', 'BAT', 'RAT', 'OWL',
            'FOX', 'ELK', 'EMU', 'YAK', 'RAM', 'EWE', 'CUB', 'PUP', 'KIT', 'FRY',
            'BUG', 'FLY', 'EEL', 'LOB', 'CALF', 'FOAL', 'KID', 'HOG', 'COLT'
        ]
    },
    {
        name: 'Colors (Easy)',
        difficulty: 1,
        words: [
            'RED', 'BLUE', 'PINK', 'GOLD', 'CYAN', 'LIME', 'NAVY', 'PLUM', 'ROSE', 'TEAL',
            'GRAY', 'MINT', 'AQUA', 'PEACH', 'IVORY', 'BEIGE'
        ]
    },
    {
        name: 'Food (Easy)',
        difficulty: 1,
        words: [
            'EGG', 'HAM', 'JAM', 'PIE', 'BUN', 'NUT', 'PEA', 'FIG', 'YAM', 'OAT',
            'CAKE', 'RICE', 'MILK', 'FISH', 'CORN', 'BEAN', 'MEAT', 'SOUP', 'TUNA', 'PLUM',
            'TEA', 'RYE', 'SOY', 'ICE'
        ]
    },
    {
        name: 'Body (Easy)',
        difficulty: 1,
        words: [
            'ARM', 'LEG', 'EAR', 'EYE', 'TOE', 'LIP', 'JAW', 'RIB', 'GUM', 'HIP',
            'HAND', 'FOOT', 'NOSE', 'CHIN', 'NECK', 'KNEE', 'BACK', 'HEAD', 'FACE', 'HAIR'
        ]
    },
    {
        name: 'Nature (Easy)',
        difficulty: 1,
        words: [
            'SUN', 'SKY', 'SEA', 'MUD', 'DEW', 'FOG', 'ICE', 'BAY', 'DAM', 'LOG',
            'RAIN', 'SNOW', 'WIND', 'LEAF', 'TREE', 'ROCK', 'SAND', 'POND', 'HILL', 'LAKE',
            'BUD', 'HAY', 'IVY', 'OAK', 'ELM', 'FIR'
        ]
    },
    {
        name: 'Home (Easy)',
        difficulty: 1,
        words: [
            'BED', 'CUP', 'PAN', 'MOP', 'RUG', 'JAR', 'BOX', 'BAG', 'KEY', 'PEN',
            'DOOR', 'LAMP', 'SOFA', 'DESK', 'WALL', 'ROOF', 'SINK', 'BATH', 'OVEN', 'VASE'
        ]
    },
    {
        name: 'Toys (Easy)',
        difficulty: 1,
        words: [
            'TOY', 'CAR', 'TOP', 'BAT', 'NET', 'BAG', 'BOW', 'GUN', 'VAN', 'BUS',
            'BALL', 'DOLL', 'KITE', 'DRUM', 'GAME', 'LEGO', 'BIKE', 'SLED', 'BOAT', 'TRAIN',
            'KIT', 'JET', 'DEN'
        ]
    },
    {
        name: 'Actions (Easy)',
        difficulty: 1,
        words: [
            'RUN', 'HOP', 'SIT', 'EAT', 'CRY', 'HUG', 'CUT', 'DIG', 'FLY', 'MIX',
            'JUMP', 'WALK', 'SWIM', 'PLAY', 'SING', 'READ', 'DRAW', 'WAVE', 'CLAP', 'KICK'
        ]
    },

    // ===========================================
    // DIFFICULTY 2: Medium (4-5 letter words)
    // ===========================================
    {
        name: 'Animals (Medium)',
        difficulty: 2,
        words: [
            'BEAR', 'LION', 'WOLF', 'DEER', 'FROG', 'DUCK', 'GOAT', 'FISH', 'BIRD', 'SEAL',
            'TIGER', 'ZEBRA', 'HORSE', 'SHEEP', 'SNAKE', 'WHALE', 'SHARK', 'BUNNY', 'MOUSE', 'PANDA',
            'CAMEL', 'HIPPO', 'KOALA', 'LLAMA', 'OTTER', 'SKUNK', 'MOOSE', 'EAGLE', 'ROBIN', 'RAVEN'
        ]
    },
    {
        name: 'Colors (Medium)',
        difficulty: 2,
        words: [
            'GREEN', 'BLACK', 'WHITE', 'BROWN', 'CORAL', 'IVORY', 'KHAKI', 'LEMON', 'MAUVE', 'PEACH',
            'AMBER', 'AZURE', 'BEIGE', 'CREAM', 'EBONY', 'GRAPE', 'LILAC', 'OLIVE', 'SILVER', 'VIOLET'
        ]
    },
    {
        name: 'Food (Medium)',
        difficulty: 2,
        words: [
            'APPLE', 'BREAD', 'CANDY', 'DONUT', 'GRAPE', 'JUICE', 'LEMON', 'MANGO', 'MELON', 'OLIVE',
            'PASTA', 'PEACH', 'PIZZA', 'SALAD', 'TOAST', 'BACON', 'BAGEL', 'BERRY', 'CHIPS', 'CREAM',
            'CURRY', 'HONEY', 'JELLY', 'SYRUP', 'WAFER', 'COCOA', 'FUDGE', 'GRAVY', 'KEBAB', 'NACHO'
        ]
    },
    {
        name: 'Places (Medium)',
        difficulty: 2,
        words: [
            'BEACH', 'BROOK', 'CABIN', 'FIELD', 'HOUSE', 'OCEAN', 'TOWER', 'TRAIL', 'WOODS', 'ALLEY',
            'ARENA', 'ATTIC', 'BOWER', 'CANAL', 'CLIFF', 'DEPOT', 'DISCO', 'DOCKS', 'FALLS', 'GLADE',
            'HAVEN', 'LODGE', 'MANOR', 'MARSH', 'OASIS', 'PATIO', 'PLAZA', 'SHORE', 'SWAMP', 'VILLA'
        ]
    },
    {
        name: 'Weather (Medium)',
        difficulty: 2,
        words: [
            'SUNNY', 'RAINY', 'WINDY', 'STORM', 'CLOUD', 'FROST', 'MISTY', 'SLEET', 'FOGGY', 'HUMID',
            'CLEAR', 'DUSTY', 'HAZY', 'ICING', 'MUGGY', 'SNOWY', 'BALMY', 'BLOWY', 'BRISK', 'CHILLY'
        ]
    },
    {
        name: 'Family (Medium)',
        difficulty: 2,
        words: [
            'MOMMY', 'DADDY', 'BABY', 'AUNTY', 'UNCLE', 'NANNY', 'CHILD', 'TWINS', 'FOLKS', 'ELDER',
            'BRIDE', 'GROOM', 'NIECE', 'PUPIL', 'YOUTH', 'ADULT', 'GUEST', 'HUMAN', 'NEIGHBOR', 'PARENT'
        ]
    },
    {
        name: 'School (Medium)',
        difficulty: 2,
        words: [
            'BOOK', 'DESK', 'CHALK', 'CLASS', 'CRAYON', 'ERASER', 'GLUE', 'LUNCH', 'PAPER', 'PENCIL',
            'RULER', 'STUDY', 'TEACH', 'WRITE', 'LEARN', 'MUSIC', 'SPORT', 'BREAK', 'CLOCK', 'BOARD'
        ]
    },
    {
        name: 'Transportation (Medium)',
        difficulty: 2,
        words: [
            'PLANE', 'TRAIN', 'TRUCK', 'CANOE', 'FERRY', 'KAYAK', 'MOTOR', 'PEDAL', 'RIDER', 'ROUTE',
            'SPEED', 'WHEEL', 'YACHT', 'CARGO', 'FLEET', 'JEEP', 'LORRY', 'MOPED', 'SCOOT', 'WAGON'
        ]
    },

    // ===========================================
    // DIFFICULTY 3: Hard (5-7 letter words)
    // ===========================================
    {
        name: 'Animals (Hard)',
        difficulty: 3,
        words: [
            'MONKEY', 'RABBIT', 'TURTLE', 'PARROT', 'DRAGON', 'GERBIL', 'DONKEY', 'KITTEN', 'LIZARD', 'BEETLE',
            'BUFFALO', 'CHICKEN', 'DOLPHIN', 'GORILLA', 'HAMSTER', 'LEOPARD', 'PENGUIN', 'RACCOON', 'SQUIRREL', 'WALRUS',
            'ANTELOPE', 'ARMADILLO', 'BABOON', 'BADGER', 'BEAVER', 'CHEETAH', 'COYOTE', 'FALCON', 'GAZELLE', 'GIRAFFE'
        ]
    },
    {
        name: 'Nature (Hard)',
        difficulty: 3,
        words: [
            'FLOWER', 'FOREST', 'GARDEN', 'ISLAND', 'JUNGLE', 'MEADOW', 'MOUNTAIN', 'RAINBOW', 'RIVER', 'SUNSET',
            'TORNADO', 'VOLCANO', 'WATERFALL', 'BLOSSOM', 'CANYON', 'CAVERN', 'COASTAL', 'DESERT', 'GLACIER', 'HARBOUR',
            'LAGOON', 'ORCHARD', 'PASTURE', 'PRAIRIE', 'SAVANNA', 'STREAM', 'SUMMIT', 'TUNDRA', 'VALLEY', 'WETLAND'
        ]
    },
    {
        name: 'Feelings (Hard)',
        difficulty: 3,
        words: [
            'HAPPY', 'BRAVE', 'CLEVER', 'GENTLE', 'HONEST', 'JOYFUL', 'KINDLY', 'LOVING', 'PEACEFUL', 'POLITE',
            'PROUD', 'SCARED', 'SLEEPY', 'STRONG', 'WONDER', 'AMAZED', 'CARING', 'CHEERFUL', 'CURIOUS', 'EXCITED',
            'FRIENDLY', 'GRATEFUL', 'HELPFUL', 'HOPEFUL', 'PATIENT', 'PLAYFUL', 'RELAXED', 'SERIOUS', 'THANKFUL', 'WORRIED'
        ]
    },
    {
        name: 'Occupations (Hard)',
        difficulty: 3,
        words: [
            'ARTIST', 'BAKER', 'DOCTOR', 'DRIVER', 'FARMER', 'NURSE', 'PILOT', 'SINGER', 'TEACHER', 'WRITER',
            'BUILDER', 'CAPTAIN', 'CHEF', 'DANCER', 'DENTIST', 'FIREMAN', 'LAWYER', 'PAINTER', 'PLUMBER', 'POLICE',
            'POSTMAN', 'SAILOR', 'SOLDIER', 'TAILOR', 'WAITER', 'BARBER', 'CASHIER', 'CLEANER', 'FLORIST', 'GARDENER'
        ]
    },
    {
        name: 'Sports (Hard)',
        difficulty: 3,
        words: [
            'SOCCER', 'TENNIS', 'HOCKEY', 'BOXING', 'CYCLING', 'DIVING', 'FENCING', 'GOLF', 'KARATE', 'RACING',
            'ROWING', 'RUNNING', 'SKATING', 'SKIING', 'SURFING', 'ARCHERY', 'BASEBALL', 'BASKETBALL', 'CLIMBING', 'CRICKET',
            'FISHING', 'FOOTBALL', 'HANDBALL', 'MARATHON', 'NETBALL', 'SAILING', 'SOFTBALL', 'SWIMMING', 'VOLLEYBALL', 'WRESTLING'
        ]
    },
    {
        name: 'Fantasy (Hard)',
        difficulty: 3,
        words: [
            'CASTLE', 'DRAGON', 'FAIRY', 'GIANT', 'KNIGHT', 'MAGIC', 'PRINCE', 'QUEEN', 'SPELL', 'WITCH',
            'WIZARD', 'CROWN', 'DWARF', 'GOBLIN', 'LEGEND', 'MERMAID', 'MONSTER', 'PHOENIX', 'PIRATE', 'PRINCESS',
            'SCEPTER', 'THRONE', 'TREASURE', 'TROLL', 'UNICORN', 'VAMPIRE', 'WARRIOR', 'CRYSTAL', 'ENCHANT', 'KINGDOM'
        ]
    }
];

// ===========================================
// WORD SELECTION FUNCTIONS
// ===========================================

// Track recently used words to avoid repetition
let recentlyUsedWords: Set<string> = new Set();
const MAX_RECENT_WORDS = 50;

export const getRandomWords = (
    count: number,
    difficulty?: 1 | 2 | 3,
    category?: string
): string[] => {
    let availableWords: string[] = [];
    
    WORD_CATEGORIES.forEach(cat => {
        if (difficulty && cat.difficulty !== difficulty) return;
        if (category && cat.name !== category) return;
        availableWords = availableWords.concat(cat.words);
    });
    
    // Filter out recently used words
    availableWords = availableWords.filter(word => !recentlyUsedWords.has(word));
    
    // If we've used most words, reset the recent list
    if (availableWords.length < count) {
        recentlyUsedWords.clear();
        availableWords = [];
        WORD_CATEGORIES.forEach(cat => {
            if (difficulty && cat.difficulty !== difficulty) return;
            if (category && cat.name !== category) return;
            availableWords = availableWords.concat(cat.words);
        });
    }
    
    // Shuffle and select
    const shuffled = availableWords.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    
    // Track selected words
    selected.forEach(word => {
        recentlyUsedWords.add(word);
        if (recentlyUsedWords.size > MAX_RECENT_WORDS) {
            // Remove oldest entries
            const iterator = recentlyUsedWords.values();
            const firstValue = iterator.next().value;
            if (firstValue !== undefined) {
                recentlyUsedWords.delete(firstValue);
            }
        }
    });
    
    return selected;
};

export const getWordsByDifficulty = (difficulty: 1 | 2 | 3): string[] => {
    return WORD_CATEGORIES
        .filter(cat => cat.difficulty === difficulty)
        .flatMap(cat => cat.words);
};

export const getAllCategories = (): string[] => {
    return [...new Set(WORD_CATEGORIES.map(cat => cat.name))];
};

export const getTotalWordCount = (): number => {
    return WORD_CATEGORIES.reduce((total, cat) => total + cat.words.length, 0);
};

// Export word counts for display
export const WORD_STATS = {
    easy: getWordsByDifficulty(1).length,
    medium: getWordsByDifficulty(2).length,
    hard: getWordsByDifficulty(3).length,
    total: getTotalWordCount()
};
