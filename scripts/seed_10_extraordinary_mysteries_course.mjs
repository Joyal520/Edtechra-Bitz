import dotenv from 'dotenv';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const COURSE_ID = 'e10c7ee9-0020-4000-8000-000000000020';
export const UNIT_ID = 'e10c7ee9-0020-4000-8001-000000000001';
export const TEACHER_ID = '548eea36-a825-4c69-9ca3-89fc06218c39';

// Deterministic shuffle so word tiles never start in the solved order
function shuffleWordsDeterministic(words) {
  const arr = [...words];
  if (arr.length <= 1) return arr;
  const rotated = [...arr.slice(2), ...arr.slice(0, 2)];
  const swapped = [];
  for (let i = 0; i < rotated.length; i += 2) {
    if (i + 1 < rotated.length) {
      swapped.push(rotated[i + 1], rotated[i]);
    } else {
      swapped.push(rotated[i]);
    }
  }
  const isIdentical = swapped.every((w, i) => w.toLowerCase() === arr[i].toLowerCase());
  return isIdentical ? [...arr].reverse() : swapped;
}

// Balanced non-predictable target slots (5×A, 5×B, 5×C, 5×D across the 20 MCQs)
const MCQ_TARGET_INDICES = [1, 2, 3, 0, 3, 0, 1, 2, 0, 3, 2, 1, 3, 1, 0, 2, 2, 0, 1, 3];

function placeMcqCorrectAnswer(options, correctText, targetIdx) {
  const cleanOptions = options.map((o) => String(o).trim());
  const currentIdx = cleanOptions.findIndex((o) => o === String(correctText).trim());
  if (currentIdx === -1) {
    throw new Error(`Correct option "${correctText}" not found in options: ${cleanOptions.join(' | ')}`);
  }
  const arranged = [...cleanOptions];
  const [correctItem] = arranged.splice(currentIdx, 1);
  arranged.splice(targetIdx, 0, correctItem);
  return {
    options: arranged,
    correct_answer: arranged[targetIdx]
  };
}

