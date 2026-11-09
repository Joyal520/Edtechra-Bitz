import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const COURSE_ID = 'e10c7ee9-0010-4000-8000-000000000010';
const UNIT_ID = 'e10c7ee9-0010-4000-8001-000000000001';
const TEACHER_ID = '548eea36-a825-4c69-9ca3-89fc06218c39';

// Deterministic shuffle that guarantees the word order is never identical to the original sentence
function shuffleWordsDeterministic(words) {
  const arr = [...words];
  if (arr.length <= 1) return arr;
  // Swap adjacent pairs and reverse halves deterministically
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
  if (isIdentical) {
    return [...arr].reverse();
  }
  return swapped;
}

export const TEN_SHORTS_LESSONS = [
  {
    lessonNumber: 1,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000001',
    blockId: 'e10c7ee9-0010-4000-8003-000000000001',
    title: 'The Mothman – The Mysterious Creature of Point Pleasant',
    description:
      'Explore the 1966 Point Pleasant folklore legend of the winged creature with glowing red eyes.',
    videoUrl: 'https://www.youtube.com/shorts/MLZLIZo3YQI',
    subjectTopic: 'English (A1–A2) • Folklore & Legends',
    difficulty: 'easy',
    learningObjectives: [
      'Understand the 1966 Point Pleasant Mothman legend in simple English',
      'Distinguish between a local folklore legend and proven scientific facts',
      'Practice past simple comprehension and sentence word order'
    ],
    transcript:
      'In 1966, something strange was seen in Point Pleasant, West Virginia. Two young couples were driving near an old factory late at night. Suddenly, they saw a tall dark figure. It had large red eyes and huge wings. They were terrified. The creature looked almost like a man, but it was not human. People said it could fly very fast. Its red eyes seemed to shine in the darkness. Soon, more people began to report seeing the same strange creature. The reports spread across the town. Some people called the creature Mothman. Others believed it was a warning of something terrible. People became afraid to drive near the old factory at night. Then, something terrible happened. On December 15, 1967, the Silver Bridge collapsed. Forty-six people died. After the disaster, many people remembered the strange creature. They wondered if the Mothman sightings had been a warning. Even today, nobody knows what people really saw. Was it a strange animal? A legend? Or something we cannot explain? The Mothman mystery is still alive. And some people believe he may still be watching from the darkness.',
    readingPassage:
      'The Mothman is a famous American legend from Point Pleasant, West Virginia. In 1966, two young couples drove near an old factory late at night. They reported seeing a tall dark figure with huge wings and bright red eyes. Soon, many other people in the town said they saw the same strange creature. Some people believed the Mothman was a warning of danger. In December 1967, the Silver Bridge collapsed, and forty-six people died. Today, there is no scientific proof that the Mothman is real. Most experts believe people saw a large bird or shared a frightening local legend.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000101',
        question_type: 'multiple_choice',
        question_text: 'Where did people first report seeing the Mothman in 1966?',
        options: [
          'Point Pleasant, West Virginia',
          'Transylvania, Romania',
          'Paris, France',
          'Tokyo, Japan'
        ],
        correct_answer: 'Point Pleasant, West Virginia',
        explanation:
          'In 1966, witnesses reported seeing the Mothman near an old factory in Point Pleasant, West Virginia.',
        skill: 'Listening & Reading Comprehension',
        concept: 'Mothman Legend Setting'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000102',
        question_type: 'multiple_choice',
        question_text: 'How did witnesses describe the mysterious Mothman creature?',
        options: [
          'A tall dark figure with large red eyes and huge wings',
          'A small white dog near a river',
          'A traveler carrying a strange passport',
          'A glowing circle of green plants'
        ],
        correct_answer: 'A tall dark figure with large red eyes and huge wings',
        explanation:
          'Witnesses described seeing a tall dark figure with large shining red eyes and huge wings.',
        skill: 'Detail Recognition',
        concept: 'Creature Description'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000103',
        question_type: 'true_false',
        question_text:
          'The Mothman is a famous local legend, and nobody has proved what people really saw.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'Even today, nobody knows for sure what people saw in 1966, making the Mothman a famous legend rather than an established scientific fact.',
        skill: 'Fact vs Legend Verification',
        concept: 'Folklore Accuracy'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000104',
        question_type: 'fill_blank',
        question_text: 'On December 15, 1967, the Silver ______ collapsed in Point Pleasant.',
        correct_answer: 'Bridge',
        acceptable_answers: ['Bridge', 'bridge'],
        explanation: 'The Silver Bridge collapsed on December 15, 1967, in Point Pleasant.',
        skill: 'Key Vocabulary Recall',
        concept: 'Silver Bridge'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000105',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'The Mothman is a famous legend from West Virginia.',
        explanation: 'Correct sentence: "The Mothman is a famous legend from West Virginia."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 2,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000002',
    blockId: 'e10c7ee9-0010-4000-8003-000000000002',
    title: "Hoia-Baciu Forest – Romania's Most Mysterious Forest",
    description:
      'Visit the mysterious Hoia-Baciu Forest in Transylvania and learn about its famous circular clearing.',
    videoUrl: 'https://www.youtube.com/shorts/aaFQ8zAqn-4',
    subjectTopic: 'English (A1–A2) • Mysterious Places',
    difficulty: 'easy',
    learningObjectives: [
      'Read and understand simple descriptions of Hoia-Baciu Forest in Romania',
      'Identify key vocabulary about nature, fog, and the circular clearing',
      'Distinguish between visitor stories and unanswered scientific questions'
    ],
    transcript:
      'In the heart of Transylvania lies the Hoia-Baciu Forest, known as the Bermuda Triangle of Romania. Locals warn of morning fog, strange disorientation, and inexplicable phenomena. Step into the dense trees, and an unsettling quiet takes over. Visitors describe an overwhelming sensation that someone is watching from the shadows, while isolated paths lead hikers astray. At its center lies a mysterious dead zone: an almost perfect circular clearing where no trees or plants will grow, completely baffling scientists for decades. In 1968, a military technician photographed an ambiguous hovering object above the clearing. Decades later, historians and skeptics still ask: what did he see? At night, the forest vanishes into thick cold fog, where distant silhouettes appear and dissolve into the shadows. Science offers no answers, and the mystery continues.',
    readingPassage:
      'Hoia-Baciu is a famous forest in Transylvania, Romania. Many people call it the Bermuda Triangle of Romania because of its strange stories. Visitors say the forest feels very quiet and mysterious. Some hikers feel like someone is watching them from the dark shadows. In the middle of the forest, there is a round open space where trees and plants do not grow. In 1968, a military technician took a photo of a strange object in the sky above this clearing. Although many legends surround Hoia-Baciu Forest, historians and skeptics still ask what really happened there.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000201',
        question_type: 'multiple_choice',
        question_text: 'Where is the Hoia-Baciu Forest located?',
        options: [
          'In Transylvania, Romania',
          'In West Virginia, USA',
          'Between France and Spain',
          'In southern Australia'
        ],
        correct_answer: 'In Transylvania, Romania',
        explanation:
          'Hoia-Baciu Forest lies in the heart of Transylvania and is known as the Bermuda Triangle of Romania.',
        skill: 'Geographic Detail',
        concept: 'Hoia-Baciu Location'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000202',
        question_type: 'multiple_choice',
        question_text: 'What is unusual about the circular clearing in the center of the forest?',
        options: [
          'No trees or plants grow in the circular clearing',
          'It is covered in snow all year round',
          'There is a large airport in the clearing',
          'Hundreds of tall buildings stand there'
        ],
        correct_answer: 'No trees or plants grow in the circular clearing',
        explanation:
          'At the center of the forest is a circular clearing ("dead zone") where no trees or plants grow.',
        skill: 'Reading & Listening Comprehension',
        concept: 'Circular Clearing'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000203',
        question_type: 'true_false',
        question_text: 'Hoia-Baciu Forest is often called the Bermuda Triangle of Romania.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'The video and reading passage explain that Hoia-Baciu Forest is known as the Bermuda Triangle of Romania.',
        skill: 'Fact Verification',
        concept: 'Forest Nickname'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000204',
        question_type: 'fill_blank',
        question_text: 'The forest in this video is called ______.',
        correct_answer: 'Hoia-Baciu',
        acceptable_answers: ['Hoia-Baciu', 'Hoia Baciu', 'hoia-baciu', 'hoia baciu'],
        explanation: 'The mysterious forest in Transylvania, Romania is called Hoia-Baciu.',
        skill: 'Key Name Recall',
        concept: 'Hoia-Baciu'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000205',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'No trees grow in the center of the forest.',
        explanation: 'Correct sentence: "No trees grow in the center of the forest."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 3,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000003',
    blockId: 'e10c7ee9-0010-4000-8003-000000000003',
    title: 'The Man Who Came From Taured',
    description:
      'Uncover the famous airport mystery about a man carrying a passport from a country not on any map.',
    videoUrl: 'https://www.youtube.com/shorts/aI-oxEjDHns',
    subjectTopic: 'English (A1–A2) • Urban Mysteries',
    difficulty: 'easy',
    learningObjectives: [
      'Understand the popular internet mystery of the Man from Taured',
      'Learn why researchers consider the Taured story an unverified legend built around a 1950s case',
      'Practice travel and geography vocabulary in simple English'
    ],
    transcript:
      "A man arrived at an airport carrying a passport from a country called Taured. The strange part? Nobody could find Taured on the map. According to the famous story, he told officials that Taured was a real country somewhere between France and Spain. But the location he pointed to was actually Andorra. The story says officials became confused and placed him in a guarded hotel room while they investigated. The next morning, according to the legend, the mysterious man was gone. No reliable evidence has confirmed the popular version of this story. Some researchers connect it to a real 1950s case involving a man named John Zegrus, whose unusual passport story was later greatly expanded online. So, did a man really come from a country called Taured? The evidence suggests the famous story is probably a mystery built around a real case. But the legend remains one of the internet's strangest stories.",
    readingPassage:
      'The story of the Man from Taured is a popular internet mystery. According to the legend, a traveler arrived at an airport with a passport from a country called Taured. Airport officers looked at a map, but Taured did not exist. The man pointed to a place between France and Spain, which was actually the country of Andorra. In the story, guards put him in a hotel room, and he disappeared the next morning. However, no reliable evidence confirms this popular story. Researchers connect it to a real 1950s case involving a man named John Zegrus.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000301',
        question_type: 'multiple_choice',
        question_text: 'According to the story, where did the traveler say Taured was located?',
        options: [
          'Between France and Spain',
          'Between Canada and the United States',
          'Next to Romania',
          'On a small island near Japan'
        ],
        correct_answer: 'Between France and Spain',
        explanation:
          'He told officials that Taured was between France and Spain, pointing to the real country of Andorra.',
        skill: 'Detail Comprehension',
        concept: 'Taured Map Location'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000302',
        question_type: 'multiple_choice',
        question_text: 'What do researchers say about the popular story of the Man from Taured?',
        options: [
          'No reliable evidence confirms it, and it probably grew from a real 1950s passport case',
          'Taured is a real country that joined the United Nations in 1960',
          'Every airport officer took photographs of the country of Taured',
          'The man built a new airport in Andorra'
        ],
        correct_answer:
          'No reliable evidence confirms it, and it probably grew from a real 1950s passport case',
        explanation:
          'Researchers note that no reliable evidence confirms the legend and connect it to a 1950s case involving John Zegrus.',
        skill: 'Critical Reading',
        concept: 'Mystery vs Evidence'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000303',
        question_type: 'true_false',
        question_text:
          'The location the man pointed to on the map between France and Spain was actually Andorra.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'The spot between France and Spain that he pointed to on the map is actually Andorra.',
        skill: 'Fact Verification',
        concept: 'Andorra Geography'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000304',
        question_type: 'fill_blank',
        question_text: 'The traveler at the airport carried a passport from a country called ______.',
        correct_answer: 'Taured',
        acceptable_answers: ['Taured', 'taured'],
        explanation: 'According to the famous mystery, the passport said he was from a country called Taured.',
        skill: 'Key Term Recall',
        concept: 'Taured'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000305',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'Nobody could find the country on the map.',
        explanation: 'Correct sentence: "Nobody could find the country on the map."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 4,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000004',
    blockId: 'e10c7ee9-0010-4000-8003-000000000004',
    title: 'The Sleep Paralysis Demon',
    description:
      'Learn the science behind sleep paralysis, when your mind wakes up while your body is still asleep.',
    videoUrl: 'https://www.youtube.com/shorts/yUEutE5egkU',
    subjectTopic: 'English (A1–A2) • Sleep Science',
    difficulty: 'easy',
    learningObjectives: [
      'Understand what happens during the recognized sleep phenomenon of sleep paralysis',
      'Explain why people feel frozen and sometimes see scary dream figures',
      'Use simple present sentences to describe sleep and waking states'
    ],
    transcript:
      'Have you ever woken up... but could not move? You can see your room. You can hear everything. But your body feels completely frozen. This is called sleep paralysis. And for some people... something much worse appears. People have reported seeing a dark figure standing beside their bed. Some say it watches them. Others say... it slowly moves closer. Your mind is awake, but your body is still asleep. The room can feel strange. Sounds become louder. Shadows seem to move. And the fear feels completely real. Then... you finally wake up. The room looks normal. But what if the thing you saw... was not just a dream? Would you go back to sleep?',
    readingPassage:
      'Sleep paralysis is a real and recognized sleep phenomenon. It happens when your mind wakes up, but your body stays asleep for a short time. During sleep paralysis, you can see your bedroom and hear sounds, but your body feels completely frozen. Because your brain is still partly dreaming, you may see a dark figure standing beside your bed. This frightening vision is often called the sleep paralysis demon. Even though the fear feels very real, no monster is actually in the room. Once your body wakes up completely, the room looks normal again.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000401',
        question_type: 'multiple_choice',
        question_text: 'What happens to your mind and body during sleep paralysis?',
        options: [
          'Your mind is awake, but your body is still asleep and cannot move',
          'Your body walks around the house while your eyes are closed',
          'You sleep for three days without waking up',
          'You hear a loud explosion outside the house'
        ],
        correct_answer: 'Your mind is awake, but your body is still asleep and cannot move',
        explanation:
          'During sleep paralysis, your mind wakes up while your body remains temporarily frozen in sleep.',
        skill: 'Concept Comprehension',
        concept: 'Sleep Paralysis Mechanism'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000402',
        question_type: 'multiple_choice',
        question_text: 'What have some people reported seeing beside their bed during sleep paralysis?',
        options: [
          'A dark figure standing near the bed',
          'A bright rainbow on the ceiling',
          'An airport officer checking passports',
          'A circular forest clearing'
        ],
        correct_answer: 'A dark figure standing near the bed',
        explanation:
          'Some people report seeing a dark dream-like figure standing beside their bed while their body is still asleep.',
        skill: 'Detail Recognition',
        concept: 'Sleep Paralysis Hallucinations'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000403',
        question_type: 'true_false',
        question_text:
          'During sleep paralysis, you can see your room and hear sounds, even though your body feels frozen.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'The video explains that you can see your room and hear everything, but your body feels completely frozen.',
        skill: 'Fact Verification',
        concept: 'Sensory Awareness'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000404',
        question_type: 'fill_blank',
        question_text: 'Waking up while your body feels completely frozen is called sleep ______.',
        correct_answer: 'paralysis',
        acceptable_answers: ['paralysis', 'Paralysis'],
        explanation: 'This recognized sleep phenomenon is called sleep paralysis.',
        skill: 'Key Term Recall',
        concept: 'Sleep Paralysis'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000405',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'Your mind is awake but your body is asleep.',
        explanation: 'Correct sentence: "Your mind is awake but your body is asleep."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 5,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000005',
    blockId: 'e10c7ee9-0010-4000-8003-000000000005',
    title: 'False Awakening – Have You Ever Woken Up But Were Still Dreaming?',
    description:
      'Discover what happens during a false awakening, when a dream convinces you that you have already woken up.',
    videoUrl: 'https://www.youtube.com/shorts/qI0mLNtfKQs',
    subjectTopic: 'English (A1–A2) • Dream Phenomena',
    difficulty: 'easy',
    learningObjectives: [
      'Understand what a false awakening dream experience is',
      'Recognize everyday bedroom vocabulary in A1–A2 English',
      'Explain why a false awakening feels like real waking life'
    ],
    transcript:
      "Have you ever woken up... and thought you were finally awake? Everything looks normal. Your room. Your bed. Your phone. But something feels... wrong. You get out of bed. You walk around your room. Everything looks exactly the way it should. Then you notice something strange. You go back to your bedroom. And suddenly... you see yourself. Still sleeping in your bed. You panic. Then you wake up again. Same room. Same bed. Same time. But this time... you know something is wrong. You look around. The room starts to change. And then you realize... Maybe the dream knows that you're awake. False awakenings can happen during dreams. You can believe you've woken up... even though you're still dreaming. And sometimes... the dream can feel completely real. So if you wake up tonight... how will you know you're actually awake?",
    readingPassage:
      'A false awakening is a strange dream experience. In a false awakening, you believe that you have woken up in the morning. Your bedroom, your bed, and your phone all look completely normal. You may dream that you get out of bed and walk around your room. Suddenly, you notice that something feels wrong, and then you wake up again in the same bed. This happens because you were still sleeping inside a vivid dream. False awakenings are natural dream experiences, even though they can feel completely real while you are asleep.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000501',
        question_type: 'multiple_choice',
        question_text: 'What is a false awakening?',
        options: [
          'A dream experience where you believe you have woken up, even though you are still dreaming',
          'Staying awake all night to study for an exam',
          'Walking through a dark forest in Romania',
          'Hearing an alarm clock in the afternoon'
        ],
        correct_answer:
          'A dream experience where you believe you have woken up, even though you are still dreaming',
        explanation:
          'A false awakening happens during a dream when you believe you have woken up, but you are still asleep.',
        skill: 'Concept Definition',
        concept: 'False Awakening'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000502',
        question_type: 'multiple_choice',
        question_text: 'Why does a false awakening feel so real at first?',
        options: [
          'Your room, your bed, and your phone look normal inside the dream',
          'You are standing at an international airport',
          'Someone is shouting outside your window',
          'The lights in the city are turned off'
        ],
        correct_answer: 'Your room, your bed, and your phone look normal inside the dream',
        explanation:
          'At first, your bedroom, bed, and phone look completely normal, so you think you are really awake.',
        skill: 'Reading & Listening Detail',
        concept: 'Dream Realism'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000503',
        question_type: 'true_false',
        question_text: 'During a false awakening, a person is actually still dreaming.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'Even though you think you woke up, a false awakening happens while you are still dreaming.',
        skill: 'Fact Verification',
        concept: 'Dream State'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000504',
        question_type: 'fill_blank',
        question_text:
          'Believing you have woken up while you are still dreaming is called a false ______.',
        correct_answer: 'awakening',
        acceptable_answers: ['awakening', 'Awakening', 'awakenings'],
        explanation: 'This dream experience is called a false awakening.',
        skill: 'Key Term Recall',
        concept: 'False Awakening'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000505',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'You think you are awake but you are dreaming.',
        explanation: 'Correct sentence: "You think you are awake but you are dreaming."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 6,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000006',
    blockId: 'e10c7ee9-0010-4000-8003-000000000006',
    title: 'Exploding Head Syndrome – The Explosion You Hear at 3 AM',
    description:
      'Learn why the brain can create the sound of a loud explosion or crash when switching between sleep and wakefulness.',
    videoUrl: 'https://www.youtube.com/shorts/eNXr3lqJZ_E',
    subjectTopic: 'English (A1–A2) • Sleep Phenomena',
    difficulty: 'easy',
    learningObjectives: [
      'Understand the recognized sleep phenomenon called Exploding Head Syndrome',
      'Learn why people hear loud imaginary sounds when switching between sleep and waking',
      'Practice negative statements and sleep vocabulary in simple English'
    ],
    transcript:
      "Imagine you're asleep... Everything is quiet. Then suddenly... You hear a massive explosion. You jump out of bed. Your heart is racing. But... There is nothing there. You check your phone. You look around the room. Nothing. Nobody heard it. You check the window. You check the door. You check outside. Nothing exploded. Because... the explosion wasn't real. It's called... Exploding Head Syndrome. It can happen when your brain is switching... between sleep and wakefulness. People may hear explosions, crashes, bangs, or even gunshots. The sound can feel completely real. But nothing actually happened. And that's what makes it so terrifying.",
    readingPassage:
      'Exploding Head Syndrome is a real and recognized sleep phenomenon. A person is sleeping quietly in bed and suddenly hears a loud noise, like an explosion, a crash, or a gunshot. The person jumps out of bed with a fast heartbeat and checks the room, the window, and the door. However, nothing outside actually exploded, and nobody else heard the sound. Scientists explain that this happens when the brain is switching between sleep and wakefulness. Even though the loud sound feels completely real, nothing dangerous happened in the house.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000601',
        question_type: 'multiple_choice',
        question_text: 'What happens during Exploding Head Syndrome?',
        options: [
          'A person hears a loud imaginary sound like an explosion or crash while sleeping or waking',
          'A real thunderstorm breaks the bedroom window',
          'Neighbors play loud music in the street all night',
          'A person walks in their sleep into the kitchen'
        ],
        correct_answer:
          'A person hears a loud imaginary sound like an explosion or crash while sleeping or waking',
        explanation:
          'People with Exploding Head Syndrome hear loud imaginary noises like explosions, crashes, or bangs when nothing actually happened.',
        skill: 'Concept Understanding',
        concept: 'Exploding Head Syndrome'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000602',
        question_type: 'multiple_choice',
        question_text: 'When does Exploding Head Syndrome happen?',
        options: [
          'When the brain is switching between sleep and wakefulness',
          'While eating lunch in the afternoon',
          'Only when running outside in the morning',
          'When reading a map at an airport'
        ],
        correct_answer: 'When the brain is switching between sleep and wakefulness',
        explanation:
          'The video explains that it happens when your brain is switching between sleep and wakefulness.',
        skill: 'Cause & Timing',
        concept: 'Sleep-Wake Transition'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000603',
        question_type: 'true_false',
        question_text:
          'In Exploding Head Syndrome, the loud explosion sound feels real, but nothing actually exploded outside.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'The sound feels completely real to the sleeper, but nothing actually exploded.',
        skill: 'Fact Verification',
        concept: 'Auditory Sleep Phenomenon'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000604',
        question_type: 'fill_blank',
        question_text:
          'Hearing an imaginary explosion while waking up is called Exploding ______ Syndrome.',
        correct_answer: 'Head',
        acceptable_answers: ['Head', 'head'],
        explanation: 'This recognized sleep phenomenon is called Exploding Head Syndrome.',
        skill: 'Key Term Recall',
        concept: 'Exploding Head Syndrome'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000605',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'The loud explosion sound was not real.',
        explanation: 'Correct sentence: "The loud explosion sound was not real."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 7,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000007',
    blockId: 'e10c7ee9-0010-4000-8003-000000000007',
    title: 'The Shadow Person You See at 3 AM',
    description:
      'Find out why a tired brain between sleep and wakefulness can create the illusion of a shadow person in the corner of your room.',
    videoUrl: 'https://www.youtube.com/shorts/CFrIxWFAw8A',
    subjectTopic: 'English (A1–A2) • Brain & Sleep Science',
    difficulty: 'easy',
    learningObjectives: [
      'Understand why people sometimes see shadow figures when waking up at night',
      'Learn the meaning of the word hallucination in simple A1–A2 English',
      'Recognize that shadow figures during sleep paralysis are created by a dreaming brain'
    ],
    transcript:
      "Imagine waking up at three in the morning. You look toward the corner of your room... And someone is standing there. You freeze. You stare at it. It doesn't move. You look away for just a second... Then look back. Now it's closer. But here's the terrifying part... There may be nobody there. Some people experience this during the strange space between sleeping and waking. The brain can create vivid images... voices... or even the feeling that someone is standing in the room. During sleep paralysis, this can become especially frightening. Your mind is awake... but part of your sleep experience may still be there. So that shadow in the corner? It can feel completely real. But the frightening figure may actually be a hallucination created during the transition between sleep and wakefulness. Your brain wasn't showing you a monster. It was still dreaming.",
    readingPassage:
      'Sometimes people wake up at 3 AM and think they see a dark shadow person standing in the corner of their room. When they look back, the shape seems closer. This experience feels terrifying, but nobody is actually standing there. Scientists explain that this happens in the space between sleeping and waking. When your mind is awake but part of your brain is still dreaming, your brain can create vivid images or voices. This frightening shadow figure is a hallucination, not a real monster in your bedroom.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000701',
        question_type: 'multiple_choice',
        question_text: 'According to the video, what is the shadow person standing in the corner of the room?',
        options: [
          'A hallucination created by the brain between sleeping and waking',
          'A real thief hiding inside the bedroom',
          'A neighbor visiting at three in the morning',
          'A statue made of stone'
        ],
        correct_answer: 'A hallucination created by the brain between sleeping and waking',
        explanation:
          'The frightening figure is a hallucination created during the transition between sleep and wakefulness.',
        skill: 'Scientific Explanation',
        concept: 'Sleep-Wake Hallucination'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000702',
        question_type: 'multiple_choice',
        question_text: 'Why does the shadow figure in the room feel so real and frightening?',
        options: [
          'Because your mind is awake while part of your brain is still dreaming',
          'Because the bedroom window is broken',
          'Because it only happens in the middle of the afternoon',
          'Because everyone in the street can see it too'
        ],
        correct_answer: 'Because your mind is awake while part of your brain is still dreaming',
        explanation:
          'During sleep paralysis or the transition from sleep, your mind is awake while part of your sleep experience is still active.',
        skill: 'Cause & Effect',
        concept: 'Dreaming Brain'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000703',
        question_type: 'true_false',
        question_text:
          'The video explains that your brain was not showing you a real monster; it was still dreaming.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'As the video concludes: "Your brain wasn\'t showing you a monster. It was still dreaming."',
        skill: 'Fact Verification',
        concept: 'Hallucination vs Monster'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000704',
        question_type: 'fill_blank',
        question_text:
          'A frightening image created by the brain between sleep and wakefulness is called a ______.',
        correct_answer: 'hallucination',
        acceptable_answers: ['hallucination', 'Hallucination'],
        explanation: 'A vivid image created by the mind when nothing is there is a hallucination.',
        skill: 'Key Term Recall',
        concept: 'Hallucination'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000705',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'Your brain was still dreaming in the dark.',
        explanation: 'Correct sentence: "Your brain was still dreaming in the dark."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 8,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000008',
    blockId: 'e10c7ee9-0010-4000-8003-000000000008',
    title: 'You Wake Up and Everyone Is a Zombie',
    description:
      'Compare fictional movie zombies with the real biology of fungi that can change insect behavior.',
    videoUrl: 'https://www.youtube.com/shorts/q_C6TRmrO4Y',
    subjectTopic: 'English (A1–A2) • Fiction vs Biology',
    difficulty: 'easy',
    learningObjectives: [
      'Distinguish between fictional movie zombies and real nature science',
      'Learn how certain fungi like Cordyceps can change the behavior of insects such as ants',
      'Practice reading and answering comprehension questions in A1–A2 English'
    ],
    transcript:
      "Imagine waking up one morning... and realizing something is wrong. You walk outside. Everyone around you is acting strangely. Then one of them looks at you... and starts running. You run too. But then another person starts chasing you. Then another. Suddenly, the entire street is running after you. You look behind you... and there are hundreds of them. Cars are abandoned. People are screaming. The city is collapsing. This is what we imagine as... a zombie apocalypse. But here's the creepy part. Zombies aren't real. Not the way movies show them. But nature does have something strangely similar. Some fungi can manipulate the behavior of insects. One famous example infects ants... and changes their behavior before the fungus reproduces. So no... a Cordyceps zombie apocalypse isn't happening to humans. But the idea isn't completely fictional. Nature already has its own version.",
    readingPassage:
      'In scary movies, a person wakes up and sees hundreds of zombies chasing people through the city streets. However, a human zombie apocalypse is fictional. Zombies from movies are not real. Still, nature has something strangely similar in the insect world. Certain fungi, such as Cordyceps, can infect insects like ants. The fungus changes the behavior of the ant before the fungus reproduces. While this is a real biological process in insects, a Cordyceps zombie apocalypse is not happening to humans. Nature simply has its own strange version for insects.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000801',
        question_type: 'multiple_choice',
        question_text: 'What does the lesson say about a human zombie apocalypse like the ones in movies?',
        options: [
          'Movie zombies are fictional and a zombie apocalypse is not happening to humans',
          'Every big city has real human zombies',
          'Humans turn into zombies when they do not sleep',
          'Cordyceps fungi turn humans into runners'
        ],
        correct_answer:
          'Movie zombies are fictional and a zombie apocalypse is not happening to humans',
        explanation:
          'The video clearly states that movie zombies are not real and a Cordyceps zombie apocalypse is not happening to humans.',
        skill: 'Fiction vs Fact',
        concept: 'Movie Zombies vs Reality'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000802',
        question_type: 'multiple_choice',
        question_text: 'What real organism in nature can change the behavior of insects such as ants?',
        options: [
          'Certain fungi, such as Cordyceps',
          'Ordinary garden flowers',
          'Small river fish',
          'Desert rocks'
        ],
        correct_answer: 'Certain fungi, such as Cordyceps',
        explanation:
          'Some fungi in nature, such as Cordyceps, infect insects like ants and manipulate their behavior.',
        skill: 'Science Comprehension',
        concept: 'Insect-Manipulating Fungi'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000803',
        question_type: 'true_false',
        question_text: 'Some real fungi in nature can infect ants and change their behavior.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'One famous fungus infects ants and changes their behavior before the fungus reproduces.',
        skill: 'Fact Verification',
        concept: 'Ant Behavior Manipulation'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000804',
        question_type: 'fill_blank',
        question_text: 'The famous fungus mentioned in the video is called ______.',
        correct_answer: 'Cordyceps',
        acceptable_answers: ['Cordyceps', 'cordyceps'],
        explanation: 'The video names Cordyceps as the famous fungus that infects ants.',
        skill: 'Key Term Recall',
        concept: 'Cordyceps'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000805',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'Some fungi can change the behavior of insects.',
        explanation: 'Correct sentence: "Some fungi can change the behavior of insects."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 9,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000009',
    blockId: 'e10c7ee9-0010-4000-8003-000000000009',
    title: 'Never Look Under Your Bed at 3 AM',
    description:
      'Practice English comprehension with a short suspense story about hearing a strange noise at 3 AM.',
    videoUrl: 'https://www.youtube.com/shorts/PI4_8hvkBYc',
    subjectTopic: 'English (A1–A2) • Suspense Storytelling',
    difficulty: 'easy',
    learningObjectives: [
      'Follow the sequence of events in a short fictional horror story',
      'Practice prepositions of place (under, behind, out of) in simple English',
      'Recognize how short suspense stories use a surprise twist ending'
    ],
    transcript:
      "It's 3 AM. You're lying in bed... when you hear something under you. You tell yourself it's nothing. Maybe it's just the house. But then... you hear it again. So you slowly look under the bed. And that's when you see it. Something is staring back at you. You freeze. Then... it moves. You run out of the room. But here's the scary part... What if it was never under the bed? What if it was already behind you?",
    readingPassage:
      '"Never Look Under Your Bed at 3 AM" is a short fictional horror story told for suspense. In the story, you are lying in bed at 3 AM when you hear a strange sound under you. At first, you think it is just a normal house sound. Then you hear the noise again. You slowly look under the bed and see something staring back at you. When it moves, you run out of the room. At the end, the story asks a spooky twist question: what if it was already behind you?',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000000901',
        question_type: 'multiple_choice',
        question_text: 'In the story, what happens first at 3 AM while you are lying in bed?',
        options: [
          'You hear a sound under the bed',
          'You go outside to drive your car',
          'You receive a phone call from a friend',
          'You turn on the television'
        ],
        correct_answer: 'You hear a sound under the bed',
        explanation: 'At 3 AM, you are lying in bed when you hear something under you.',
        skill: 'Sequence of Events',
        concept: 'Story Opening'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000902',
        question_type: 'multiple_choice',
        question_text: 'What is the surprise twist question at the very end of the story?',
        options: [
          'What if it was never under the bed, and was already behind you?',
          'What if it was just a friendly cat in the kitchen?',
          'What if it was already morning outside?',
          'What if the bed was in a hotel room?'
        ],
        correct_answer: 'What if it was never under the bed, and was already behind you?',
        explanation:
          'The story ends with the spooky twist: "What if it was never under the bed? What if it was already behind you?"',
        skill: 'Story Ending Comprehension',
        concept: 'Suspense Twist'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000903',
        question_type: 'true_false',
        question_text:
          'In the story, you run out of the room after the thing under the bed moves.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'When you look under the bed, something stares back at you, moves, and you run out of the room.',
        skill: 'Fact Verification',
        concept: 'Story Action'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000904',
        question_type: 'fill_blank',
        question_text: 'In this story, you slowly look under the ______ at 3 AM.',
        correct_answer: 'bed',
        acceptable_answers: ['bed', 'Bed'],
        explanation: 'The story is about looking under the bed at 3 AM.',
        skill: 'Key Vocabulary Recall',
        concept: 'Bedroom Vocabulary'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000000905',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'You hear a strange sound under your bed.',
        explanation: 'Correct sentence: "You hear a strange sound under your bed."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  },
  {
    lessonNumber: 10,
    episodeId: 'e10c7ee9-0010-4000-8002-000000000010',
    blockId: 'e10c7ee9-0010-4000-8003-000000000010',
    title: 'Night Terrors – Someone Is Screaming in Their Sleep',
    description:
      'Learn how night terrors happen during deep NREM sleep and why they are different from ordinary nightmares.',
    videoUrl: 'https://www.youtube.com/shorts/1QKQ1PUzoFw',
    subjectTopic: 'English (A1–A2) • Sleep Science',
    difficulty: 'easy',
    learningObjectives: [
      'Understand what happens during a night terror in deep NREM sleep',
      'Learn why night terrors are different from ordinary nightmares',
      'Know why a person usually remembers almost nothing the next morning'
    ],
    transcript:
      "Imagine waking up in the middle of the night because someone is screaming. You rush into the bedroom. But what you see is even stranger. His eyes are wide open. He's sweating. He's screaming. But somehow, he doesn't seem to recognise you. You try to wake him. He pushes you away. He looks terrified, but he isn't responding normally. It feels as if he's trapped somewhere between sleep and wakefulness. Then suddenly, he gets out of bed. He's looking at something you cannot see. But there is nothing there. Nothing you can explain. The next morning, he wakes up normally. You ask him what happened last night. He looks confused. He remembers almost nothing. This is called a night terror. It happens during deep NREM sleep, when the brain partially wakes but doesn't become fully conscious. The person may scream, move and appear terrified, then remember almost nothing. It's not a nightmare. It's a different sleep phenomenon.",
    readingPassage:
      'A night terror is a real sleep phenomenon that is different from an ordinary nightmare. During a night terror, a person may scream, sweat, and sit up with their eyes wide open. Even though their eyes are open, they are trapped between sleep and wakefulness and do not recognize people around them. Night terrors happen during deep NREM sleep when the brain only partly wakes up. The next morning, the person wakes up normally and remembers almost nothing. Although night terrors look frightening, they are a recognized medical sleep event.',
    questions: [
      {
        id: 'e10c7ee9-0010-4000-8004-000000001001',
        question_type: 'multiple_choice',
        question_text: 'When does a night terror happen?',
        options: [
          'During deep NREM sleep when the brain partially wakes up',
          'When a person is wide awake eating breakfast',
          'Only when someone is watching television',
          'While walking to school in the morning'
        ],
        correct_answer: 'During deep NREM sleep when the brain partially wakes up',
        explanation:
          'A night terror happens during deep NREM sleep when the brain partially wakes but does not become fully conscious.',
        skill: 'Science Comprehension',
        concept: 'Deep NREM Sleep'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000001002',
        question_type: 'multiple_choice',
        question_text: 'What does a person usually remember the next morning after a night terror?',
        options: [
          'They remember almost nothing about what happened',
          'They remember every single word clearly',
          'They write a long story about their dream',
          'They remember visiting another country'
        ],
        correct_answer: 'They remember almost nothing about what happened',
        explanation:
          'The next morning, the person wakes up normally, looks confused, and remembers almost nothing.',
        skill: 'Detail Recognition',
        concept: 'Morning Memory'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000001003',
        question_type: 'true_false',
        question_text: 'A night terror is a different sleep phenomenon from an ordinary nightmare.',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation:
          'As the video explains: "It\'s not a nightmare. It\'s a different sleep phenomenon."',
        skill: 'Fact Verification',
        concept: 'Night Terror vs Nightmare'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000001004',
        question_type: 'fill_blank',
        question_text:
          'Screaming during deep sleep without becoming fully awake is called a night ______.',
        correct_answer: 'terror',
        acceptable_answers: ['terror', 'Terror', 'terrors'],
        explanation: 'This sleep phenomenon is called a night terror.',
        skill: 'Key Term Recall',
        concept: 'Night Terror'
      },
      {
        id: 'e10c7ee9-0010-4000-8004-000000001005',
        question_type: 'sentence_reordering',
        question_text: 'Arrange the words to make a correct sentence about the lesson:',
        sentence: 'Night terrors happen during deep sleep at night.',
        explanation: 'Correct sentence: "Night terrors happen during deep sleep at night."',
        skill: 'Sentence Structure',
        concept: 'Word Reordering'
      }
    ]
  }
];

async function seedCourse() {
  console.log('=== Seeding Course: EdTechra Bitz – Creepy Legends & Strange Mysteries ===');

  // 1. Upsert the Course record
  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .upsert(
      {
        id: COURSE_ID,
        teacher_id: TEACHER_ID,
        title: 'EdTechra Bitz – Creepy Legends & Strange Mysteries',
        short_description:
          'Explore ten mysterious stories, strange events and fascinating phenomena through short videos, simple English reading passages and interactive challenges.',
        subject: 'English (A1–A2) • Mysteries & Science',
        grade_level: 'A1–A2',
        course_type: 'full',
        status: 'published',
        cover_image_url:
          'https://pub-5b308f0d53ca4cf3bf3ad3630d2b86d5.r2.dev/courses/e10c7ee9-0010-4000-8000-000000000010/covers/548eea36-a825-4c69-9ca3-89fc06218c39/1794204587944_6bf46262.webp#pos=50,38',
        cover_image_key:
          'courses/e10c7ee9-0010-4000-8000-000000000010/covers/548eea36-a825-4c69-9ca3-89fc06218c39/1794204587944_6bf46262.webp',
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
        title: 'Unit 1: Creepy Legends & Strange Mysteries',
        description:
          'Explore ten mysterious stories, strange events and fascinating phenomena through vertical YouTube Shorts, A1–A2 reading passages and five-question interactive challenges.',
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

  // Clean up any stale episodes/blocks/questions ONLY for this course ID (never touch any other course!)
  await supabase.from('course_questions').delete().eq('course_id', COURSE_ID);
  await supabase.from('course_blocks').delete().eq('course_id', COURSE_ID);
  await supabase
    .from('course_episodes')
    .delete()
    .eq('course_id', COURSE_ID)
    .not('id', 'in', `(${TEN_SHORTS_LESSONS.map((l) => l.episodeId).join(',')})`);

  // 3. Upsert each of the 10 Lessons (Episodes + Learn with Shorts Block + 5 Questions)
  for (let i = 0; i < TEN_SHORTS_LESSONS.length; i++) {
    const lesson = TEN_SHORTS_LESSONS[i];

    // 3a. Upsert Episode
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

    // 3b. Insert Learn with Shorts Block
    const blockContent = {
      _block_type: 'learn_with_shorts',
      is_learn_with_shorts: true,
      aspect_ratio: '9:16',
      title: lesson.title,
      description: lesson.description,
      video_url: lesson.videoUrl,
      url: lesson.videoUrl,
      transcript: lesson.transcript,
      show_transcript: false, // Strictly teacher-only! Never displayed to students.
      reading_passage: lesson.readingPassage,
      subject_topic: lesson.subjectTopic,
      difficulty: lesson.difficulty,
      learning_objectives: lesson.learningObjectives,
      video: {
        title: lesson.title,
        description: lesson.description,
        url: lesson.videoUrl,
        aspect_ratio: '9:16',
        transcript: lesson.transcript,
        show_transcript: false
      }
    };

    let blockInsertRes = await supabase.from('course_blocks').insert({
      id: lesson.blockId,
      episode_id: lesson.episodeId,
      course_id: COURSE_ID,
      block_type: 'learn_with_shorts',
      order_index: 0,
      content: blockContent
    });

    if (
      blockInsertRes.error &&
      (blockInsertRes.error.code === '23514' ||
        String(blockInsertRes.error.message || '').includes('course_blocks_block_type_check'))
    ) {
      // Fallback to 'youtube_short' while preserving _block_type: 'learn_with_shorts'
      blockInsertRes = await supabase.from('course_blocks').insert({
        id: lesson.blockId,
        episode_id: lesson.episodeId,
        course_id: COURSE_ID,
        block_type: 'youtube_short',
        order_index: 0,
        content: blockContent
      });
    }

    if (blockInsertRes.error) {
      throw new Error(
        `Failed to insert block for lesson ${lesson.lessonNumber}: ${blockInsertRes.error.message}`
      );
    }

    // 3c. Insert the 5 Questions (2 marks each = 10 marks total)
    const questionsToInsert = lesson.questions.map((q, qIdx) => {
      if (q.question_type === 'sentence_reordering') {
        const canonicalWords = q.sentence.trim().split(/\s+/);
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

    const { error: qErr } = await supabase.from('course_questions').insert(questionsToInsert);
    if (qErr) {
      throw new Error(`Failed to insert questions for lesson ${lesson.lessonNumber}: ${qErr.message}`);
    }

    const passageWordCount = lesson.readingPassage.trim().split(/\s+/).length;
    console.log(
      `   Lesson ${lesson.lessonNumber}: "${lesson.title}" | URL: ${lesson.videoUrl} | Reading: ${passageWordCount} words | Questions: ${questionsToInsert.length} (10 marks)`
    );
  }

  console.log('=== Successfully seeded all 10 lessons of EdTechra Bitz – Creepy Legends & Strange Mysteries! ===');
}

seedCourse().catch((err) => {
  console.error(err);
  process.exit(1);
});
