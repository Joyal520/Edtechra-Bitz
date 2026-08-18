// ============================================================================
// ELEKTRA BITZ — LEVELS 1-20 SOURCE OF TRUTH DATA
// Generated from authoritative Markdown content. DO NOT MODIFY DIRECTLY.
// ============================================================================

import type { QuizQuestion } from '../types/index.ts';

export interface LevelDefinition {
  levelNumber: number;
  title: string;
  youtubeVideoId: string;
  explanation: string;
  questions: QuizQuestion[];
}

export type LevelStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export const ELEKTRA_LEVELS_1_20: LevelDefinition[] = [
  {
    "levelNumber": 1,
    "title": "Fix Small Problems Before They Become Big",
    "youtubeVideoId": "Xj3gbHlFQEo",
    "explanation": "Small problems are easier to fix when we notice them early. A small mistake can become a bigger problem if we ignore it. For example, a small crack in a wall may grow. In life, early action can save time, money, and stress. When you see a problem, solve it.",
    "questions": [
      {
        "id": "l1_q1",
        "question": "Why is it better to fix a small problem early?",
        "options": [
          {
            "id": "opt_a",
            "text": "It disappears by itself",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "It becomes more fun",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "It can become bigger",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "It needs more time",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. It can become bigger"
      },
      {
        "id": "l1_q2",
        "question": "What can early action save?",
        "options": [
          {
            "id": "opt_a",
            "text": "Time, money, and stress",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Nothing",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Only food",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Only books",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. Time, money, and stress"
      },
      {
        "id": "l1_q3",
        "question": "What should you do when you see a problem?",
        "options": [
          {
            "id": "opt_a",
            "text": "Hide it",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Make it bigger",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Ignore it",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Try to solve it",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. Try to solve it"
      }
    ]
  },
  {
    "levelNumber": 2,
    "title": "Why Is TV Called the “Idiot Box”?",
    "youtubeVideoId": "QoiXpyzzPPA",
    "explanation": "Some people call television the “idiot box” because they believe watching too much TV can make people passive. The phrase criticizes television, not every viewer. TV can be useful for learning and news. However, too much screen time may reduce time for reading, thinking, exercise, and daily activities and schoolwork.",
    "questions": [
      {
        "id": "l2_q1",
        "question": "Why do some people call TV the “idiot box”?",
        "options": [
          {
            "id": "opt_a",
            "text": "It teaches every subject",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "They think too much TV can make people passive",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "It is made of wood",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "It is very small",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. They think too much TV can make people passive"
      },
      {
        "id": "l2_q2",
        "question": "Can television be useful?",
        "options": [
          {
            "id": "opt_a",
            "text": "Only for children",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Only at night",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Yes, it can help people learn",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "No, never",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Yes, it can help people learn"
      },
      {
        "id": "l2_q3",
        "question": "What can too much TV reduce?",
        "options": [
          {
            "id": "opt_a",
            "text": "Time for reading and activity",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Sleep only",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Food only",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "The size of a TV",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. Time for reading and activity"
      }
    ]
  },
  {
    "levelNumber": 3,
    "title": "What If Gravity Suddenly Went to Zero?",
    "youtubeVideoId": "9I0-lpeaAiE",
    "explanation": "Gravity keeps people, air, water, and objects close to Earth. If gravity suddenly became zero, people and objects would begin to float. Water could leave the oceans, and air could move away from Earth. Buildings and machines would also have serious problems. Gravity is very important for life and Earth.",
    "questions": [
      {
        "id": "l3_q1",
        "question": "What does gravity help keep close to Earth?",
        "options": [
          {
            "id": "opt_a",
            "text": "Only cars",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "People, air, and water",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Only animals",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Only buildings",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. People, air, and water"
      },
      {
        "id": "l3_q2",
        "question": "What might happen to people if gravity became zero?",
        "options": [
          {
            "id": "opt_a",
            "text": "They would float",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "They would stop moving",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "They would become heavier",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "They would disappear instantly",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. They would float"
      },
      {
        "id": "l3_q3",
        "question": "Why is gravity important?",
        "options": [
          {
            "id": "opt_a",
            "text": "It creates food",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "It keeps Earth warm",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "It makes phones work",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "It helps keep things close to Earth",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. It helps keep things close to Earth"
      }
    ]
  },
  {
    "levelNumber": 4,
    "title": "Stop Trying to Impress Everyone",
    "youtubeVideoId": "QbOLGiuxNNE",
    "explanation": "Trying to impress everyone can make you tired and unhappy. People have different opinions, so it is impossible to please everyone. Instead, focus on being kind, honest, and responsible. Do your best because it is right, not only because you want praise. Real confidence grows when you accept yourself today.",
    "questions": [
      {
        "id": "l4_q1",
        "question": "Why is it impossible to please everyone?",
        "options": [
          {
            "id": "opt_a",
            "text": "People have different opinions",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "People never talk",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Everyone agrees",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Nobody has opinions",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. People have different opinions"
      },
      {
        "id": "l4_q2",
        "question": "What should you focus on?",
        "options": [
          {
            "id": "opt_a",
            "text": "Winning every argument",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Being kind, honest, and responsible",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Impressing strangers",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Getting praise",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. Being kind, honest, and responsible"
      },
      {
        "id": "l4_q3",
        "question": "What can help real confidence grow?",
        "options": [
          {
            "id": "opt_a",
            "text": "Getting more likes",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Copying others",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Pretending to be perfect",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Accepting yourself",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. Accepting yourself"
      }
    ]
  },
  {
    "levelNumber": 5,
    "title": "Never Put Your Laptop on a Bed",
    "youtubeVideoId": "XB4FUo9cJE8",
    "explanation": "A laptop needs good airflow to stay cool. When you place it on a soft bed, the material may cover the air vents underneath. This can trap heat inside the computer. Too much heat can slow the laptop or damage its parts. A flat surface is safer for your laptop.",
    "questions": [
      {
        "id": "l5_q1",
        "question": "Why can a bed be bad for a laptop?",
        "options": [
          {
            "id": "opt_a",
            "text": "It may block the air vents",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "It adds battery power",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "It makes the screen larger",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "It is too bright",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. It may block the air vents"
      },
      {
        "id": "l5_q2",
        "question": "What does a laptop need to stay cool?",
        "options": [
          {
            "id": "opt_a",
            "text": "A blanket",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "A pillow",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Good airflow",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Darkness",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Good airflow"
      },
      {
        "id": "l5_q3",
        "question": "Where is it safer to use a laptop?",
        "options": [
          {
            "id": "opt_a",
            "text": "Under a pillow",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "On a hard, flat surface",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Inside a bag",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "On a soft bed",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. On a hard, flat surface"
      }
    ]
  },
  {
    "levelNumber": 6,
    "title": "Sleeping With Headphones? You Could Be Harming Your Ears",
    "youtubeVideoId": "-Q2rpPKzzJM",
    "explanation": "Sleeping with headphones can cause problems for your ears. Loud sounds for a long time may damage hearing. Headphones can also press against your ears while you sleep and cause discomfort. A safer choice is to keep the volume low, rest, and avoid wearing headphones all night. Protect your ears.",
    "questions": [
      {
        "id": "l6_q1",
        "question": "What can loud sound for a long time damage?",
        "options": [
          {
            "id": "opt_a",
            "text": "Hearing",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Hair",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Teeth",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Shoes",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. Hearing"
      },
      {
        "id": "l6_q2",
        "question": "Why can headphones be uncomfortable during sleep?",
        "options": [
          {
            "id": "opt_a",
            "text": "They stop breathing",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "They make food cold",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "They change the room",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "They can press against the ears",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. They can press against the ears"
      },
      {
        "id": "l6_q3",
        "question": "What is a safer choice?",
        "options": [
          {
            "id": "opt_a",
            "text": "Wear them all nightt",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Keep the volume low",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Use maximum volume",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Never take breaks",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. Keep the volume low"
      }
    ]
  },
  {
    "levelNumber": 7,
    "title": "Ever",
    "youtubeVideoId": "NZUXlmkRh5k",
    "explanation": "“Ever” is a common English word that usually means “at any time.” We often use it in questions, such as “Have you ever visited Colombo?” We can also use it with “best,” as in “the best film ever.” Learning “ever” helps beginners ask questions and understand common English sentences easily.",
    "questions": [
      {
        "id": "l7_q1",
        "question": "What does “ever” usually mean?",
        "options": [
          {
            "id": "opt_a",
            "text": "Tomorrow",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Yesterday",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "At any time",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Never",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. At any time"
      },
      {
        "id": "l7_q2",
        "question": "Which sentence uses “ever” correctly?",
        "options": [
          {
            "id": "opt_a",
            "text": "I ever go yesterday.",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Have you ever visited Colombo?",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "I am ever yesterday.",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Ever is a chair.",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. Have you ever visited Colombo?"
      },
      {
        "id": "l7_q3",
        "question": "Where can “ever” also be used?",
        "options": [
          {
            "id": "opt_a",
            "text": "With superlatives like “best”",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Only with numbers",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Only with names",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Only with verbs in the past",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. With superlatives like “best”"
      }
    ]
  },
  {
    "levelNumber": 8,
    "title": "Don't say interested on",
    "youtubeVideoId": "I4B--ku52Tg",
    "explanation": "In English, we normally say “interested in,” not “interested on.” For example, we say, “I am interested in science.” The preposition “in” is the correct word after “interested.” Common word combinations help sentences sound natural. Beginners should remember this useful phrase: “interested in something,” not “interested on something” for beginners.",
    "questions": [
      {
        "id": "l8_q1",
        "question": "Which preposition follows “interested”?",
        "options": [
          {
            "id": "opt_a",
            "text": "At",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "On",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "In",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "By",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. In"
      },
      {
        "id": "l8_q2",
        "question": "Which sentence is correct?",
        "options": [
          {
            "id": "opt_a",
            "text": "I am interested on science.",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "I am interested by science.",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "I am interested at science.",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "I am interested in science.",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. I am interested in science."
      },
      {
        "id": "l8_q3",
        "question": "Why should learners study common word combinations?",
        "options": [
          {
            "id": "opt_a",
            "text": "They make words shorter",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "They make sentences sound more natural",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "They remove all verbs",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "They change English into another language",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. They make sentences sound more natural"
      }
    ]
  },
  {
    "levelNumber": 9,
    "title": "Married TO a Doctor? The English Grammar Rule You Need to Know",
    "youtubeVideoId": "oyb774hyKc0",
    "explanation": "In English, we say “married to,” not “married with,” when we talk about a husband or wife. For example, “She is married to a doctor.” English has many fixed word combinations like this. Learning these phrases as complete expressions can help learners speak naturally and avoid grammar mistakes in speech.",
    "questions": [
      {
        "id": "l9_q1",
        "question": "Which phrase is correct?",
        "options": [
          {
            "id": "opt_a",
            "text": "Married on",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Married with",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Married to",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Married at",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Married to"
      },
      {
        "id": "l9_q2",
        "question": "Which sentence is correct?",
        "options": [
          {
            "id": "opt_a",
            "text": "She is married to a doctor.",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "She is married at a doctor.",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "She is married with a doctor.",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "She is married on a doctor.",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. She is married to a doctor."
      },
      {
        "id": "l9_q3",
        "question": "What can learning fixed phrases help learners do?",
        "options": [
          {
            "id": "opt_a",
            "text": "Forget vocabulary",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Avoid speaking",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Make every word shorter",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Speak more naturally",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. Speak more naturally"
      }
    ]
  },
  {
    "levelNumber": 10,
    "title": "Why Is “Colonel” Pronounced “Kernel”?",
    "youtubeVideoId": "2o2PQXGbsmc",
    "explanation": "The word “colonel” has an unusual pronunciation. It is not pronounced “col-on-el.” It is pronounced like “kernel.” The spelling comes from the history of the word, so the letters and sounds are different. English has many words like this. Learning unusual words can help learners improve pronunciation and listening skills.",
    "questions": [
      {
        "id": "l10_q1",
        "question": "How is “colonel” pronounced?",
        "options": [
          {
            "id": "opt_a",
            "text": "Col-on-el",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Colonel-ee",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Kernel",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Col-nel",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Kernel"
      },
      {
        "id": "l10_q2",
        "question": "Why is the pronunciation unusual?",
        "options": [
          {
            "id": "opt_a",
            "text": "The word has no meaning",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Its spelling and sound are different",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "It is a new word",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "It is not English",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. Its spelling and sound are different"
      },
      {
        "id": "l10_q3",
        "question": "What can learning unusual words improve?",
        "options": [
          {
            "id": "opt_a",
            "text": "Pronunciation and listening",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Running",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Drawing",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Cooking",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. Pronunciation and listening"
      }
    ]
  },
  {
    "levelNumber": 11,
    "title": "Why Is “QUEUE” Pronounced Like “Q”?",
    "youtubeVideoId": "lJt_vzBNQbI",
    "explanation": "The word “queue” has five letters, but it is pronounced like the letter “Q.” A queue means a line of people or things waiting. They are silent too. English has many unusual spellings, so learners should listen carefully and learn common words as complete words instead of reading each letter.",
    "questions": [
      {
        "id": "l11_q1",
        "question": "How is “queue” usually pronounced?",
        "options": [
          {
            "id": "opt_a",
            "text": "Que-you",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Kway-way",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Cue, like “Q”",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Koo-ee",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Cue, like “Q”"
      },
      {
        "id": "l11_q2",
        "question": "What does “queue” mean?",
        "options": [
          {
            "id": "opt_a",
            "text": "A type of food",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "A kind of computer",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "A school subject",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "A line of people or things waiting",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. A line of people or things waiting"
      },
      {
        "id": "l11_q3",
        "question": "What should learners do with unusual English words?",
        "options": [
          {
            "id": "opt_a",
            "text": "Change the spelling",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Learn and listen to the whole word",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Read every letter separately",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Ignore pronunciation",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. Learn and listen to the whole word"
      }
    ]
  },
  {
    "levelNumber": 12,
    "title": "Never Charge Your Phone Under Your Pillow!",
    "youtubeVideoId": "S-McV5dA2fQ",
    "explanation": "Charging a phone under a pillow is unsafe because the pillow can trap heat around the phone and charger. Batteries and chargers may become warm during use. Too much heat can damage devices and create a safety risk. Charge your phone on a hard, open surface where air can move.",
    "questions": [
      {
        "id": "l12_q1",
        "question": "Why should you not charge a phone under a pillow?",
        "options": [
          {
            "id": "opt_a",
            "text": "It makes the phone faster",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "It makes the screen brighter",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "It can trap heat",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "It improves the battery",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. It can trap heat"
      },
      {
        "id": "l12_q2",
        "question": "What can too much heat do?",
        "options": [
          {
            "id": "opt_a",
            "text": "Improve sound",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Add storage",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Make the phone waterproof",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Damage the device",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. Damage the device"
      },
      {
        "id": "l12_q3",
        "question": "Where should you charge a phone?",
        "options": [
          {
            "id": "opt_a",
            "text": "On a hard, open surface",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Inside a bag",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Under a pillow",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Under a blanket",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. On a hard, open surface"
      }
    ]
  },
  {
    "levelNumber": 13,
    "title": "Growth Often Looks Invisible",
    "youtubeVideoId": "j1ZGNps9XCg",
    "explanation": "Growth is not always easy to see. You may study every day but notice only small changes. However, small improvements can build over time. Learning one new word, reading one page, or practicing one skill may seem small today. Regular effort creates progress, even when results are not visible yet.",
    "questions": [
      {
        "id": "l13_q1",
        "question": "Why can growth be hard to see?",
        "options": [
          {
            "id": "opt_a",
            "text": "People stop moving",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Changes may be small",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Growth never happens",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Learning is impossible",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. Changes may be small"
      },
      {
        "id": "l13_q2",
        "question": "What can create progress over time?",
        "options": [
          {
            "id": "opt_a",
            "text": "Regular effort",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Avoiding practice",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Giving up",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Doing nothing",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. Regular effort"
      },
      {
        "id": "l13_q3",
        "question": "Which is an example of a small improvement?",
        "options": [
          {
            "id": "opt_a",
            "text": "Stopping practice",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Never reading",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Learning one new word",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Forgetting everything",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Learning one new word"
      }
    ]
  },
  {
    "levelNumber": 14,
    "title": "Your Past Doesn’t Control Your Future",
    "youtubeVideoId": "UZPTJJNIhOk",
    "explanation": "Your past can influence you, but it does not have to control your future. People can learn from mistakes, change habits, and make new choices. You cannot always change what happened before. However, you can decide what to do today. Your actions today can help create a better future ahead.",
    "questions": [
      {
        "id": "l14_q1",
        "question": "Can people change their future choices?",
        "options": [
          {
            "id": "opt_a",
            "text": "Yes, they can make new choices",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Only teachers can",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "No, never",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Only children can",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. Yes, they can make new choices"
      },
      {
        "id": "l14_q2",
        "question": "What can people learn from?",
        "options": [
          {
            "id": "opt_a",
            "text": "Nothing",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Silence only",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Clouds",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Mistakes",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. Mistakes"
      },
      {
        "id": "l14_q3",
        "question": "What can help shape the future?",
        "options": [
          {
            "id": "opt_a",
            "text": "Other people's dreams",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Today's actions",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Old clothes",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Yesterday's weather",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. Today's actions"
      }
    ]
  },
  {
    "levelNumber": 15,
    "title": "Tiny Habits Can Create Massive Results",
    "youtubeVideoId": "VUhM5v3_rEw",
    "explanation": "Small habits can create big results when we repeat them often. Reading one page every day can become many books over time. Saving a small amount of money regularly can also grow. A small action may look unimportant, but repeated actions can build strong skills, healthy routines and better results.",
    "questions": [
      {
        "id": "l15_q1",
        "question": "How can small habits create big results?",
        "options": [
          {
            "id": "opt_a",
            "text": "By doing them once",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "By changing them every minute",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "By avoiding them",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "By repeating them often",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. By repeating them often"
      },
      {
        "id": "l15_q2",
        "question": "What can reading one page each day become?",
        "options": [
          {
            "id": "opt_a",
            "text": "Many books over time",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "A television show",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "One sentence only",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "No learning",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. Many books over time"
      },
      {
        "id": "l15_q3",
        "question": "What makes small actions powerful?",
        "options": [
          {
            "id": "opt_a",
            "text": "Luck only",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Money only",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Consistency",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Speed only",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Consistency"
      }
    ]
  },
  {
    "levelNumber": 16,
    "title": "You Shed Millions of Skin Flakes Every Day!",
    "youtubeVideoId": "W5LSKB5TEVA",
    "explanation": "Your body naturally loses tiny pieces of skin every day. These skin flakes are too small to notice. Your body also makes new skin cells to replace old ones. This is a normal part of growth and skin health. Washing regularly helps remove many loose skin cells from your body.",
    "questions": [
      {
        "id": "l16_q1",
        "question": "What does the body naturally lose every day?",
        "options": [
          {
            "id": "opt_a",
            "text": "Teeth",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Bones",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Hair only",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Tiny pieces of skin",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. Tiny pieces of skin"
      },
      {
        "id": "l16_q2",
        "question": "What replaces old skin cells?",
        "options": [
          {
            "id": "opt_a",
            "text": "Water bottles",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "New skin cells",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Food",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Clothes",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. New skin cells"
      },
      {
        "id": "l16_q3",
        "question": "Why do people wash regularly?",
        "options": [
          {
            "id": "opt_a",
            "text": "To make bones stronger",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "To change their height",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "To remove many loose skin cells",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "To stop all skin growth",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. To remove many loose skin cells"
      }
    ]
  },
  {
    "levelNumber": 17,
    "title": "Yawning Might Be Your Brain’s Cooling System!",
    "youtubeVideoId": "ZXIEoI55NRs",
    "explanation": "Yawning may help the brain control its temperature, although scientists are still studying why people yawn. When we yawn, air enters the mouth and changes movement around the face. Blood flow may also change. People often yawn when tired or bored, and sometimes yawning happens after seeing someone yawn too.",
    "questions": [
      {
        "id": "l17_q1",
        "question": "What might yawning help control?",
        "options": [
          {
            "id": "opt_a",
            "text": "Shoe size",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Brain temperature",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "Hair length",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Eye color",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. Brain temperature"
      },
      {
        "id": "l17_q2",
        "question": "When do people often yawn?",
        "options": [
          {
            "id": "opt_a",
            "text": "Only after eating",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Only in winter",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Only when running",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "When tired or bored",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. When tired or bored"
      },
      {
        "id": "l17_q3",
        "question": "Are scientists still studying why people yawn?",
        "options": [
          {
            "id": "opt_a",
            "text": "Yes",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "Only teachers study it",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "No",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Only children study it",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. Yes"
      }
    ]
  },
  {
    "levelNumber": 18,
    "title": "The Invisible Cloud That Killed 1,746 People",
    "youtubeVideoId": "ZyHGCEEpiHI",
    "explanation": "In 1986, a large amount of carbon dioxide suddenly escaped from Lake Nyos in Cameroon. The gas formed an invisible cloud and moved down the nearby land. Because carbon dioxide is heavier than air, it stayed close to the ground. The disaster killed 1,746 people and surprised many nearby communities.",
    "questions": [
      {
        "id": "l18_q1",
        "question": "Where did the disaster happen?",
        "options": [
          {
            "id": "opt_a",
            "text": "London",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Japan",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Colombo",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "Lake Nyos in Cameroon",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. Lake Nyos in Cameroon"
      },
      {
        "id": "l18_q2",
        "question": "What gas escaped from the lake?",
        "options": [
          {
            "id": "opt_a",
            "text": "Oxygen",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Helium",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Carbon dioxide",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Hydrogen",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Carbon dioxide"
      },
      {
        "id": "l18_q3",
        "question": "Why did the gas stay close to the ground?",
        "options": [
          {
            "id": "opt_a",
            "text": "It was frozen",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "It was heavier than air",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "It was water",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "It was lighter than air",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. It was heavier than air"
      }
    ]
  },
  {
    "levelNumber": 19,
    "title": "Your Stomach Rebuilds Its Protective Lining Every 3 Days!",
    "youtubeVideoId": "EizNwDGRwsA",
    "explanation": "The stomach has a protective lining that helps protect its wall from strong stomach acid. This lining is constantly repaired and renewed. The exact renewal time can vary, but stomach cells are replaced quickly. This protection is important because stomach acid helps digest food and can harm tissue without protection.",
    "questions": [
      {
        "id": "l19_q1",
        "question": "What does the stomach lining help protect?",
        "options": [
          {
            "id": "opt_a",
            "text": "The ears",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "The feet",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "The eyes",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "The stomach wall",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. The stomach wall"
      },
      {
        "id": "l19_q2",
        "question": "Why does the stomach need protection?",
        "options": [
          {
            "id": "opt_a",
            "text": "Water is dangerous",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "The stomach has no cells",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Stomach acid is strong",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Food is always cold",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Stomach acid is strong"
      },
      {
        "id": "l19_q3",
        "question": "What happens to stomach cells?",
        "options": [
          {
            "id": "opt_a",
            "text": "They are replaced quickly",
            "isCorrect": true
          },
          {
            "id": "opt_b",
            "text": "They become bones",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "They disappear forever",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "They never change",
            "isCorrect": false
          }
        ],
        "correctIndex": 0,
        "explanation": "Correct answer: A. They are replaced quickly"
      }
    ]
  },
  {
    "levelNumber": 20,
    "title": "Failure Isn’t the End. It’s Feedback.",
    "youtubeVideoId": "TTS18cuzHJ4",
    "explanation": "Failure can show us what went wrong. It can show which choice or habit needs change. Instead of thinking every failure is the end, we can use it as information. Feedback helps us improve. When we learn from a mistake and try again, failure can become a step toward success.",
    "questions": [
      {
        "id": "l20_q1",
        "question": "What can failure show us?",
        "options": [
          {
            "id": "opt_a",
            "text": "The future weather",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "A new language",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Someone's age",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "What went wrong",
            "isCorrect": true
          }
        ],
        "correctIndex": 3,
        "explanation": "Correct answer: D. What went wrong"
      },
      {
        "id": "l20_q2",
        "question": "What can feedback help us do?",
        "options": [
          {
            "id": "opt_a",
            "text": "Give up",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "Forget everything",
            "isCorrect": false
          },
          {
            "id": "opt_c",
            "text": "Improve",
            "isCorrect": true
          },
          {
            "id": "opt_d",
            "text": "Avoid learning",
            "isCorrect": false
          }
        ],
        "correctIndex": 2,
        "explanation": "Correct answer: C. Improve"
      },
      {
        "id": "l20_q3",
        "question": "How can a mistake become useful?",
        "options": [
          {
            "id": "opt_a",
            "text": "By hiding it",
            "isCorrect": false
          },
          {
            "id": "opt_b",
            "text": "By learning from it and trying again",
            "isCorrect": true
          },
          {
            "id": "opt_c",
            "text": "By repeating it without change",
            "isCorrect": false
          },
          {
            "id": "opt_d",
            "text": "By blaming others",
            "isCorrect": false
          }
        ],
        "correctIndex": 1,
        "explanation": "Correct answer: B. By learning from it and trying again"
      }
    ]
  }
];

export function getLevelByNumber(levelNumber: number): LevelDefinition | undefined {
  return ELEKTRA_LEVELS_1_20.find(l => l.levelNumber === levelNumber);
}

export function getLevelByVideoId(videoId: string): LevelDefinition | undefined {
  return ELEKTRA_LEVELS_1_20.find(l => l.youtubeVideoId === videoId);
}

export function getAllLevels(): LevelDefinition[] {
  return ELEKTRA_LEVELS_1_20;
}

export function isLevelInSeries(videoIdOrLevel: string | number): boolean {
  if (typeof videoIdOrLevel === 'number') {
    return videoIdOrLevel >= 1 && videoIdOrLevel <= 20;
  }
  const parsed = parseInt(videoIdOrLevel, 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
    return true;
  }
  return ELEKTRA_LEVELS_1_20.some(l => l.youtubeVideoId === videoIdOrLevel);
}

/**
 * Determines whether a given level is unlocked based on user's progress.
 * Rule: Level 1 is always unlocked.
 * Level N (N > 1) is unlocked IF AND ONLY IF Level N-1 is completed with score >= 2.
 */
export function isLevelUnlocked(
  levelNumber: number,
  progressMap: { [videoIdOrLevel: string]: { completed?: boolean; quiz_score?: number; quizScore?: number } }
): boolean {
  if (levelNumber <= 1) return true;
  
  const prevLevel = getLevelByNumber(levelNumber - 1);
  if (!prevLevel) return false;

  const prevProgress = progressMap[prevLevel.youtubeVideoId] || progressMap[`level-${levelNumber - 1}`] || progressMap[`${levelNumber - 1}`];
  if (!prevProgress) return false;

  const isCompleted = !!prevProgress.completed;
  const score = prevProgress.quiz_score !== undefined ? prevProgress.quiz_score : (prevProgress.quizScore || 0);

  return isCompleted && score >= 2;
}

/**
 * Returns detailed status for a level: 'locked' | 'available' | 'in_progress' | 'completed'
 */
export function getLevelStatus(
  levelNumber: number,
  progressMap: { [videoIdOrLevel: string]: { completed?: boolean; quiz_score?: number; quizScore?: number; watched?: boolean } }
): LevelStatus {
  if (!isLevelUnlocked(levelNumber, progressMap)) {
    return 'locked';
  }

  const level = getLevelByNumber(levelNumber);
  if (!level) return 'locked';

  const progress = progressMap[level.youtubeVideoId] || progressMap[`level-${levelNumber}`] || progressMap[`${levelNumber}`];
  if (!progress) return 'available';

  const isCompleted = !!progress.completed;
  const score = progress.quiz_score !== undefined ? progress.quiz_score : (progress.quizScore || 0);

  if (isCompleted && score >= 2) {
    return 'completed';
  }

  if (progress.watched || score > 0) {
    return 'in_progress';
  }

  return 'available';
}

export function getNextLevelNumber(currentLevelNumber: number): number | null {
  if (currentLevelNumber >= 20) return null;
  return currentLevelNumber + 1;
}