export const EXTRAORDINARY_MYSTERIES_LESSONS = [
  {
    lessonNumber: 1,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000001',
    blockId: 'e10c7ee9-0020-4000-8003-000000000001',
    title: 'Lesson 01 – The Two Green Children',
    videoTitle: 'Two Green Children Appeared in a Field... and Nobody Knows Why',
    videoId: 'S2hAUtle_FQ',
    subjectTopic: 'English (A1–A2) • History & Folklore',
    intro:
      'Imagine finding two children with green skin in a field. They speak a strange language and refuse to eat normal food. They say they come from a place where the sun never shines. Is this story real? Discover one of the strangest mysteries in medieval England.',
    vocabulary: [
      {
        word: 'Medieval',
        meaning: 'Related to the Middle Ages',
        example: 'Medieval castles were very large.'
      },
      {
        word: 'Field',
        meaning: 'An open area of land',
        example: 'The children were found in a field.'
      },
      {
        word: 'Harvest',
        meaning: 'Collecting crops from farms',
        example: 'Farmers work during the harvest.'
      },
      {
        word: 'Strange',
        meaning: 'Unusual or surprising',
        example: 'I heard a strange noise.'
      },
      {
        word: 'Language',
        meaning: 'Words people use to communicate',
        example: 'English is a language.'
      }
    ],
    readingPassage:
      'The story of the Green Children comes from a village called Woolpit in England. Two children were found near a field many hundreds of years ago. Their skin looked green, and they spoke a language that people could not understand. They did not want ordinary food. According to the story, they only wanted green beans. Later, the girl learned to speak English. She said that she and her brother came from a strange underground place. The story was written by two medieval writers. However, nobody knows exactly what happened. Some people think it was a misunderstanding, while others believe it was folklore.',
    didYouKnow:
      'The village of Woolpit is in Suffolk, England. Its name is connected to old pits used to catch wolves.',
    watchAgainInstruction:
      'Now you know more about the Green Children. Watch the story again and discover the details you missed.',
    badgeName: 'Mystery Explorer',
    completionMessage: "You have discovered one of England's strangest historical stories!",
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000101',
        question_type: 'multiple_choice',
        question_text: 'Where were the two green children found?',
        options: ['In a forest', 'Near a field', 'Inside a castle', 'Beside a river'],
        correct_answer: 'Near a field',
        explanation: 'They were reportedly found near a field in Woolpit.',
        skill: 'Reading Comprehension',
        concept: 'Story Setting'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000102',
        question_type: 'multiple_choice',
        question_text: 'What food did the children first want to eat?',
        options: ['Bread', 'Fish', 'Green beans', 'Meat'],
        correct_answer: 'Green beans',
        explanation: 'According to the story, they wanted green beans.',
        skill: 'Detail Recognition',
        concept: 'Green Children Diet'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000103',
        question_type: 'true_false',
        question_text: 'The children spoke English when they first appeared.',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: 'The story says they spoke a language that nobody understood.',
        skill: 'Fact Checking',
        concept: 'Language Detail'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000104',
        question_type: 'fill_blank',
        question_text: 'The two children appeared in a village called ______.',
        correct_answer: 'Woolpit',
        acceptable_answers: ['Woolpit'],
        explanation: 'Woolpit is the English village where the two children reportedly appeared.',
        skill: 'Key Detail Recall',
        concept: 'Woolpit Location'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000105',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'The girl slowly learned to speak English.',
        words: ['The', 'girl', 'slowly', 'learned', 'to', 'speak', 'English'],
        explanation: 'Correct sentence: The girl slowly learned to speak English.',
        skill: 'Sentence Structure',
        concept: 'Past Simple Word Order'
      }
    ]
  },
  {
    lessonNumber: 2,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000002',
    blockId: 'e10c7ee9-0020-4000-8003-000000000002',
    title: 'Lesson 02 – Blood Rain',
    videoTitle: 'Blood Rain: When the Sky Suddenly Turns Red',
    videoId: 'rkWKjUq3mk4',
    subjectTopic: 'English (A1–A2) • Earth Science & Weather',
    intro:
      'Imagine looking outside and seeing red rain falling from the sky. The streets become red, and the water looks like blood. Is the sky really bleeding? This strange event has happened in real life. Discover the science behind this unusual type of rain.',
    vocabulary: [
      {
        word: 'Atmosphere',
        meaning: 'The air around Earth',
        example: 'Birds fly through the atmosphere.'
      },
      {
        word: 'Particle',
        meaning: 'A very tiny piece of something',
        example: 'Dust particles float in the air.'
      },
      {
        word: 'Dust',
        meaning: 'Very small pieces of dry dirt',
        example: 'The wind carries dust.'
      },
      {
        word: 'Organism',
        meaning: 'A living thing',
        example: 'A plant is a living organism.'
      },
      {
        word: 'Rainfall',
        meaning: 'Water falling from clouds',
        example: 'Heavy rainfall flooded the road.'
      }
    ],
    readingPassage:
      'Blood rain is rain that looks red or reddish-brown. However, it is not real blood. Tiny dust particles can travel long distances in the wind. Some of this dust contains red or orange minerals. When the particles mix with rainwater, they can change its colour. In some cases, microscopic living organisms can also make water look red. This unusual event can surprise people because the rain looks like something from a horror movie. Scientists study the particles in the water to understand why the colour changes. Nature sometimes creates amazing sights through simple natural processes.',
    didYouKnow:
      'Dust from deserts can travel across countries and even oceans. Strong winds carry tiny particles through the atmosphere.',
    watchAgainInstruction:
      'Now you know why rain can look red. Watch again and discover the science behind this strange natural event.',
    badgeName: 'Nature Detective',
    completionMessage: 'You have discovered the science behind blood rain!',
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000201',
        question_type: 'multiple_choice',
        question_text: 'Is blood rain made of real human blood?',
        options: ['Yes', 'No', 'Sometimes', 'Only at night'],
        correct_answer: 'No',
        explanation: 'Blood rain is coloured by natural particles, not human blood.',
        skill: 'Scientific Understanding',
        concept: 'Composition of Blood Rain'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000202',
        question_type: 'multiple_choice',
        question_text: 'What can strong winds carry into the atmosphere?',
        options: ['Rocks', 'Red dust particles', 'Buildings', 'Animals'],
        correct_answer: 'Red dust particles',
        explanation: 'Strong winds can carry tiny dust particles over long distances.',
        skill: 'Detail Recognition',
        concept: 'Atmospheric Dust'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000203',
        question_type: 'true_false',
        question_text: 'Some microscopic organisms can give water a red colour.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Certain microscopic organisms can change the colour of water.',
        skill: 'Fact Checking',
        concept: 'Microscopic Organisms'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000204',
        question_type: 'fill_blank',
        question_text: 'Blood rain is not real ______.',
        correct_answer: 'blood',
        acceptable_answers: ['blood'],
        explanation: 'Red minerals, dust or microscopic organisms colour the rainwater; it is not real blood.',
        skill: 'Key Detail Recall',
        concept: 'Natural Cause vs Myth'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000205',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'Red particles can colour rainwater.',
        words: ['Red', 'particles', 'can', 'colour', 'rainwater'],
        explanation: 'Correct sentence: Red particles can colour rainwater.',
        skill: 'Sentence Structure',
        concept: 'Modal Verb Word Order'
      }
    ]
  },
  {
    lessonNumber: 3,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000003',
    blockId: 'e10c7ee9-0020-4000-8003-000000000003',
    title: 'Lesson 03 – The Astronaut Who Let Go',
    videoTitle: 'The Astronaut Who Let Go and Floated Alone in Space',
    videoId: '-8pMSH-S3HI',
    subjectTopic: 'English (A1–A2) • Space & Exploration',
    intro:
      'Imagine floating in space without a safety rope. Your spacecraft is getting smaller, and Earth is far below you. One mistake could be dangerous. In 1984, an astronaut did something extraordinary. He moved away from his spacecraft and floated freely in space.',
    vocabulary: [
      {
        word: 'Astronaut',
        meaning: 'A person who travels into space',
        example: 'The astronaut wore a special suit.'
      },
      {
        word: 'Spacecraft',
        meaning: 'A vehicle designed to travel in space',
        example: 'The spacecraft moved around Earth.'
      },
      {
        word: 'Float',
        meaning: 'To move without touching the ground',
        example: 'Astronauts float in space.'
      },
      {
        word: 'Thruster',
        meaning: 'A device that produces movement',
        example: 'The thruster helped move the astronaut.'
      },
      {
        word: 'Untethered',
        meaning: 'Not connected by a safety rope',
        example: 'He performed an untethered spacewalk.'
      }
    ],
    readingPassage:
      'Bruce McCandless was an American astronaut. In February 1984, he became the first person to perform an untethered spacewalk. This means he moved outside his spacecraft without a safety rope connecting him to it. He used a special device called the Manned Maneuvering Unit. It was like a small backpack with rocket thrusters. These thrusters helped him move in different directions. He travelled almost 100 metres away from the space shuttle Challenger. This was a dangerous but important moment in space exploration. His historic spacewalk showed how astronauts could move freely outside a spacecraft.',
    didYouKnow:
      "Bruce McCandless's famous spacewalk photograph became one of the most memorable images in the history of space exploration.",
    watchAgainInstruction:
      'Now you understand how the astronaut moved without a safety rope. Watch again and observe his special space backpack.',
    badgeName: 'Space Explorer',
    completionMessage: 'You have explored one of the most extraordinary moments in space history!',
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000301',
        question_type: 'multiple_choice',
        question_text: "What was the astronaut's name?",
        options: ['Neil Armstrong', 'Bruce McCandless', 'Buzz Aldrin', 'Yuri Gagarin'],
        correct_answer: 'Bruce McCandless',
        explanation: 'Bruce McCandless performed the historic untethered spacewalk.',
        skill: 'Reading Comprehension',
        concept: 'Historical Astronaut'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000302',
        question_type: 'multiple_choice',
        question_text: 'What helped him move in space?',
        options: ['A parachute', 'A safety rope', 'A jet-powered backpack', 'A large balloon'],
        correct_answer: 'A jet-powered backpack',
        explanation: 'He used the Manned Maneuvering Unit.',
        skill: 'Detail Recognition',
        concept: 'Manned Maneuvering Unit'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000303',
        question_type: 'true_false',
        question_text: 'Bruce McCandless used a safety rope during this spacewalk.',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: 'He performed the spacewalk without a safety rope.',
        skill: 'Fact Checking',
        concept: 'Untethered Spacewalk'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000304',
        question_type: 'fill_blank',
        question_text: 'Bruce McCandless travelled almost ______ metres away from the shuttle.',
        correct_answer: '100',
        acceptable_answers: ['100', 'one hundred'],
        explanation: 'He floated nearly 100 metres away from the space shuttle Challenger.',
        skill: 'Key Detail Recall',
        concept: 'Spacewalk Distance'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000305',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'The astronaut moved freely in space.',
        words: ['The', 'astronaut', 'moved', 'freely', 'in', 'space'],
        explanation: 'Correct sentence: The astronaut moved freely in space.',
        skill: 'Sentence Structure',
        concept: 'Adverb Placement'
      }
    ]
  },
  {
    lessonNumber: 4,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000004',
    blockId: 'e10c7ee9-0020-4000-8003-000000000004',
    title: 'Lesson 04 – Zombie Ant Fungus',
    videoTitle: 'Zombie Ant Fungus',
    videoId: 'dQFlsdyaInw',
    subjectTopic: 'English (A1–A2) • Biology & Nature',
    intro:
      'Imagine an ant that suddenly stops following its friends. It walks alone, climbs a plant and bites a leaf. Something strange is affecting its behaviour. This is not a horror movie. It is a real natural event caused by a special fungus found in some forests.',
    vocabulary: [
      {
        word: 'Fungus',
        meaning: 'A living thing that includes moulds and mushrooms',
        example: 'Some fungi grow on trees.'
      },
      {
        word: 'Parasite',
        meaning: 'A living thing that lives on another living thing',
        example: 'A parasite can harm its host.'
      },
      {
        word: 'Behaviour',
        meaning: 'The way something acts',
        example: "The ant's behaviour changed."
      },
      {
        word: 'Spore',
        meaning: 'A tiny reproductive unit of some fungi',
        example: 'Fungi release spores.'
      },
      {
        word: 'Colony',
        meaning: 'A group of ants living together',
        example: 'The ants returned to their colony.'
      }
    ],
    readingPassage:
      "Ophiocordyceps is a group of fungi that can infect certain insects. Some types infect ants. The fungus enters an ant's body and grows inside it. It can affect the ant's behaviour. The infected ant may leave its colony and climb a plant. It may bite a leaf and stay there. After the ant dies, the fungus grows out of its body and releases spores. These tiny spores can reach other insects. Scientists study this unusual relationship between fungi and insects. It is important to understand that these fungi are specialised for certain insects. They do not turn humans into zombies.",
    didYouKnow:
      'Some parasitic fungi can influence the behaviour of their hosts. Scientists study these relationships to understand nature and evolution.',
    watchAgainInstruction:
      'Now you understand how this fungus affects certain ants. Watch again and observe the strange behaviour of the infected ant.',
    badgeName: 'Biology Explorer',
    completionMessage: "You have discovered one of nature's strangest relationships!",
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000401',
        question_type: 'multiple_choice',
        question_text: 'What does Ophiocordyceps infect?',
        options: ['Certain insects', 'Humans', 'Fish', 'Birds'],
        correct_answer: 'Certain insects',
        explanation: 'Certain types of Ophiocordyceps infect insects such as ants.',
        skill: 'Reading Comprehension',
        concept: 'Host Specificity'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000402',
        question_type: 'multiple_choice',
        question_text: 'What can the fungus release after growing?',
        options: ['Flowers', 'Seeds', 'Spores', 'Eggs'],
        correct_answer: 'Spores',
        explanation: 'The fungus releases tiny spores that can infect other insects.',
        skill: 'Detail Recognition',
        concept: 'Fungal Life Cycle'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000403',
        question_type: 'true_false',
        question_text: 'Ophiocordyceps turns humans into zombies.',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: 'These fungi are specialised to infect certain insects.',
        skill: 'Fact Checking',
        concept: 'Scientific Accuracy'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000404',
        question_type: 'fill_blank',
        question_text: "The fungus can change the ant's ______.",
        correct_answer: 'behaviour',
        acceptable_answers: ['behaviour', 'behavior'],
        explanation: 'The fungus affects the infected ant’s behaviour before releasing spores.',
        skill: 'Vocabulary & Detail',
        concept: 'Host Behaviour'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000405',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'The fungus infects certain ants.',
        words: ['The', 'fungus', 'infects', 'certain', 'ants'],
        explanation: 'Correct sentence: The fungus infects certain ants.',
        skill: 'Sentence Structure',
        concept: 'Simple Present Sentence'
      }
    ]
  },
  {
    lessonNumber: 5,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000005',
    blockId: 'e10c7ee9-0020-4000-8003-000000000005',
    title: 'Lesson 05 – Falcon Lake UFO',
    videoTitle: 'Falcon Lake UFO: The Man Who Was Burned by a Flying Saucer?',
    videoId: 'xIOtXPJ6RTA',
    subjectTopic: 'English (A1–A2) • Unsolved Sightings',
    intro:
      'In 1967, a man was exploring a forest in Canada. Suddenly, he saw a strange object in the sky. It looked like a flying saucer. Then something unexpected happened. He suffered burns on his body. What did he really see? Discover this famous UFO mystery.',
    vocabulary: [
      {
        word: 'UFO',
        meaning: 'An unidentified flying object',
        example: 'People reported seeing a UFO.'
      },
      {
        word: 'Forest',
        meaning: 'A large area covered with trees',
        example: 'We walked through the forest.'
      },
      {
        word: 'Metallic',
        meaning: 'Made of or looking like metal',
        example: 'The object had a metallic surface.'
      },
      {
        word: 'Burn',
        meaning: 'An injury caused by heat or fire',
        example: 'He had a burn on his arm.'
      },
      {
        word: 'Investigate',
        meaning: 'To study something carefully',
        example: 'Scientists investigate unusual events.'
      }
    ],
    readingPassage:
      'The Falcon Lake incident happened in Manitoba, Canada, on May 20, 1967. A man named Stefan Michalak said he saw two unusual objects in the sky. One disappeared, while the other landed nearby. He described it as a large metallic object. According to his account, he went closer to examine it. He later suffered burns to his body. His injuries and damaged clothing were examined by investigators. However, the exact cause of the incident remains uncertain. Some people believe he saw an unusual aircraft, while others think it was something from another world. The case remains a famous UFO mystery.',
    didYouKnow:
      "The Falcon Lake incident is often described as one of Canada's best-known UFO reports.",
    watchAgainInstruction:
      "Now you know about Stefan Michalak's strange experience. Watch again and pay attention to the events near Falcon Lake.",
    badgeName: 'UFO Investigator',
    completionMessage: "You have investigated one of Canada's most famous UFO mysteries!",
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000501',
        question_type: 'multiple_choice',
        question_text: 'Where did the Falcon Lake incident happen?',
        options: ['Australia', 'Canada', 'England', 'Japan'],
        correct_answer: 'Canada',
        explanation: 'The incident happened near Falcon Lake in Manitoba, Canada.',
        skill: 'Reading Comprehension',
        concept: 'Falcon Lake Setting'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000502',
        question_type: 'multiple_choice',
        question_text: 'In which year did the incident happen?',
        options: ['1945', '1955', '1967', '1984'],
        correct_answer: '1967',
        explanation: 'The reported incident happened on May 20, 1967.',
        skill: 'Detail Recognition',
        concept: 'Historical Date'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000503',
        question_type: 'true_false',
        question_text: "Investigators examined Stefan Michalak's damaged clothing.",
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'His damaged clothing and the reported landing site were investigated.',
        skill: 'Fact Checking',
        concept: 'Investigation Evidence'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000504',
        question_type: 'fill_blank',
        question_text: 'The man involved in the incident was named Stefan ______.',
        correct_answer: 'Michalak',
        acceptable_answers: ['Michalak'],
        explanation: 'Stefan Michalak reported the Falcon Lake encounter in 1967.',
        skill: 'Key Detail Recall',
        concept: 'Witness Name'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000505',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'He saw a strange object.',
        words: ['He', 'saw', 'a', 'strange', 'object'],
        explanation: 'Correct sentence: He saw a strange object.',
        skill: 'Sentence Structure',
        concept: 'Subject Verb Object'
      }
    ]
  },
  {
    lessonNumber: 6,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000006',
    blockId: 'e10c7ee9-0020-4000-8003-000000000006',
    title: 'Lesson 06 – The Sleeping Village',
    videoTitle: 'The Sleeping Village: People Fell Asleep for Six Days!',
    videoId: '2tQvNR5ZQWA',
    subjectTopic: 'English (A1–A2) • Science Mysteries',
    intro:
      'Imagine going to sleep one night and waking up several days later. This sounds impossible, but something similar happened in a small village in Kazakhstan. People suddenly became extremely sleepy. Some slept for days. What caused this strange event?',
    vocabulary: [
      {
        word: 'Village',
        meaning: 'A small place where people live',
        example: 'My grandparents live in a village.'
      },
      {
        word: 'Confused',
        meaning: 'Unable to understand something clearly',
        example: 'He felt confused after waking up.'
      },
      {
        word: 'Oxygen',
        meaning: 'A gas that humans need to breathe',
        example: 'We need oxygen to live.'
      },
      {
        word: 'Gas',
        meaning: 'A substance like air',
        example: 'Some gases are harmful.'
      },
      {
        word: 'Mine',
        meaning: 'A place where people take minerals from the ground',
        example: 'The old mine was closed.'
      }
    ],
    readingPassage:
      'Kalachi is a village in Kazakhstan. It became famous because many residents experienced unusual periods of sleepiness. Some people slept for several days. When they woke up, they sometimes felt weak or confused. Some also reported seeing things that were not really there. Scientists investigated the village and studied the air, soil and water. An old uranium mine was located nearby. Researchers found unusual environmental conditions, including harmful gases and changes in oxygen levels. These conditions may have contributed to the problem. However, the exact cause was not fully confirmed. The event became known as the Sleeping Village mystery.',
    didYouKnow:
      'Kalachi is located in northern Kazakhstan. The unusual sleep episodes attracted scientists and researchers from different places.',
    watchAgainInstruction:
      'Now you know about the unusual sleeping problem in Kalachi. Watch again and look for clues about the possible causes.',
    badgeName: 'Science Detective',
    completionMessage: 'You have explored the mystery of the Sleeping Village!',
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000601',
        question_type: 'multiple_choice',
        question_text: 'In which country is Kalachi located?',
        options: ['India', 'Canada', 'Kazakhstan', 'Brazil'],
        correct_answer: 'Kazakhstan',
        explanation: 'Kalachi is a village in Kazakhstan.',
        skill: 'Reading Comprehension',
        concept: 'Village Geography'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000602',
        question_type: 'multiple_choice',
        question_text: 'What was located near the village?',
        options: ['An old uranium mine', 'A large airport', 'A volcano', 'A space station'],
        correct_answer: 'An old uranium mine',
        explanation: 'An old uranium mine was located near the village.',
        skill: 'Detail Recognition',
        concept: 'Nearby Environment'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000603',
        question_type: 'true_false',
        question_text: 'Scientists confirmed one exact cause of the sleeping problem.',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation:
          'Scientists investigated possible environmental causes, but the exact cause was not fully confirmed.',
        skill: 'Critical Thinking',
        concept: 'Scientific Uncertainty'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000604',
        question_type: 'fill_blank',
        question_text: 'People in Kalachi sometimes felt weak and ______ after waking up.',
        correct_answer: 'confused',
        acceptable_answers: ['confused'],
        explanation: 'Residents often felt weak or confused when they finally woke up.',
        skill: 'Vocabulary in Context',
        concept: 'Symptoms'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000605',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'Some people slept for days.',
        words: ['Some', 'people', 'slept', 'for', 'days'],
        explanation: 'Correct sentence: Some people slept for days.',
        skill: 'Sentence Structure',
        concept: 'Time Expression Order'
      }
    ]
  },
  {
    lessonNumber: 7,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000007',
    blockId: 'e10c7ee9-0020-4000-8003-000000000007',
    title: 'Lesson 07 – The Blue Fugate Family',
    videoTitle: 'The Family With a Hidden Genetic Mystery',
    videoId: 'GljdK-bWrmE',
    subjectTopic: 'English (A1–A2) • Medical Science & Genetics',
    intro:
      'Imagine being born with blue skin. Now imagine that several members of your family have the same unusual appearance. This really happened to a family in the United States. For many years, people did not understand why. Scientists finally discovered a surprising medical explanation.',
    vocabulary: [
      {
        word: 'Genetic',
        meaning: 'Related to information passed from parents',
        example: 'Some diseases are genetic.'
      },
      {
        word: 'Condition',
        meaning: 'A medical or physical state',
        example: 'He has a rare medical condition.'
      },
      {
        word: 'Blood',
        meaning: 'The red liquid inside our bodies',
        example: 'Blood carries oxygen.'
      },
      {
        word: 'Generation',
        meaning: 'People born around the same time in a family',
        example: 'The condition appeared in another generation.'
      },
      {
        word: 'Treatment',
        meaning: 'Medical care used to help someone',
        example: 'The doctor suggested a treatment.'
      }
    ],
    readingPassage:
      'The Blue Fugates were a family from Kentucky in the United States. Some members of the family had blue or purple-looking skin. Their unusual appearance was connected to a rare blood condition called methemoglobinemia. This condition affects the way blood carries oxygen. It can cause the skin to look blue. The condition can sometimes be passed through families. In the 1960s, a doctor named Madison Cawein studied the family. He helped identify the condition and introduced treatment. This discovery showed that the unusual skin colour was not caused by magic or a curse. It had a medical explanation.',
    didYouKnow:
      'Methemoglobinemia can affect the colour of blood and skin. It is a rare medical condition that can have different causes.',
    watchAgainInstruction:
      'Now you know the medical explanation behind the Blue Fugate family. Watch again and discover how science solved the mystery.',
    badgeName: 'Human Body Explorer',
    completionMessage: 'You have discovered how science explained a strange family mystery!',
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000701',
        question_type: 'multiple_choice',
        question_text: 'Where did the Blue Fugate family live?',
        options: ['England', 'Kentucky, USA', 'Canada', 'Australia'],
        correct_answer: 'Kentucky, USA',
        explanation: 'The family lived in Kentucky in the United States.',
        skill: 'Reading Comprehension',
        concept: 'Family Origin'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000702',
        question_type: 'multiple_choice',
        question_text: 'What condition was linked to their blue skin?',
        options: ['Asthma', 'Diabetes', 'Methemoglobinemia', 'Fever'],
        correct_answer: 'Methemoglobinemia',
        explanation: 'Methemoglobinemia affects the way blood carries oxygen.',
        skill: 'Detail Recognition',
        concept: 'Medical Condition'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000703',
        question_type: 'true_false',
        question_text: "The family's unusual skin colour was caused by a curse.",
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: 'It was linked to a medical condition.',
        skill: 'Fact Checking',
        concept: 'Science vs Superstition'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000704',
        question_type: 'fill_blank',
        question_text: 'The doctor who studied the family was Madison ______.',
        correct_answer: 'Cawein',
        acceptable_answers: ['Cawein'],
        explanation: 'Dr. Madison Cawein studied the family in the 1960s and identified the condition.',
        skill: 'Key Detail Recall',
        concept: 'Medical Research'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000705',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'The family had a rare condition.',
        words: ['The', 'family', 'had', 'a', 'rare', 'condition'],
        explanation: 'Correct sentence: The family had a rare condition.',
        skill: 'Sentence Structure',
        concept: 'Adjective + Noun Order'
      }
    ]
  },
  {
    lessonNumber: 8,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000008',
    blockId: 'e10c7ee9-0020-4000-8003-000000000008',
    title: 'Lesson 08 – Mike the Headless Chicken',
    videoTitle: 'The Bird That Lived for 18 Months Without a Head!',
    videoId: '_MbYg81ZDjo',
    subjectTopic: 'English (A1–A2) • Biology & Animal History',
    intro:
      'Can a chicken survive without most of its head? It sounds impossible, but a chicken named Mike became famous for doing exactly that. He lived for about 18 months after losing most of his head. How was this possible? Discover his extraordinary story.',
    vocabulary: [
      {
        word: 'Survive',
        meaning: 'To stay alive',
        example: 'Some animals survive in cold places.'
      },
      {
        word: 'Brainstem',
        meaning: 'The part of the brain that controls important body functions',
        example: 'The brainstem helps control breathing.'
      },
      {
        word: 'Balance',
        meaning: 'The ability to stay steady',
        example: 'Birds need balance to walk.'
      },
      {
        word: 'Dropper',
        meaning: 'A small tool used to give liquid in drops',
        example: 'The farmer used a dropper.'
      },
      {
        word: 'Famous',
        meaning: 'Known by many people',
        example: 'Mike became famous across America.'
      }
    ],
    readingPassage:
      'Mike was a chicken from Colorado in the United States. In 1945, a farmer named Lloyd Olsen tried to prepare him for dinner. However, the chicken survived after most of his head was removed. Part of his brainstem remained inside his body. The brainstem controls important functions and helps the body stay alive. Mike needed special care. His owner gave him food and water using a small dropper. People travelled from different places to see him. Mike became a famous attraction. He lived for about 18 months before dying in 1947. His story became a remarkable part of animal history.',
    didYouKnow:
      'Mike the Headless Chicken became so famous that his hometown in Colorado still celebrates his unusual story with an annual festival.',
    watchAgainInstruction:
      'Now you understand why Mike survived. Watch again and pay attention to the special part of his brain that remained.',
    badgeName: 'Animal Explorer',
    completionMessage: 'You have discovered one of the strangest animal stories in history!',
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000801',
        question_type: 'multiple_choice',
        question_text: "What was the chicken's name?",
        options: ['Charlie', 'Mike', 'Max', 'Rocky'],
        correct_answer: 'Mike',
        explanation: 'The chicken was named Mike.',
        skill: 'Reading Comprehension',
        concept: 'Subject Identity'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000802',
        question_type: 'multiple_choice',
        question_text: 'Which part of the brain remained?',
        options: ['Brainstem', 'Front brain only', 'Brain covering', 'Eye'],
        correct_answer: 'Brainstem',
        explanation: "Part of Mike's brainstem remained inside his body.",
        skill: 'Detail Recognition',
        concept: 'Biological Explanation'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000803',
        question_type: 'true_false',
        question_text: 'Mike lived for about 18 months after losing most of his head.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Mike survived for approximately 18 months.',
        skill: 'Fact Checking',
        concept: 'Survival Timeline'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000804',
        question_type: 'fill_blank',
        question_text: "Mike's owner was named Lloyd ______.",
        correct_answer: 'Olsen',
        acceptable_answers: ['Olsen'],
        explanation: 'Farmer Lloyd Olsen cared for Mike with food and water using a dropper.',
        skill: 'Key Detail Recall',
        concept: 'Owner Name'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000805',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'Mike became a famous chicken.',
        words: ['Mike', 'became', 'a', 'famous', 'chicken'],
        explanation: 'Correct sentence: Mike became a famous chicken.',
        skill: 'Sentence Structure',
        concept: 'Linking Verb Word Order'
      }
    ]
  },
  {
    lessonNumber: 9,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000009',
    blockId: 'e10c7ee9-0020-4000-8003-000000000009',
    title: 'Lesson 09 – The Terrifying Snake Experiment',
    videoTitle: 'The Terrifying Snake Experiment Mystery',
    videoId: 'lgmeCwH28mI',
    subjectTopic: 'English (A1–A2) • Psychology & Critical Thinking',
    intro:
      'Imagine someone telling you that a deadly snake has bitten you. You feel a small scratch, but there is no snake. Can fear really affect your body? A famous internet story describes a terrifying experiment. But did it really happen? Discover the truth about this mystery.',
    vocabulary: [
      {
        word: 'Blindfold',
        meaning: 'Something covering the eyes',
        example: 'The player wore a blindfold.'
      },
      {
        word: 'Fear',
        meaning: 'The feeling you have when you are afraid',
        example: 'Fear made him nervous.'
      },
      {
        word: 'Experiment',
        meaning: 'A test to discover something',
        example: 'Scientists performed an experiment.'
      },
      {
        word: 'Evidence',
        meaning: 'Information that helps prove something',
        example: 'We need evidence before believing a story.'
      },
      {
        word: 'Stress',
        meaning: 'Mental or physical pressure',
        example: 'Too much stress can affect the body.'
      }
    ],
    readingPassage:
      'A popular internet story describes a prisoner who was told that a deadly snake had bitten him. The story says that he became so frightened that he died. However, there is no reliable evidence that this experiment really happened. It is widely treated as an unverified story. But fear can affect the human body. When people feel afraid, their heart may beat faster and their breathing may change. Severe emotional stress can sometimes trigger a heart condition called broken heart syndrome. This shows that strong emotions can affect physical health. However, the famous snake experiment should not be treated as a proven historical event.',
    didYouKnow:
      'Broken heart syndrome is a real medical condition. Severe emotional or physical stress can sometimes affect the heart.',
    watchAgainInstruction:
      'Now you know the difference between an internet myth and real medical science. Watch again and discover the surprising power of fear.',
    badgeName: 'Critical Thinker',
    completionMessage: 'You have learned to separate internet myths from real scientific facts!',
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000000901',
        question_type: 'multiple_choice',
        question_text: 'What does the famous snake experiment story claim?',
        options: [
          'A prisoner became rich.',
          'A prisoner died from fear.',
          'A snake learned to speak.',
          'A prisoner escaped.'
        ],
        correct_answer: 'A prisoner died from fear.',
        explanation:
          'The internet story claims that the prisoner died after believing a snake had bitten him.',
        skill: 'Reading Comprehension',
        concept: 'Myth Claims'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000902',
        question_type: 'multiple_choice',
        question_text: 'What is broken heart syndrome?',
        options: [
          'A type of broken bone',
          'A heart condition linked to severe stress',
          'A type of snake',
          'A sleeping problem'
        ],
        correct_answer: 'A heart condition linked to severe stress',
        explanation:
          'Severe emotional or physical stress can sometimes trigger this heart condition.',
        skill: 'Detail Recognition',
        concept: 'Stress & Physical Health'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000903',
        question_type: 'true_false',
        question_text:
          'There is reliable evidence proving that the famous snake experiment happened.',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: 'There is no reliable evidence that the experiment happened.',
        skill: 'Critical Thinking',
        concept: 'Evaluating Evidence'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000904',
        question_type: 'fill_blank',
        question_text: 'When people feel afraid, their heart may beat ______.',
        correct_answer: 'faster',
        acceptable_answers: ['faster'],
        explanation: 'Fear causes physical responses such as a faster heartbeat and faster breathing.',
        skill: 'Vocabulary in Context',
        concept: 'Physical Response to Fear'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000000905',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: 'Fear can affect the body.',
        words: ['Fear', 'can', 'affect', 'the', 'body'],
        explanation: 'Correct sentence: Fear can affect the body.',
        skill: 'Sentence Structure',
        concept: 'Modal Verb Word Order'
      }
    ]
  },
  {
    lessonNumber: 10,
    episodeId: 'e10c7ee9-0020-4000-8002-000000000010',
    blockId: 'e10c7ee9-0020-4000-8003-000000000010',
    title: 'Lesson 10 – Alien Hand Syndrome',
    videoTitle: 'What If Your Own Hand Stopped Obeying You?',
    videoId: 'IEJqoOYaTIo',
    subjectTopic: 'English (A1–A2) • Neuroscience & The Brain',
    intro:
      "Imagine lying in bed when suddenly your hand starts moving without your permission. You try to stop it, but it does not listen. This sounds like a horror movie, but it is a real medical condition. Discover why some people's hands seem to have a mind of their own.",
    vocabulary: [
      {
        word: 'Syndrome',
        meaning: 'A group of medical signs or symptoms',
        example: 'The doctor studied the syndrome.'
      },
      {
        word: 'Involuntary',
        meaning: 'Happening without choosing to do it',
        example: 'Breathing is partly involuntary.'
      },
      {
        word: 'Neurological',
        meaning: 'Related to the brain and nervous system',
        example: 'A stroke can cause neurological problems.'
      },
      {
        word: 'Movement',
        meaning: 'The act of changing position',
        example: 'The hand made a strange movement.'
      },
      {
        word: 'Permission',
        meaning: 'Agreement to do something',
        example: 'He did not give permission.'
      }
    ],
    readingPassage:
      "Alien Hand Syndrome is a rare neurological condition. People with this condition may feel that one hand is moving by itself. The hand might pick up objects, open buttons or perform other actions without the person's intention. The person is awake and can see what the hand is doing. However, they may feel unable to control it. This condition can happen after certain brain injuries, strokes or brain surgeries. Scientists believe it is connected to problems in the brain areas that control movement. The hand is not controlled by an alien. It is a rare example of how complex the human brain can be.",
    didYouKnow:
      "Alien Hand Syndrome is extremely rare. It can sometimes cause one hand to perform actions that seem to work against the person's intentions.",
    watchAgainInstruction:
      'Now you understand the science behind Alien Hand Syndrome. Watch again and notice how the brain controls voluntary movement.',
    badgeName: 'Brain Explorer',
    completionMessage: 'Congratulations! You have completed all ten extraordinary mysteries!',
    questions: [
      {
        id: 'e10c7ee9-0020-4000-8004-000000001001',
        question_type: 'multiple_choice',
        question_text: 'What is Alien Hand Syndrome?',
        options: [
          'An alien infection',
          'A rare neurological condition',
          'A type of bone disease',
          'A sleeping disorder'
        ],
        correct_answer: 'A rare neurological condition',
        explanation:
          'Alien Hand Syndrome is a rare condition connected to the brain and movement.',
        skill: 'Reading Comprehension',
        concept: 'Neurological Definition'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000001002',
        question_type: 'multiple_choice',
        question_text: "What may happen to a person's hand?",
        options: [
          'It may move without permission.',
          'It may disappear.',
          'It may become invisible.',
          'It may change colour.'
        ],
        correct_answer: 'It may move without permission.',
        explanation: "The affected hand may perform actions without the person's intention.",
        skill: 'Detail Recognition',
        concept: 'Symptoms'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000001003',
        question_type: 'true_false',
        question_text: 'Alien Hand Syndrome is caused by real aliens.',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: 'It is a neurological condition, not an alien infection.',
        skill: 'Fact Checking',
        concept: 'Medical Fact vs Name Myth'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000001004',
        question_type: 'fill_blank',
        question_text: 'Alien Hand Syndrome is a rare ______ condition.',
        correct_answer: 'neurological',
        acceptable_answers: ['neurological'],
        explanation:
          'It is a neurological condition connected to brain regions that control movement.',
        skill: 'Key Vocabulary Recall',
        concept: 'Neurology'
      },
      {
        id: 'e10c7ee9-0020-4000-8004-000000001005',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence.',
        sentence: "The brain controls the body's movement.",
        words: ['The', 'brain', 'controls', 'the', "body's", 'movement'],
        explanation: "Correct sentence: The brain controls the body's movement.",
        skill: 'Sentence Structure',
        concept: 'Possessive & Object Order'
      }
    ]
  }
];

