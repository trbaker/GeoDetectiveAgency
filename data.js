/* ============================================================
   GEO DETECTIVE AGENCY — content
   Teachers: this is the file to edit!
   - Add or change cases in the CASES array below.
   - Each case needs: a map target (lat/lon/zoom/radius in km + a
     "lookFor" observation prompt), 3 "sort" items, 6 questions
     (2 per lens), and 1 "ask" item with exactly one option good: true.
   - If you change how many cases/questions there are, adjust the
     badge targets at the bottom so they stay reachable.
   ============================================================ */

const LENSES = {
  where:   { key: "where",   label: "Where is it?",                short: "WHERE",         emoji: "📍" },
  why:     { key: "why",     label: "Why is it there?",            short: "WHY THERE",     emoji: "🔎" },
  matters: { key: "matters", label: "Why does it matter to me?",   short: "MATTERS TO ME", emoji: "🌍" },
};

const CASES = [
  {
    id: "nile",
    title: "The Case of the Green Ribbon",
    place: "The Nile River · Egypt",
    emoji: "🏜️",
    map: {
      lat: 25.7, lon: 32.6, zoom: 5, radius: 800,
      lookFor: "Zoom out a little on the satellite view: can you spot the skinny green ribbon crossing the tan desert, and its fan-shaped end (the delta) at the sea?",
    },
    intro:
      "From space, Egypt looks like a huge tan desert with one bright green ribbon running through it — and almost everyone in Egypt lives on that ribbon. Your job, detective: figure out where it is, why it's there, and why it matters to YOU.",
    sort: [
      { q: "What continent is Egypt on?", answer: "where" },
      { q: "Why is the land green only right next to the river?", answer: "why" },
      { q: "Could my T-shirt have started as a plant near the Nile?", answer: "matters" },
    ],
    questions: [
      {
        lens: "where",
        q: "The Nile River flows through Egypt on which continent?",
        options: ["Africa", "South America", "Europe", "Australia"],
        correct: 0,
        hint: "Egypt sits in the northeast corner of this continent, just southwest of Asia.",
        explain: "Egypt is in northeast Africa. The Nile flows north right through it, like a long green stripe on the map.",
      },
      {
        lens: "where",
        q: "The Nile flows north and empties into which body of water?",
        options: ["The Pacific Ocean", "The Mediterranean Sea", "Lake Michigan", "The Indian Ocean"],
        correct: 1,
        hint: "This sea sits between Africa and Europe.",
        explain: "The Nile flows north and fans out into the Mediterranean Sea, the sea between Africa and Europe.",
      },
      {
        lens: "why",
        q: "Why is the land right next to the Nile so good for farming?",
        options: [
          "The sand there is extra soft",
          "It rains a lot in Egypt",
          "River floods left behind rich, muddy soil",
          "Farmers painted it green",
        ],
        correct: 2,
        hint: "Egypt gets almost no rain. So what does the RIVER bring to the land?",
        explain: "For thousands of years, the Nile's floods spread rich mud (called silt) along its banks — perfect for growing crops in the middle of a desert.",
      },
      {
        lens: "why",
        q: "Egypt is mostly desert. Why do about 9 out of 10 Egyptians live close to the Nile?",
        options: [
          "It is the main source of fresh water",
          "It is the only shady spot",
          "Phones only work near rivers",
          "The beaches are nicer there",
        ],
        correct: 0,
        hint: "What do people, animals, and crops ALL need every single day?",
        explain: "In a desert, people settle where the water is. The Nile is Egypt's water lifeline for drinking, farming, and travel.",
      },
      {
        lens: "matters",
        q: "Egyptian cotton is grown with Nile water. Where might you meet it?",
        options: [
          "In your video games",
          "In sheets, towels, or T-shirts at your house",
          "In sidewalk cement",
          "In your school bus fuel",
        ],
        correct: 1,
        hint: "Check a clothing or bedding tag at home — some even say 'Egyptian cotton.'",
        explain: "Cotton grown along the Nile gets shipped around the world. A river in Africa can end up as the T-shirt on your back!",
      },
      {
        lens: "matters",
        q: "What Nile lesson helps explain lots of towns near YOU?",
        options: [
          "Rivers always flow north",
          "Deserts are the best places to live",
          "Farms do not need water",
          "Communities often grow up next to water",
        ],
        correct: 3,
        hint: "Think about why your town, or cities near you, sit where they do.",
        explain: "All over the world — maybe in your own town — people settle near rivers, lakes, and coasts for water, food, and easy travel.",
      },
    ],
    ask: {
      prompt: "You just landed in Cairo, Egypt. Which is the STRONGEST geographic question a detective could ask next?",
      options: [
        { text: "How does the Nile change where people build homes and farms?", good: true },
        { text: "What is the most popular ice cream flavor in Cairo?", good: false },
        { text: "Is the Nile nice?", good: false },
        { text: "Who is the fastest runner in Egypt?", good: false },
      ],
      why: "Strong geographic questions connect PEOPLE and PLACES — where things are, why they are there, and how they shape everyday life. 'Is it nice?' is too vague to investigate, and ice cream flavors don't depend on the river.",
    },
  },
  {
    id: "nola",
    title: "The Case of the City Below the Sea",
    place: "New Orleans · United States",
    emoji: "🎺",
    map: {
      lat: 29.95, lon: -90.07, zoom: 9, radius: 500,
      lookFor: "Look how the city squeezes between the winding river, the big lake above it, and the gulf below. Where is the water NOT?",
    },
    intro:
      "New Orleans sits where the mighty Mississippi River meets the Gulf of Mexico — and parts of the city are actually LOWER than the sea. Detective, find out where it is, why anyone built a city there, and how it touches your life.",
    sort: [
      { q: "Which state is New Orleans in?", answer: "where" },
      { q: "Why build a city at the mouth of a giant river?", answer: "why" },
      { q: "How could a storm in New Orleans change prices at my grocery store?", answer: "matters" },
    ],
    questions: [
      {
        lens: "where",
        q: "New Orleans is in which U.S. state?",
        options: ["Florida", "Texas", "Louisiana", "California"],
        correct: 2,
        hint: "It's the boot-shaped state at the very end of the Mississippi River.",
        explain: "New Orleans is in southern Louisiana, near where the Mississippi River spills into the sea.",
      },
      {
        lens: "where",
        q: "The Mississippi River ends by flowing into the…",
        options: ["Gulf of Mexico", "Pacific Ocean", "Great Lakes", "Arctic Ocean"],
        correct: 0,
        hint: "It's the warm body of water along the southern coast of the United States.",
        explain: "The Mississippi runs down the middle of the country and empties into the Gulf of Mexico, just past New Orleans.",
      },
      {
        lens: "why",
        q: "Why did people build New Orleans right where the river meets the sea?",
        options: [
          "Gold was discovered there",
          "Boats trading between the ocean and the river must pass that spot",
          "It never floods there",
          "The weather is never hot",
        ],
        correct: 1,
        hint: "Think like a delivery truck… made of boats. Where would everything have to pass through?",
        explain: "Whoever holds the river's mouth holds the doorway for trade. Goods moving between ocean ships and river boats all funnel through New Orleans.",
      },
      {
        lens: "why",
        q: "Why does New Orleans have to work so hard to stay dry?",
        options: [
          "Its water pipes are too big",
          "It sits on a tall mountain",
          "It only rains in New Orleans",
          "Much of the city is below sea level, squeezed between a river, a lake, and the gulf",
        ],
        correct: 3,
        hint: "Check its elevation: is the land above or below the sea around it?",
        explain: "Much of the city sits below sea level, so walls called levees and giant pumps work around the clock to keep the water out.",
      },
      {
        lens: "matters",
        q: "Corn and soybeans from the middle of the U.S. float down the Mississippi and ship out near New Orleans. If that port closed, what might happen where you live?",
        options: [
          "Some foods and goods could cost more or run low",
          "School would be canceled",
          "The sun would set earlier",
          "Nothing at all",
        ],
        correct: 0,
        hint: "If goods can't get OUT or IN, what happens to the stores that sell them?",
        explain: "Ports connect farms and factories to the world. When a big one slows down, prices and supplies can change in stores far, far away.",
      },
      {
        lens: "matters",
        q: "Jazz music was born in New Orleans, where people from Africa, Europe, and the Caribbean mixed. Where might you feel that today?",
        options: [
          "In your bicycle tires",
          "In music you hear — movie soundtracks, band class, pop songs",
          "In your math homework",
          "In the weather outside",
        ],
        correct: 1,
        hint: "Jazz didn't stay in one city — where does music travel now?",
        explain: "Because New Orleans was a meeting point of cultures, jazz was born there — and its sounds echo in the music you hear every day.",
      },
    ],
    ask: {
      prompt: "Pick the STRONGEST geographic question a detective could ask about New Orleans:",
      options: [
        { text: "Why did people choose to build a city on land that floods?", good: true },
        { text: "What color are the streetcars?", good: false },
        { text: "Is gumbo yummy?", good: false },
        { text: "How old is the mayor?", good: false },
      ],
      why: "The strongest question asks WHY people and a risky PLACE go together — that's geography! The others are about colors, taste, or one person, not about the place and its patterns.",
    },
  },
  {
    id: "japan",
    title: "The Case of the Wobbling Islands",
    place: "Japan · Asia-Pacific",
    emoji: "🗾",
    map: {
      lat: 36.5, lon: 138.0, zoom: 5, radius: 800,
      lookFor: "Trace the chain of islands. Switch views and notice how mountains fill the middle, leaving only thin flat edges along the coasts for cities.",
    },
    intro:
      "Japan is a chain of islands where the ground sometimes shakes, mountains smoke, and skyscrapers are built to sway like trees. Where is it? Why is it so shaky? And what does it have to do with your family's car or your video games?",
    sort: [
      { q: "What ocean surrounds Japan?", answer: "where" },
      { q: "Why does Japan have so many earthquakes?", answer: "why" },
      { q: "How do ideas from Japan end up in my house?", answer: "matters" },
    ],
    questions: [
      {
        lens: "where",
        q: "Japan is a group of islands in the…",
        options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        correct: 3,
        hint: "It's the biggest ocean on Earth, between Asia and the Americas.",
        explain: "Japan is a string of islands (an archipelago) in the western Pacific Ocean.",
      },
      {
        lens: "where",
        q: "Japan sits just east of which continent?",
        options: ["Asia", "Africa", "Europe", "South America"],
        correct: 0,
        hint: "It's the largest continent — home to China and Korea, Japan's close neighbors.",
        explain: "Japan lies off the east coast of Asia, across the sea from Korea and China.",
      },
      {
        lens: "why",
        q: "Why does Japan get so many earthquakes and volcanoes?",
        options: [
          "Trains shake the ground too much",
          "It sits where giant pieces of Earth's crust push against each other",
          "Whales bump into the islands",
          "Too many people jump at once",
        ],
        correct: 1,
        hint: "Earth's outer shell is cracked into huge, slowly moving pieces called plates.",
        explain: "Japan sits where several of Earth's plates grind together — part of the 'Ring of Fire' around the Pacific. That squeezing builds earthquakes and volcanoes.",
      },
      {
        lens: "why",
        q: "Japan is full of mountains with little flat farmland. Why is seafood such a big part of meals there?",
        options: [
          "It rains fish sometimes",
          "There are no cows anywhere in Asia",
          "The ocean is close to everyone, so fishing is easier than farming",
          "Fish are free in Japan",
        ],
        correct: 2,
        hint: "Look at what surrounds every single island.",
        explain: "No place in Japan is far from the sea, but flat farmland is scarce in the mountains — so the ocean became the pantry.",
      },
      {
        lens: "matters",
        q: "Engineers everywhere study Japan's bendable, sway-safe buildings. Why does that matter to you?",
        options: [
          "It changes your lunch menu",
          "It makes all buildings taller",
          "It doesn't matter outside Japan",
          "Safer buildings and bridges can be built in other shaky places — maybe near you",
        ],
        correct: 3,
        hint: "Do other parts of the world have earthquakes too?",
        explain: "Ideas travel! Earthquake tricks invented in Japan help protect schools, homes, and bridges in shaky places all over the world.",
      },
      {
        lens: "matters",
        q: "Many cars and video games are designed in Japan. What about its geography helped Japan trade them worldwide?",
        options: [
          "Being an island nation with big ports and ships",
          "Having the world's longest rivers",
          "Being attached to North America",
          "Having no ocean nearby",
        ],
        correct: 0,
        hint: "How does cargo cross an ocean?",
        explain: "As an island nation, Japan built great ports and ships. The same ocean that surrounds it became its highway to the world — and to your living room.",
      },
    ],
    ask: {
      prompt: "Pick the STRONGEST geographic question a detective could ask about Japan:",
      options: [
        { text: "How do Japan's mountains and coasts shape where its cities grow?", good: true },
        { text: "Who is the tallest kid in Tokyo?", good: false },
        { text: "Are trains cool?", good: false },
        { text: "How much does sushi cost?", good: false },
      ],
      why: "The strongest question connects the LAND (mountains, coasts) to PEOPLE (where cities grow). Questions about one kid, coolness, or one price don't investigate the place.",
    },
  },
  {
    id: "amazon",
    title: "The Case of the Breathing Forest",
    place: "The Amazon Rainforest · South America",
    emoji: "🦜",
    map: {
      lat: -3.5, lon: -62.0, zoom: 4, radius: 1200,
      lookFor: "That deep green carpet is the rainforest. Can you follow the giant river east until it pours into the Atlantic?",
    },
    intro:
      "The Amazon rainforest is so big and so green that it helps make its own weather — some people call it a giant set of lungs for the planet. Find out where it hides, why it grows there, and why your snack shelf cares.",
    sort: [
      { q: "Which continent holds most of the Amazon?", answer: "where" },
      { q: "Why is it so rainy and green there?", answer: "why" },
      { q: "Do any of my snacks start out in a rainforest?", answer: "matters" },
    ],
    questions: [
      {
        lens: "where",
        q: "Most of the Amazon rainforest is on which continent?",
        options: ["Africa", "South America", "Asia", "North America"],
        correct: 1,
        hint: "Most of it is inside the country of Brazil.",
        explain: "The Amazon covers a huge part of South America — most of it in Brazil, with pieces in eight other countries.",
      },
      {
        lens: "where",
        q: "The Amazon River, one of the longest on Earth, empties into the…",
        options: ["Pacific Ocean", "Mediterranean Sea", "Atlantic Ocean", "Gulf of Mexico"],
        correct: 2,
        hint: "The river flows east, all the way across the continent.",
        explain: "The Amazon River flows eastward across South America and pours into the Atlantic Ocean.",
      },
      {
        lens: "why",
        q: "Why is the Amazon so warm and rainy?",
        options: [
          "It sits near the equator, where strong sun makes rising, rainy air",
          "It is close to the North Pole",
          "Giant sprinklers water it",
          "Mountains block out all the sun",
        ],
        correct: 0,
        hint: "Find the equator on a globe — the Amazon hugs it.",
        explain: "Near the equator, the sun beats down hard all year. Hot, wet air rises, cools, and dumps rain — again and again. Perfect jungle weather!",
      },
      {
        lens: "why",
        q: "Why do millions of kinds of plants and animals live in the Amazon?",
        options: [
          "It is the quietest place on Earth",
          "Animals like the name 'Amazon'",
          "It has the best wifi",
          "Warm and wet all year means food and shelter never run out",
        ],
        correct: 3,
        hint: "What would living things want ALL year long?",
        explain: "With no cold winter and no dry-out, there's food, water, and shelter every single day — so life piles up in amazing variety.",
      },
      {
        lens: "matters",
        q: "Which treats come from plants that first grew in rainforests?",
        options: [
          "Ice cubes",
          "Chocolate and vanilla",
          "Salt crackers",
          "None — treats come from factories only",
        ],
        correct: 1,
        hint: "One grows as a bean pod on a tree, the other as an orchid flower.",
        explain: "Cacao (chocolate) and vanilla are rainforest plants — and many medicines started with rainforest plants too. Factories finish the job, but forests start it.",
      },
      {
        lens: "matters",
        q: "The Amazon's trees release moisture and store carbon that affect weather far away. Why should your hometown care?",
        options: [
          "The trees mow our lawns",
          "Trees don't affect air at all",
          "Forests far away help shape air and climate everywhere — including where you live",
          "It only matters in Brazil",
        ],
        correct: 2,
        hint: "Does air stay in one country, or move around the planet?",
        explain: "Air and weather don't stop at borders. A forest on one continent helps balance the climate for everyone on Earth.",
      },
    ],
    ask: {
      prompt: "Pick the STRONGEST geographic question a detective could ask about the Amazon:",
      options: [
        { text: "How would losing rainforest trees change life for people far away?", good: true },
        { text: "What is the funniest-looking monkey?", good: false },
        { text: "Is the forest green?", good: false },
        { text: "How do you spell 'Amazon'?", good: false },
      ],
      why: "The strongest question connects a PLACE (the forest) to PEOPLE everywhere, and it can be investigated with evidence. 'Is it green?' is too easy, and spelling isn't geography.",
    },
  },
  {
    id: "iceland",
    title: "The Case of the Fire-and-Ice Island",
    place: "Iceland · North Atlantic",
    emoji: "🌋",
    map: {
      lat: 64.9, lon: -18.6, zoom: 5, radius: 600,
      lookFor: "An island all alone in the cold North Atlantic. Spot the white glaciers sitting on top of the dark volcanic land.",
    },
    intro:
      "Iceland has glaciers on top and melted rock below. People there heat their homes and swimming pools with the Earth itself! Where is this island? Why is it so steamy? And what could it teach your town?",
    sort: [
      { q: "Which two continents is Iceland between?", answer: "where" },
      { q: "Why does Iceland have volcanoes AND glaciers?", answer: "why" },
      { q: "Could my town use Earth-heat for energy too?", answer: "matters" },
    ],
    questions: [
      {
        lens: "where",
        q: "Iceland is an island in the…",
        options: ["North Atlantic Ocean", "South Pacific Ocean", "Indian Ocean", "Caribbean Sea"],
        correct: 0,
        hint: "It sits between Greenland and Europe, near the Arctic Circle.",
        explain: "Iceland floats in the North Atlantic, just below the Arctic Circle — between Greenland and Norway.",
      },
      {
        lens: "where",
        q: "Iceland sits between which two continents?",
        options: ["Africa and Asia", "North America and Europe", "Asia and Australia", "South America and Africa"],
        correct: 1,
        hint: "One is to its west across the sea; the other is to its southeast.",
        explain: "Iceland lies between North America and Europe — in fact, the boundary between their tectonic plates runs right through it!",
      },
      {
        lens: "why",
        q: "Why does Iceland have so many volcanoes and hot springs?",
        options: [
          "The sun is closer there",
          "Its rocks are electric",
          "It sits on a crack where two of Earth's plates pull apart, letting heat rise",
          "Dragons live underground",
        ],
        correct: 2,
        hint: "Deep under the Atlantic there's a giant seam in Earth's crust — and Iceland pokes up right on it.",
        explain: "Iceland sits on the Mid-Atlantic Ridge, where two plates slowly pull apart. Melted rock and heat rise through the gap, making volcanoes and hot springs.",
      },
      {
        lens: "why",
        q: "Why can Icelanders heat their homes and pools so cheaply?",
        options: [
          "They skip winter",
          "The sea around Iceland is warm",
          "Firewood is free there",
          "They pipe up hot water warmed by Earth's inner heat (geothermal energy)",
        ],
        correct: 3,
        hint: "The heat under the island isn't just danger — it's also a resource.",
        explain: "Iceland drills into its hot underground water and pipes the heat into homes, pools, and greenhouses. The volcano danger is also a gift!",
      },
      {
        lens: "matters",
        q: "In 2010, ash from an Icelandic volcano stopped airplanes across Europe for days. What does that show?",
        options: [
          "Volcanoes only matter locally",
          "Events in one place can ripple around our connected world",
          "Ash makes planes fly faster",
          "Airplanes can fly through anything",
        ],
        correct: 1,
        hint: "Travelers, packages, even fruit shipments were stuck. Who felt it?",
        explain: "One volcano on one island grounded flights, travelers, and packages across the world. Places are connected — that's a core idea of geography.",
      },
      {
        lens: "matters",
        q: "What Iceland idea could help YOUR community?",
        options: [
          "Building homes only on volcanoes",
          "Importing glaciers for ice",
          "Using clean energy from nature — like Earth-heat, wind, or sunshine",
          "Skipping winter coats",
        ],
        correct: 2,
        hint: "Iceland uses what its land offers. What does YOUR area's land, wind, or sky offer?",
        explain: "Every place has natural gifts. Iceland uses Earth-heat; your community might use sun, wind, or water. Geography helps us spot them.",
      },
    ],
    ask: {
      prompt: "Pick the STRONGEST geographic question a detective could ask about Iceland:",
      options: [
        { text: "How does living on a plate boundary shape how Icelanders build and power their homes?", good: true },
        { text: "What's the coldest anyone has ever felt there?", good: false },
        { text: "Are puffins cute?", good: false },
        { text: "How long is the word for volcano in Icelandic?", good: false },
      ],
      why: "The strongest question ties the LAND (a plate boundary) to how PEOPLE live (building and energy). Cuteness and word lengths are fun, but they can't be investigated with maps and evidence.",
    },
  },
];

