import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawInput = {
"quizzes": [
{
"question": "Which planet do we live on?",
"options": ["Mars", "Earth", "Venus", "Jupiter"],
"correctAnswer": "Earth",
"explanation": "Earth is the third planet from the Sun and the only planet currently known to support life.",
"category": "Geography",
"difficulty": "Easy",
"xp": 10
},
{
"question": "How many days are in a week?",
"options": ["5", "6", "7", "8"],
"correctAnswer": "7",
"explanation": "A week has seven days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday.",
"category": "General",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the largest ocean on Earth?",
"options": ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
"correctAnswer": "Pacific Ocean",
"explanation": "The Pacific Ocean is the largest and deepest ocean on Earth, covering more area than any other ocean.",
"category": "Geography",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the chemical symbol for water?",
"options": ["CO2", "O2", "H2O", "NaCl"],
"correctAnswer": "H2O",
"explanation": "Water is made of two hydrogen atoms and one oxygen atom, giving it the chemical formula H2O.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which star is closest to Earth?",
"options": ["Sirius", "The Sun", "Polaris", "Betelgeuse"],
"correctAnswer": "The Sun",
"explanation": "The Sun is our nearest star, located about 150 million kilometers from Earth on average.",
"category": "Space",
"difficulty": "Easy",
"xp": 10
},
{
"question": "How many continents are commonly recognized on Earth?",
"options": ["5", "6", "7", "8"],
"correctAnswer": "7",
"explanation": "The commonly taught model recognizes seven continents: Africa, Antarctica, Asia, Europe, North America, South America, and Australia.",
"category": "Geography",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which organ pumps blood around the human body?",
"options": ["Brain", "Heart", "Liver", "Lung"],
"correctAnswer": "Heart",
"explanation": "The heart is a muscular organ that pumps blood through the body's circulatory system.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is 10 × 5?",
"options": ["15", "40", "50", "55"],
"correctAnswer": "50",
"explanation": "Multiplying 10 by 5 gives 50. Multiplication represents repeated addition.",
"category": "Math",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which language has the most native speakers worldwide?",
"options": ["English", "Spanish", "Mandarin Chinese", "French"],
"correctAnswer": "Mandarin Chinese",
"explanation": "Mandarin Chinese has more native speakers than any other individual language.",
"category": "General",
"difficulty": "Medium",
"xp": 10
},
{
"question": "What force pulls objects toward Earth?",
"options": ["Magnetism", "Gravity", "Friction", "Electricity"],
"correctAnswer": "Gravity",
"explanation": "Gravity is the force that attracts objects with mass toward one another, including objects toward Earth's center.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which country is famous for the Great Wall?",
"options": ["India", "China", "Japan", "Egypt"],
"correctAnswer": "China",
"explanation": "The Great Wall is a historic system of walls and fortifications built across parts of China.",
"category": "History",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What does CPU stand for?",
"options": ["Central Processing Unit", "Computer Power Unit", "Central Program Utility", "Computer Processing User"],
"correctAnswer": "Central Processing Unit",
"explanation": "The CPU is the main general-purpose processor that executes instructions and performs calculations in a computer.",
"category": "Technology",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which gas do humans need to breathe to survive?",
"options": ["Carbon dioxide", "Oxygen", "Helium", "Hydrogen"],
"correctAnswer": "Oxygen",
"explanation": "Humans need oxygen for cellular respiration, a process that helps cells release energy from nutrients.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which planet is known as the Red Planet?",
"options": ["Venus", "Mars", "Saturn", "Mercury"],
"correctAnswer": "Mars",
"explanation": "Mars appears reddish because iron-bearing minerals in its surface materials have oxidized, producing a rusty color.",
"category": "Space",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the capital city of France?",
"options": ["Rome", "Madrid", "Paris", "Berlin"],
"correctAnswer": "Paris",
"explanation": "Paris is the capital and largest city of France and is located along the River Seine.",
"category": "Geography",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which device is commonly used to move a pointer on a computer screen?",
"options": ["Mouse", "Printer", "Speaker", "Scanner"],
"correctAnswer": "Mouse",
"explanation": "A computer mouse is a pointing device used to move and control a cursor on a screen.",
"category": "Technology",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the freezing point of water at standard atmospheric pressure?",
"options": ["0°C", "10°C", "50°C", "100°C"],
"correctAnswer": "0°C",
"explanation": "Pure water freezes at 0 degrees Celsius at standard atmospheric pressure.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which animal is the largest living animal?",
"options": ["Elephant", "Blue whale", "Giraffe", "Great white shark"],
"correctAnswer": "Blue whale",
"explanation": "The blue whale is the largest known living animal, with some individuals reaching around 30 meters in length.",
"category": "Nature",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the main language used to structure content on web pages?",
"options": ["HTML", "MP3", "JPEG", "PDF"],
"correctAnswer": "HTML",
"explanation": "HTML, or HyperText Markup Language, provides the basic structure and meaning of content on web pages.",
"category": "Technology",
"difficulty": "Easy",
"xp": 10
},
{
"question": "How many sides does a triangle have?",
"options": ["2", "3", "4", "5"],
"correctAnswer": "3",
"explanation": "A triangle is a polygon with exactly three sides and three angles.",
"category": "Math",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which planet is closest to the Sun?",
"options": ["Venus", "Earth", "Mercury", "Mars"],
"correctAnswer": "Mercury",
"explanation": "Mercury is the innermost planet in the Solar System and has the shortest orbital period around the Sun.",
"category": "Space",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What do bees collect from flowers to help make honey?",
"options": ["Nectar", "Sand", "Salt", "Tree bark"],
"correctAnswer": "Nectar",
"explanation": "Honey bees collect nectar from flowers and process it into honey, which serves as a food source for the colony.",
"category": "Nature",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which sense organ is responsible for hearing?",
"options": ["Eye", "Ear", "Nose", "Tongue"],
"correctAnswer": "Ear",
"explanation": "The ears detect sound vibrations and help the brain interpret them as sounds.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is 100 divided by 10?",
"options": ["5", "10", "20", "100"],
"correctAnswer": "10",
"explanation": "Dividing 100 into 10 equal groups gives 10 in each group.",
"category": "Math",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which instrument is used to measure temperature?",
"options": ["Barometer", "Thermometer", "Compass", "Ruler"],
"correctAnswer": "Thermometer",
"explanation": "A thermometer measures temperature, commonly using units such as degrees Celsius or Fahrenheit.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which ocean lies between Africa and Australia?",
"options": ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"],
"correctAnswer": "Indian Ocean",
"explanation": "The Indian Ocean lies between Africa, Asia, Australia, and the Southern Ocean.",
"category": "Geography",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the largest organ of the human body?",
"options": ["Heart", "Brain", "Skin", "Liver"],
"correctAnswer": "Skin",
"explanation": "The skin is the body's largest organ by surface area and forms a protective barrier around the body.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which number is an even number?",
"options": ["7", "11", "14", "19"],
"correctAnswer": "14",
"explanation": "An even number can be divided by 2 without a remainder. Fourteen divided by 2 equals 7.",
"category": "Math",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which bird is the largest living bird?",
"options": ["Eagle", "Ostrich", "Penguin", "Albatross"],
"correctAnswer": "Ostrich",
"explanation": "The ostrich is the largest living bird by height and weight. It is also the fastest-running bird.",
"category": "Nature",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What does Wi-Fi allow devices to do?",
"options": ["Connect wirelessly to a network", "Print without ink", "Charge without electricity", "Increase screen size"],
"correctAnswer": "Connect wirelessly to a network",
"explanation": "Wi-Fi is a wireless networking technology that allows compatible devices to connect to networks without a physical network cable.",
"category": "Technology",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which star is at the center of our Solar System?",
"options": ["Polaris", "Sirius", "The Sun", "Vega"],
"correctAnswer": "The Sun",
"explanation": "The Sun is the star at the center of our Solar System and provides most of the energy that drives Earth's climate and ecosystems.",
"category": "Space",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which part of a plant usually absorbs water from the soil?",
"options": ["Flower", "Root", "Fruit", "Leaf"],
"correctAnswer": "Root",
"explanation": "Roots absorb water and minerals from the soil and help anchor the plant in place.",
"category": "Nature",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the capital of Japan?",
"options": ["Kyoto", "Osaka", "Tokyo", "Hiroshima"],
"correctAnswer": "Tokyo",
"explanation": "Tokyo is the capital of Japan and one of the world's largest metropolitan areas.",
"category": "Geography",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which material is attracted strongly to a magnet?",
"options": ["Iron", "Glass", "Plastic", "Wood"],
"correctAnswer": "Iron",
"explanation": "Iron is a ferromagnetic material, meaning it is strongly attracted to magnetic fields.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the opposite of the word 'ancient'?",
"options": ["Old", "Modern", "Historic", "Traditional"],
"correctAnswer": "Modern",
"explanation": "Ancient refers to something very old, while modern generally describes something relating to the present or recent times.",
"category": "English",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which planet is famous for its large and visible ring system?",
"options": ["Mars", "Saturn", "Venus", "Mercury"],
"correctAnswer": "Saturn",
"explanation": "Saturn has a spectacular ring system made mostly of countless particles of ice and rock.",
"category": "Space",
"difficulty": "Easy",
"xp": 10
},
{
"question": "How many hours are in one day?",
"options": ["12", "18", "24", "48"],
"correctAnswer": "24",
"explanation": "A standard Earth day is divided into 24 hours, based on Earth's rotation relative to the Sun.",
"category": "General",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which metal is liquid at room temperature?",
"options": ["Iron", "Copper", "Mercury", "Aluminum"],
"correctAnswer": "Mercury",
"explanation": "Mercury is a metal that remains liquid at typical room temperatures, making it unusual among metallic elements.",
"category": "Science",
"difficulty": "Medium",
"xp": 10
},
{
"question": "What is the primary purpose of a password?",
"options": ["Decorate an account", "Protect access", "Increase internet speed", "Improve screen quality"],
"correctAnswer": "Protect access",
"explanation": "A password helps restrict access to an account or system to authorized users.",
"category": "Technology",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which desert is the largest hot desert in the world?",
"options": ["Gobi Desert", "Sahara Desert", "Kalahari Desert", "Atacama Desert"],
"correctAnswer": "Sahara Desert",
"explanation": "The Sahara is the world's largest hot desert, covering much of North Africa.",
"category": "Geography",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the process by which plants make food using sunlight?",
"options": ["Digestion", "Photosynthesis", "Respiration", "Fermentation"],
"correctAnswer": "Photosynthesis",
"explanation": "Photosynthesis uses light energy to help plants convert carbon dioxide and water into sugars, releasing oxygen as a byproduct.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which device is designed to print documents onto paper?",
"options": ["Router", "Printer", "Monitor", "Keyboard"],
"correctAnswer": "Printer",
"explanation": "A printer produces physical copies of digital documents, images, or other computer-generated content.",
"category": "Technology",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which planet is the largest in our Solar System?",
"options": ["Earth", "Saturn", "Jupiter", "Neptune"],
"correctAnswer": "Jupiter",
"explanation": "Jupiter is the largest planet in the Solar System, with a mass greater than all the other planets combined.",
"category": "Space",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What is the boiling point of water at standard atmospheric pressure?",
"options": ["0°C", "50°C", "100°C", "150°C"],
"correctAnswer": "100°C",
"explanation": "At standard atmospheric pressure, pure water boils at 100 degrees Celsius.",
"category": "Science",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which animal is commonly known for changing its color to blend into its surroundings?",
"options": ["Chameleon", "Elephant", "Penguin", "Horse"],
"correctAnswer": "Chameleon",
"explanation": "Chameleons can change skin coloration through specialized cells, using color changes for communication, temperature regulation, and camouflage.",
"category": "Nature",
"difficulty": "Medium",
"xp": 10
},
{
"question": "What is the capital city of Australia?",
"options": ["Sydney", "Melbourne", "Canberra", "Perth"],
"correctAnswer": "Canberra",
"explanation": "Canberra is Australia's capital city. It was selected as a planned capital between Sydney and Melbourne.",
"category": "Geography",
"difficulty": "Easy",
"xp": 10
},
{
"question": "What does AI stand for?",
"options": ["Automated Internet", "Artificial Intelligence", "Advanced Information", "Applied Interface"],
"correctAnswer": "Artificial Intelligence",
"explanation": "Artificial intelligence refers to computer systems designed to perform tasks that normally require aspects of human intelligence.",
"category": "AI",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which natural satellite orbits Earth?",
"options": ["Mars", "The Moon", "Venus", "Titan"],
"correctAnswer": "The Moon",
"explanation": "The Moon is Earth's natural satellite and completes an orbit around Earth roughly once every 27.3 days relative to the stars.",
"category": "Space",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which vitamin is produced by the skin when exposed to sunlight?",
"options": ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"],
"correctAnswer": "Vitamin D",
"explanation": "Exposure to ultraviolet B radiation from sunlight enables human skin to produce vitamin D, which supports bone and other body functions.",
"category": "Science",
"difficulty": "Medium",
"xp": 10
},
{
"question": "What is the largest land animal alive today?",
"options": ["Giraffe", "African bush elephant", "Hippopotamus", "Rhinoceros"],
"correctAnswer": "African bush elephant",
"explanation": "The African bush elephant is the largest living land animal, with large adults weighing several tonnes.",
"category": "Nature",
"difficulty": "Easy",
"xp": 10
},
{
"question": "Which punctuation mark usually ends a direct question?",
"options": ["Period", "Comma", "Question mark", "Colon"],
"correctAnswer": "Question mark",
"explanation": "A question mark is normally placed at the end of a direct question in English.",
"category": "English",
"difficulty": "Easy",
"xp": 10
}
]
};

const batchId = `batch_${Date.now()}`;
const now = new Date().toISOString();

const formattedQuizzes = rawInput.quizzes.map((q, idx) => ({
  id: `quiz_${Date.now()}_${idx + 1}`,
  question: q.question.trim(),
  options: q.options.map(o => o.trim()),
  correct_answer: q.correctAnswer.trim(),
  explanation: q.explanation.trim(),
  category: q.category || 'General',
  difficulty: q.difficulty || 'Easy',
  xp: Number(q.xp) || 10,
  is_published: true,
  created_by: null,
  import_batch_id: batchId,
  created_at: now,
  updated_at: now
}));

const cachePath = path.join(__dirname, '..', 'server', 'data', 'quiz_cache.json');
fs.writeFileSync(cachePath, JSON.stringify(formattedQuizzes, null, 2), 'utf-8');
console.log(`Successfully formatted and saved ${formattedQuizzes.length} quizzes to ${cachePath}`);