const FINAL_COMPLETION_DATA = {
  headline: 'YOU DID IT!',
  subheadline: 'CONGRATULATIONS, MYSTERY EXPLORER!',
  summary:
    'You have completed EdTechra Bitz: 10 Extraordinary Mysteries Explained. You explored strange events, discovered scientific facts, learned new English vocabulary and challenged your knowledge.',
  achievements: [
    '10 Mysteries Explored',
    '10 Videos Watched',
    '50+ Vocabulary Words Encountered',
    '50 Knowledge Questions',
    '10 Lessons Completed'
  ],
  badge_title: 'EDTECHRA MASTER MYSTERY EXPLORER',
  closing_note:
    'You are now a Master Mystery Explorer! Keep watching. Keep discovering. Keep learning. Your next adventure is waiting!'
};

export async function seedExtraordinaryMysteriesCourse() {
  console.log('=== Seeding Course: EdTechra Bitz – 10 Extraordinary Mysteries Explained ===');

  // 1. Upsert the Course record
  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .upsert(
      {
        id: COURSE_ID,
        teacher_id: TEACHER_ID,
        title: 'EdTechra Bitz – 10 Extraordinary Mysteries Explained',
        short_description:
          'Discover ten extraordinary mysteries from science, history, nature and the human body. Watch fascinating short videos, learn new English vocabulary, read simple explanations and test your knowledge through interactive challenges.',
        subject: 'English (A1–A2) • Mysteries & Science',
        grade_level: 'A1–A2',
        course_type: 'full',
        status: 'published',
        cover_image_url: '/images/extraordinary-mysteries-cover.jpg',
        cover_aspect_ratio: '16:9',
        estimated_hours: 3,
        daily_release_enabled: false,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (courseErr) {
    throw new Error(`Failed to upsert course: ${courseErr.message}`);
  }
  console.log('1. Course upserted:', courseRow.id, '-', courseRow.title);

  // 2. Upsert the single Unit
  const { data: unitRow, error: unitErr } = await supabase
    .from('course_units')
    .upsert(
      {
        id: UNIT_ID,
        course_id: COURSE_ID,
        title: 'Unit 1: 10 Extraordinary Mysteries Explained',
        description:
          'Watch. Discover. Understand. Learn. Ten extraordinary mysteries from science, history, nature and the human body.',
        order_index: 0,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (unitErr) {
    throw new Error(`Failed to upsert unit: ${unitErr.message}`);
  }
  console.log('2. Unit upserted:', unitRow.id, '-', unitRow.title);

  // Remove any leftover episodes not in the 10-lesson set
  await supabase
    .from('course_episodes')
    .delete()
    .eq('course_id', COURSE_ID)
    .not('id', 'in', `(${EXTRAORDINARY_MYSTERIES_LESSONS.map((l) => l.episodeId).join(',')})`);

  let mcqCounter = 0;

  // 3. Upsert each of the 10 Lessons
  for (let i = 0; i < EXTRAORDINARY_MYSTERIES_LESSONS.length; i++) {
    const lesson = EXTRAORDINARY_MYSTERIES_LESSONS[i];
    const videoUrl = `https://www.youtube.com/shorts/${lesson.videoId}`;
    const isFinalLesson = lesson.lessonNumber === EXTRAORDINARY_MYSTERIES_LESSONS.length;

    const { error: epErr } = await supabase.from('course_episodes').upsert(
      {
        id: lesson.episodeId,
        unit_id: UNIT_ID,
        course_id: COURSE_ID,
        title: lesson.title,
        episode_type: 'lesson',
        order_index: i,
        position: i + 1,
        release_day: i + 1,
        daily_release_enabled: false,
        is_manually_unlocked: true,
        estimated_minutes: 10,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );

    if (epErr) {
      throw new Error(`Failed to upsert episode ${lesson.lessonNumber}: ${epErr.message}`);
    }

    const blockContent = {
      _block_type: 'learn_with_shorts',
      is_learn_with_shorts: true,
      aspect_ratio: '9:16',
      reward_mode: 'tiered_mystery',
      title: lesson.title,
      video_title: lesson.videoTitle,
      subtitle: 'Watch. Discover. Understand. Learn.',
      description: lesson.intro,
      video_url: videoUrl,
      url: videoUrl,
      video_id: lesson.videoId,
      show_transcript: false,
      vocabulary_cards: lesson.vocabulary,
      reading_passage: lesson.readingPassage,
      did_you_know: lesson.didYouKnow,
      watch_again_instruction: lesson.watchAgainInstruction,
      badge_name: lesson.badgeName,
      completion_message: lesson.completionMessage,
      is_final_lesson: isFinalLesson,
      final_completion: isFinalLesson ? FINAL_COMPLETION_DATA : null,
      cover_image_url: `https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg`,
      subject_topic: lesson.subjectTopic,
      difficulty: 'easy',
      video: {
        title: lesson.videoTitle,
        description: lesson.intro,
        url: videoUrl,
        aspect_ratio: '9:16',
        show_transcript: false
      }
    };

    let blockInsertRes = await supabase.from('course_blocks').upsert(
      {
        id: lesson.blockId,
        episode_id: lesson.episodeId,
        course_id: COURSE_ID,
        block_type: 'learn_with_shorts',
        order_index: 0,
        content: blockContent
      },
      { onConflict: 'id' }
    );

    if (
      blockInsertRes.error &&
      (blockInsertRes.error.code === '23514' ||
        String(blockInsertRes.error.message || '').includes('course_blocks_block_type_check'))
    ) {
      blockInsertRes = await supabase.from('course_blocks').upsert(
        {
          id: lesson.blockId,
          episode_id: lesson.episodeId,
          course_id: COURSE_ID,
          block_type: 'youtube_short',
          order_index: 0,
          content: blockContent
        },
        { onConflict: 'id' }
      );
    }

    if (blockInsertRes.error) {
      throw new Error(
        `Failed to upsert block for lesson ${lesson.lessonNumber}: ${blockInsertRes.error.message}`
      );
    }

    const questionsToInsert = lesson.questions.map((q, qIdx) => {
      if (q.question_type === 'sentence_reordering') {
        const canonicalWords = q.words;
        const shuffledWords = shuffleWordsDeterministic(canonicalWords);
        return {
          id: q.id,
          episode_id: lesson.episodeId,
          course_id: COURSE_ID,
          block_id: lesson.blockId,
          question_text: q.question_text,
          question_type: 'ordering',
          options: {
            _question_type: 'sentence_reordering',
            options: shuffledWords,
            items: shuffledWords,
            correct_order: canonicalWords
          },
          correct_answer: q.sentence.trim(),
          explanation: q.explanation,
          skill: q.skill,
          concept: q.concept,
          difficulty: 'easy',
          points: 2,
          order_index: qIdx
        };
      }

      if (q.question_type === 'fill_blank') {
        return {
          id: q.id,
          episode_id: lesson.episodeId,
          course_id: COURSE_ID,
          block_id: lesson.blockId,
          question_text: q.question_text,
          question_type: 'fill_blank',
          options: {
            _question_type: 'fill_blank',
            options: [q.correct_answer],
            expected_answer: q.correct_answer,
            acceptable_answers: q.acceptable_answers || [q.correct_answer]
          },
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          skill: q.skill,
          concept: q.concept,
          difficulty: 'easy',
          points: 2,
          order_index: qIdx
        };
      }

      if (q.question_type === 'multiple_choice') {
        const targetIdx = MCQ_TARGET_INDICES[mcqCounter % MCQ_TARGET_INDICES.length];
        mcqCounter += 1;
        const arranged = placeMcqCorrectAnswer(q.options, q.correct_answer, targetIdx);
        return {
          id: q.id,
          episode_id: lesson.episodeId,
          course_id: COURSE_ID,
          block_id: lesson.blockId,
          question_text: q.question_text,
          question_type: 'multiple_choice',
          options: arranged.options,
          correct_answer: arranged.correct_answer,
          explanation: q.explanation,
          skill: q.skill,
          concept: q.concept,
          difficulty: 'easy',
          points: 2,
          order_index: qIdx
        };
      }

      return {
        id: q.id,
        episode_id: lesson.episodeId,
        course_id: COURSE_ID,
        block_id: lesson.blockId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        skill: q.skill,
        concept: q.concept,
        difficulty: 'easy',
        points: 2,
        order_index: qIdx
      };
    });

    const { error: qErr } = await supabase
      .from('course_questions')
      .upsert(questionsToInsert, { onConflict: 'id' });
    if (qErr) {
      throw new Error(
        `Failed to upsert questions for lesson ${lesson.lessonNumber}: ${qErr.message}`
      );
    }

    const passageWordCount = lesson.readingPassage.trim().split(/\s+/).length;
    console.log(
      `   Lesson ${lesson.lessonNumber}: "${lesson.title}" | Short: ${lesson.videoId} | Reading: ${passageWordCount} words | Vocab: ${lesson.vocabulary.length} | Questions: ${questionsToInsert.length} (10 pts)`
    );
  }

  console.log(
    '=== Successfully seeded all 10 lessons of EdTechra Bitz – 10 Extraordinary Mysteries Explained! ==='
  );
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  seedExtraordinaryMysteriesCourse().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