/* ---------------- BADGES ----------------
   check(save) and progress(save) use helper functions defined in app.js
   (solvedCount, recoveredCount). They run at play time, so the order
   of the script files doesn't matter. Targets assume 5 cases:
   15 sort items, 10 questions per lens, 5 ask items. */

const BADGES = [
  {
    id: "sorter", emoji: "🧭", name: "Question Sorter",
    concept: "Recognizing the 3 kinds of geographic questions",
    desc: "Sort 12 questions into Where / Why There / Matters on the first try.",
    check: (s) => s.sortFirst >= 12,
    progress: (s) => [s.sortFirst, 12],
  },
  {
    id: "locator", emoji: "📍", name: "Location Locator",
    concept: "Where is it? — location & maps",
    desc: "Solve 8 WHERE questions (first tries and fixed cold cases both count).",
    check: (s) => solvedCount(s, "where") >= 8,
    progress: (s) => [solvedCount(s, "where"), 8],
  },
  {
    id: "sleuth", emoji: "🔎", name: "Pattern Sleuth",
    concept: "Why is it there? — reasons & patterns",
    desc: "Solve 8 WHY THERE questions.",
    check: (s) => solvedCount(s, "why") >= 8,
    progress: (s) => [solvedCount(s, "why"), 8],
  },
  {
    id: "champ", emoji: "🌍", name: "Connection Champ",
    concept: "Why it matters — connecting places to my life",
    desc: "Solve 8 MATTERS TO ME questions.",
    check: (s) => solvedCount(s, "matters") >= 8,
    progress: (s) => [solvedCount(s, "matters"), 8],
  },
  {
    id: "navigator", emoji: "🗺️", name: "World Navigator",
    concept: "Pinpointing places on a world map",
    desc: "Pin 4 case places inside the target zone on the world map.",
    check: (s) => pinCount(s) >= 4,
    progress: (s) => [pinCount(s), 4],
  },
  {
    id: "asker", emoji: "❓", name: "Question Master",
    concept: "Asking strong geographic questions",
    desc: "Pick the strongest question in 4 cases on the first try.",
    check: (s) => s.askFirst >= 4,
    progress: (s) => [s.askFirst, 4],
  },
  {
    id: "comeback", emoji: "💪", name: "Comeback Detective",
    concept: "Self-improvement — learning from mistakes",
    desc: "Turn 4 wrong answers into right ones (second tries or Cold Case wins).",
    check: (s) => recoveredCount(s) >= 4,
    progress: (s) => [recoveredCount(s), 4],
  },
  {
    id: "master", emoji: "🌟", name: "Master Detective",
    concept: "All concepts attained",
    desc: "Earn every badge above and close all 5 cases.",
    check: (s) =>
      ["sorter", "locator", "sleuth", "champ", "asker", "comeback", "navigator"].every((b) => s.badges[b]) &&
      CASES.every((c) => s.stamps[c.id]),
    progress: (s) => [
      ["sorter", "locator", "sleuth", "champ", "asker", "comeback", "navigator"].filter((b) => s.badges[b]).length +
        CASES.filter((c) => s.stamps[c.id]).length,
      12,
    ],
  },
];
