// ============================================================================
// EDTECHRA COURSE STUDIO 2.0: "🧠 AMAZING BRAIN" CANONICAL COURSE BLUEPRINT
// Complete 7-lesson interactive A1-A2 one-day course following the rhythm:
// SEE -> READ -> DISCOVER -> INTERACT -> PRACTISE -> ANSWER -> REMEMBER.
// ============================================================================

import { BlockType, QuestionType, DifficultyLevel } from '@/types/courseStudio';

export interface AmazingBrainLessonBlueprint {
  title: string;
  episode_type: 'lesson' | 'practice' | 'assessment' | 'revision';
  estimated_minutes: number;
  blocks: Array<{
    block_type: BlockType;
    content: Record<string, any>;
  }>;
  questions: Array<{
    question_text: string;
    question_type: QuestionType;
    options: any;
    correct_answer: string;
    explanation: string;
    skill: string;
    concept: string;
    difficulty: DifficultyLevel;
    points: number;
    illustration_key?: string;
    matching_pairs?: Array<{ left: string; right: string }>;
    acceptable_answers?: string[];
  }>;
}

export const AMAZING_BRAIN_COURSE_META = {
  title: '🧠 AMAZING BRAIN',
  short_description:
    'Discover the amazing machine inside your head! Learn how your brain helps you think, remember, move, and feel through visual guides and interactive challenges.',
  subject: 'Science & English (A1–A2)',
  grade_level: 'Beginner (A1–A2)',
  course_type: 'quick' as const,
  status: 'published' as const,
  estimated_hours: 1.5
};

export const AMAZING_BRAIN_LESSONS: AmazingBrainLessonBlueprint[] = [
  // ==========================================================================
  // LESSON 1: MEET YOUR BRAIN
  // ==========================================================================
  {
    title: 'Lesson 1: Meet Your Brain',
    episode_type: 'lesson',
    estimated_minutes: 10,
    blocks: [
      {
        block_type: 'objective',
        content: {
          title: 'Lesson 1 Goal • Meet Your Brain',
          text: 'Discover what your brain is, where it lives, and why it is the boss of your body.',
          outcomes: ['What the brain is', 'How your skull protects it', 'Core A1–A2 vocabulary']
        }
      },
      {
        block_type: 'illustration',
        content: {
          title: 'SEE: The Amazing Machine Inside Your Head',
          illustration_key: 'friendly_brain',
          alt: 'Friendly brain illustration showing the brain works 24 hours a day inside your skull',
          caption: 'Inside your head is a soft, wrinkled organ called the brain. Hard bone called your skull protects it like a strong helmet!',
          badges: ['⚖️ Weighs ~1.4 kg', '🛡️ Protected by Your Skull', '⚡ Works 24/7']
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'READ: Your Body’s Boss',
          text: 'Your brain is the command center of your body.\n\nIt sends fast messages to every part of you so you can talk, walk, learn, and feel.'
        }
      },
      {
        block_type: 'interactive_activity',
        content: {
          activity_type: 'click_to_reveal',
          title: 'DISCOVER & INTERACT: What Do You Think Your Brain Does?',
          instruction: 'Tap each card below to see if your brain controls that action!',
          items: [
            {
              icon: '🧩',
              label: 'Solving a puzzle or reading a book',
              detail: '✅ YES! Your brain helps you read words, think of ideas, and solve problems.'
            },
            {
              icon: '💓',
              label: 'Keeping your heart beating',
              detail: '✅ YES! Your brain keeps your heart beating automatically, even when you do not think about it.'
            },
            {
              icon: '😊',
              label: 'Feeling happy when you see a friend',
              detail: '✅ YES! All your feelings—like happiness, excitement, and calm—happen in your brain.'
            },
            {
              icon: '🌙',
              label: 'Dreaming while you sleep at night',
              detail: '✅ YES! Your brain never turns off. It creates dreams and saves memories while you sleep!'
            }
          ]
        }
      },
      {
        block_type: 'vocabulary_cards',
        content: {
          title: 'PRACTISE: Lesson 1 Vocabulary',
          words: [
            {
              word: 'brain',
              partOfSpeech: 'noun',
              icon: '🧠',
              definition: 'The soft organ inside your head that controls your body and mind.',
              example: 'Your brain helps you think, move, and feel.'
            },
            {
              word: 'control',
              partOfSpeech: 'verb',
              icon: '🎮',
              definition: 'To direct or be the boss of something.',
              example: 'Your brain controls how your body moves.'
            },
            {
              word: 'think',
              partOfSpeech: 'verb',
              icon: '💡',
              definition: 'To use your mind to have ideas or understand something.',
              example: 'I think carefully before I answer the question.'
            }
          ]
        }
      },
      {
        block_type: 'key_takeaway',
        content: {
          title: 'REMEMBER: Lesson 1 Takeaways',
          points: [
            'Your brain is inside your head, safely protected by your skull.',
            'It is the boss that controls your thoughts, movements, and feelings 24 hours a day.'
          ]
        }
      }
    ],
    questions: [
      {
        question_text: 'Where is your brain located, and what protects it?',
        question_type: 'multiple_choice',
        options: [
          'Inside your head, protected by your skull',
          'Inside your chest, protected by your ribs',
          'In your hands and feet',
          'Outside your body'
        ],
        correct_answer: 'A',
        explanation: 'Your brain sits safely inside your head, and the hard bones of your skull protect it like a helmet.',
        skill: 'Comprehension',
        concept: 'What the brain is',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Your brain stops working completely when you go to sleep at night.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'False',
        explanation: 'Your brain works 24 hours a day! Even while you sleep, it keeps you breathing and saves your memories.',
        skill: 'Science Facts',
        concept: 'Brain activity',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Your ___ is the command center inside your head that helps you think and move.',
        question_type: 'short_answer',
        options: ['brain'],
        acceptable_answers: ['brain'],
        correct_answer: 'brain',
        explanation: 'The brain is your body’s smart command center!',
        skill: 'Vocabulary',
        concept: 'brain',
        difficulty: 'easy',
        points: 20
      }
    ]
  },

  // ==========================================================================
  // LESSON 2: YOUR BRAIN AT WORK
  // ==========================================================================
  {
    title: 'Lesson 2: Your Brain at Work',
    episode_type: 'lesson',
    estimated_minutes: 10,
    blocks: [
      {
        block_type: 'objective',
        content: {
          title: 'Lesson 2 Goal • Your Brain at Work',
          text: 'Explore the 6 big jobs your brain does every single day.',
          outcomes: ['Thinking & Remembering', 'Moving & Balancing', 'Seeing, Hearing & Feeling']
        }
      },
      {
        block_type: 'illustration',
        content: {
          title: 'SEE: Your Brain’s 6 Superpowers',
          illustration_key: 'brain_superpowers',
          alt: 'Diagram showing the brain connected to thinking, moving, seeing, hearing, feeling, and remembering',
          caption: 'Every second, your brain receives messages from your eyes and ears and sends instructions to your muscles.',
          badges: ['💡 Thinking', '🏃 Moving', '👀 Senses', '❤️ Feelings']
        }
      },
      {
        block_type: 'icon_cards',
        content: {
          title: 'READ & DISCOVER: 6 Jobs Your Brain Does',
          subtitle: 'Tap each card to reveal an everyday example!',
          cards: [
            {
              icon: '💡',
              title: '1. Thinking',
              badge: 'Mind',
              description: 'Helps you understand ideas, make choices, and solve problems.',
              example: 'Choosing what clothes to wear in the morning.'
            },
            {
              icon: '📓',
              title: '2. Remembering',
              badge: 'Memory',
              description: 'Keeps important facts, words, and happy moments safe.',
              example: 'Remembering your home address and your friend’s name.'
            },
            {
              icon: '🏃',
              title: '3. Moving',
              badge: 'Action',
              description: 'Tells your muscles when to walk, run, jump, or write.',
              example: 'Kicking a football or waving hello.'
            },
            {
              icon: '👀',
              title: '4. Seeing',
              badge: 'Sight',
              description: 'Works with your eyes to understand colours, shapes, and faces.',
              example: 'Reading the words on this screen right now!'
            },
            {
              icon: '👂',
              title: '5. Hearing',
              badge: 'Sound',
              description: 'Works with your ears to understand music, voices, and sounds.',
              example: 'Listening to your favourite song or your teacher’s voice.'
            },
            {
              icon: '❤️',
              title: '6. Feeling',
              badge: 'Emotions',
              description: 'Helps you feel happy, excited, calm, or caring.',
              example: 'Smiling when someone gives you a kind compliment.'
            }
          ]
        }
      },
      {
        block_type: 'vocabulary_cards',
        content: {
          title: 'PRACTISE: Lesson 2 Vocabulary',
          words: [
            {
              word: 'movement',
              partOfSpeech: 'noun',
              icon: '🏃',
              definition: 'Changing position or moving parts of your body.',
              example: 'Running and dancing require fast body movement.'
            },
            {
              word: 'feel',
              partOfSpeech: 'verb',
              icon: '❤️',
              definition: 'To experience an emotion (like happy or sad) or a touch.',
              example: 'Listening to good music makes me feel happy.'
            },
            {
              word: 'learn',
              partOfSpeech: 'verb',
              icon: '🎓',
              definition: 'To get new knowledge or a new skill by studying or practising.',
              example: 'Every day, you learn new English words!'
            }
          ]
        }
      },
      {
        block_type: 'key_takeaway',
        content: {
          title: 'REMEMBER: Lesson 2 Takeaways',
          points: [
            'Your brain helps you think, remember, move, see, hear, and feel.',
            'Your eyes and ears collect information, and your brain understands what it means!'
          ]
        }
      }
    ],
    questions: [
      {
        question_text: 'When you kick a ball or wave your hand, which brain job are you using most?',
        question_type: 'multiple_choice',
        options: ['Moving', 'Sleeping', 'Digesting food', 'Growing hair'],
        correct_answer: 'A',
        explanation: 'Your brain sends fast signals to your muscles to control movement like kicking or waving.',
        skill: 'Application',
        concept: 'Brain functions',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Your eyes see light and shapes, but your brain helps you understand what you are looking at.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Correct! Your eyes and brain work together as a team so you can recognize faces, colours, and words.',
        skill: 'Science Facts',
        concept: 'Senses and the brain',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Match each everyday action to the brain job it uses:',
        question_type: 'matching',
        matching_pairs: [
          { left: 'Solving a math puzzle', right: 'Thinking' },
          { left: 'Listening to music', right: 'Hearing' },
          { left: 'Smiling with friends', right: 'Feeling' }
        ],
        options: [
          'Solving a math puzzle -> Thinking',
          'Listening to music -> Hearing',
          'Smiling with friends -> Feeling'
        ],
        correct_answer: 'Matched',
        explanation: 'Your brain handles thinking for puzzles, hearing for music, and feeling for emotions!',
        skill: 'Classification',
        concept: 'Brain jobs',
        difficulty: 'medium',
        points: 20
      }
    ]
  },

  // ==========================================================================
  // LESSON 3: THE MAIN PARTS
  // ==========================================================================
  {
    title: 'Lesson 3: The Main Parts',
    episode_type: 'lesson',
    estimated_minutes: 12,
    blocks: [
      {
        block_type: 'objective',
        content: {
          title: 'Lesson 3 Goal • The 3 Main Parts of the Brain',
          text: 'Meet the 3 main parts of your brain and discover what each part does.',
          outcomes: ['1. Cerebrum (Thinking)', '2. Cerebellum (Balance)', '3. Brain Stem (Breathing)']
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'READ: Three Parts Working as One Team',
          text: 'Your brain has three main parts: the **Cerebrum**, the **Cerebellum**, and the **Brain Stem**.\n\nEach part has a special job to keep you smart, steady, and alive.'
        }
      },
      {
        block_type: 'labelled_diagram',
        content: {
          title: 'SEE, DISCOVER & INTERACT: Tap Each Part of the Brain',
          subtitle: 'Click on 1. Cerebrum, 2. Cerebellum, and 3. Brain Stem on the diagram or buttons below!',
          illustration_key: 'brain_anatomy',
          items: [
            {
              id: 'cerebrum',
              label: '1. Cerebrum',
              subtitle: 'Thinking, Learning & Memory',
              description: 'The biggest part at the top of your brain. It helps you think, speak, read, remember, and use your senses.',
              example: 'You use your cerebrum when you read a story or learn new vocabulary.',
              funFact: 'The cerebrum is the largest part—about 85% of your brain!'
            },
            {
              id: 'cerebellum',
              label: '2. Cerebellum',
              subtitle: 'Balance & Smooth Movement',
              description: 'The smaller green part at the back of your brain. It helps you keep your balance and move your muscles smoothly.',
              example: 'You use your cerebellum when you ride a bike, dance, or stand on one foot.',
              funFact: 'Without your cerebellum, it would be hard to walk in a straight line!'
            },
            {
              id: 'brain_stem',
              label: '3. Brain Stem',
              subtitle: 'Automatic Life Support',
              description: 'The golden stem at the bottom of your brain. It controls automatic actions like breathing, heartbeat, and digestion.',
              example: 'Your brain stem keeps you breathing all night while you sleep.',
              funFact: 'You never have to remind your brain stem to do its job!'
            }
          ]
        }
      },
      {
        block_type: 'vocabulary_cards',
        content: {
          title: 'PRACTISE: Lesson 3 Vocabulary',
          words: [
            {
              word: 'balance',
              partOfSpeech: 'noun / verb',
              icon: '🤸',
              definition: 'Staying steady and upright without falling over.',
              example: 'The cerebellum helps you keep your balance on a bicycle.'
            },
            {
              word: 'cerebrum',
              partOfSpeech: 'noun',
              icon: '🧠',
              definition: 'The largest part of the brain that controls thinking, learning, and memory.',
              example: 'Your cerebrum is working right now as you read this sentence.'
            }
          ]
        }
      },
      {
        block_type: 'key_takeaway',
        content: {
          title: 'REMEMBER: The 3 Main Parts',
          points: [
            'Cerebrum = Thinking, learning, memory, and senses (largest part).',
            'Cerebellum = Balance and smooth movement (back of the brain).',
            'Brain Stem = Automatic breathing and heartbeat (bottom stem).'
          ]
        }
      }
    ],
    questions: [
      {
        question_text: 'Match each part of the brain to its main job:',
        question_type: 'matching',
        matching_pairs: [
          { left: 'Cerebrum', right: 'Thinking, learning, and memory' },
          { left: 'Cerebellum', right: 'Balance and smooth movement' },
          { left: 'Brain stem', right: 'Breathing and heartbeat' }
        ],
        options: [
          'Cerebrum -> Thinking, learning, and memory',
          'Cerebellum -> Balance and smooth movement',
          'Brain stem -> Breathing and heartbeat'
        ],
        correct_answer: 'Matched',
        explanation: 'Correct! Cerebrum = thinking & memory, Cerebellum = balance & movement, Brain stem = breathing & heartbeat.',
        skill: 'Anatomy',
        concept: 'Main parts of the brain',
        difficulty: 'medium',
        points: 25
      },
      {
        question_text: 'Look at the brain diagram. Which part helps you keep your balance when riding a bicycle?',
        question_type: 'multiple_choice',
        illustration_key: 'brain_anatomy',
        options: [
          'Cerebrum (Part 1)',
          'Cerebellum (Part 2)',
          'Brain Stem (Part 3)',
          'Skull bone'
        ],
        correct_answer: 'B',
        explanation: 'Correct! The cerebellum (Part 2, at the back of the brain) controls balance and coordination.',
        skill: 'Visual Identification',
        concept: 'Cerebellum',
        difficulty: 'easy',
        points: 25
      }
    ]
  },

  // ==========================================================================
  // LESSON 4: MEMORY — YOUR BRAIN'S NOTEBOOK
  // ==========================================================================
  {
    title: 'Lesson 4: Memory: Your Brain’s Notebook',
    episode_type: 'lesson',
    estimated_minutes: 10,
    blocks: [
      {
        block_type: 'objective',
        content: {
          title: 'Lesson 4 Goal • How Memory Works',
          text: 'Understand how your brain saves information using Short-Term and Long-Term Memory.',
          outcomes: ['Short-Term Sticky Note', 'Long-Term Notebook', 'How practice builds memory']
        }
      },
      {
        block_type: 'illustration',
        content: {
          title: 'SEE: Your Brain’s Two Notebooks',
          illustration_key: 'memory_notebook',
          alt: 'Diagram comparing Short-Term Memory sticky note and Long-Term Memory notebook',
          caption: 'Think of memory like two notebooks inside your head: a small sticky note for right now, and a big library book for years!',
          badges: ['📝 Short-Term (Seconds)', '🔁 Practice + Sleep', '📚 Long-Term (Years)']
        }
      },
      {
        block_type: 'comparison',
        content: {
          title: 'READ & COMPARE: Short-Term vs. Long-Term Memory',
          left: {
            title: 'Short-Term Memory',
            subtitle: 'The Quick Sticky Note',
            icon: '📝',
            points: [
              'Holds a few things for 15 to 30 seconds.',
              'Example: Remembering a phone code just long enough to type it.',
              'Easy to forget if you do not practise it.'
            ]
          },
          right: {
            title: 'Long-Term Memory',
            subtitle: 'The Big Forever Notebook',
            icon: '📚',
            points: [
              'Stores important knowledge and skills for years.',
              'Example: Your name, your language, and how to ride a bike.',
              'Practice and sleep move things into Long-Term Memory!'
            ]
          }
        }
      },
      {
        block_type: 'interactive_activity',
        content: {
          activity_type: 'memory_challenge',
          title: 'INTERACT: Test Your Short-Term Memory Notebook!',
          instruction: 'Study the 4 items below, hide them, and see if your short-term memory can recall all 4!',
          items: [
            { icon: '🍎', label: 'Green Apple', detail: 'Item 1' },
            { icon: '🔑', label: 'Golden Key', detail: 'Item 2' },
            { icon: '🎸', label: 'Blue Guitar', detail: 'Item 3' },
            { icon: '🚀', label: 'Space Rocket', detail: 'Item 4' }
          ]
        }
      },
      {
        block_type: 'vocabulary_cards',
        content: {
          title: 'PRACTISE: Lesson 4 Vocabulary',
          words: [
            {
              word: 'memory',
              partOfSpeech: 'noun',
              icon: '📓',
              definition: 'The power of your brain to store and bring back information.',
              example: 'Practising a new word helps keep it in your memory.'
            },
            {
              word: 'remember',
              partOfSpeech: 'verb',
              icon: '💭',
              definition: 'To keep something in your mind and not forget it.',
              example: 'Do you remember what you ate for breakfast today?'
            }
          ]
        }
      },
      {
        block_type: 'key_takeaway',
        content: {
          title: 'REMEMBER: How to Make Memories Stick',
          points: [
            'Short-term memory holds a few things for a short time.',
            'Repeating, practising, and sleeping move new knowledge into your long-term memory!'
          ]
        }
      }
    ],
    questions: [
      {
        question_text: 'How can you move a new English word from your short-term memory into your long-term memory?',
        question_type: 'multiple_choice',
        options: [
          'Practise using the word and get good sleep',
          'Never read or say the word again',
          'Close the book and forget about it',
          'Skip sleep all night'
        ],
        correct_answer: 'A',
        explanation: 'Practice and sleep help your brain move information from the short-term sticky note into your long-term notebook!',
        skill: 'Study Skills',
        concept: 'Memory consolidation',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Remembering your own name and how to ride a bike uses your long-term memory.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Correct! Skills and important facts you keep for years live in your long-term memory.',
        skill: 'Comprehension',
        concept: 'Long-term memory',
        difficulty: 'easy',
        points: 20
      }
    ]
  },

  // ==========================================================================
  // LESSON 5: SLEEP AND YOUR BRAIN
  // ==========================================================================
  {
    title: 'Lesson 5: Sleep and Your Brain',
    episode_type: 'lesson',
    estimated_minutes: 10,
    blocks: [
      {
        block_type: 'objective',
        content: {
          title: 'Lesson 5 Goal • Why Your Brain Loves Sleep',
          text: 'Discover the secret night shift your brain does while you are sleeping.',
          outcomes: ['Brain cleaning crew', 'Saving today’s memories', 'Why tired brains feel slow']
        }
      },
      {
        block_type: 'illustration',
        content: {
          title: 'SEE: Your Brain’s Busy Night Shift',
          illustration_key: 'sleeping_brain',
          alt: 'Night illustration showing a sleeping brain cleaning waste and saving memories',
          caption: 'When you close your eyes at night, your muscles rest—but your brain starts its night-time cleaning and saving job!',
          badges: ['🧹 Cleans Tired Waste', '💾 Saves Memories', '🔋 Recharges Energy']
        }
      },
      {
        block_type: 'text',
        content: {
          title: 'READ: Two Big Jobs While You Sleep',
          text: 'First, your sleeping brain works like a **janitor**: it washes away tired waste built up during the day.\n\nSecond, it works like a **librarian**: it organizes and saves the important things you learned today!'
        }
      },
      {
        block_type: 'did_you_know',
        content: {
          title: 'DISCOVER: Did You Know?',
          question_prompt: 'What happens in your brain if you do not get enough sleep?',
          text: 'When you do not sleep enough, it becomes much harder to focus, remember new words, or stay calm and happy the next day. Most learners need 8 to 10 hours of sleep each night!'
        }
      },
      {
        block_type: 'vocabulary_cards',
        content: {
          title: 'PRACTISE: Lesson 5 Vocabulary',
          words: [
            {
              word: 'sleep',
              partOfSpeech: 'noun / verb',
              icon: '😴',
              definition: 'Resting your body and mind at night with your eyes closed.',
              example: 'Good sleep helps your brain feel fresh and ready to learn.'
            }
          ]
        }
      },
      {
        block_type: 'key_takeaway',
        content: {
          title: 'REMEMBER: Sleep Makes You Smarter',
          points: [
            'While you sleep, your brain cleans itself and saves what you learned.',
            'Getting 8–10 hours of sleep helps you focus, remember, and feel great.'
          ]
        }
      }
    ],
    questions: [
      {
        question_text: 'What two important jobs does your brain do while you sleep?',
        question_type: 'multiple_choice',
        options: [
          'It cleans away waste and saves your memories from the day',
          'It turns off completely and does nothing',
          'It forgets everything you learned at school',
          'It makes your bones smaller'
        ],
        correct_answer: 'A',
        explanation: 'During sleep, your brain cleans itself and stores the memories and skills you practised during the day!',
        skill: 'Comprehension',
        concept: 'Sleep and the brain',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Sleeping well at night helps you focus and remember things better the next day.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Correct! A well-rested brain is faster, happier, and ready to learn.',
        skill: 'Health & Science',
        concept: 'Benefits of sleep',
        difficulty: 'easy',
        points: 20
      }
    ]
  },

  // ==========================================================================
  // LESSON 6: TAKE CARE OF YOUR BRAIN
  // ==========================================================================
  {
    title: 'Lesson 6: Take Care of Your Brain',
    episode_type: 'lesson',
    estimated_minutes: 10,
    blocks: [
      {
        block_type: 'objective',
        content: {
          title: 'Lesson 6 Goal • 6 Ways to Care for Your Brain',
          text: 'Learn 6 simple daily habits that keep your brain strong, healthy, and happy.',
          outcomes: ['Healthy food & water', 'Exercise & rest breaks', 'Learning & calm habits']
        }
      },
      {
        block_type: 'icon_cards',
        content: {
          title: 'SEE & READ: 6 Daily Habits for a Healthy Brain',
          subtitle: 'Tap each action card to see how it helps your brain!',
          cards: [
            {
              icon: '😴',
              title: '1. Sleep Well',
              badge: 'Night Care',
              description: 'Get 8–10 hours of sleep every night so your brain can clean and recharge.',
              example: 'Turn off bright screens 30 minutes before bedtime.'
            },
            {
              icon: '🥦',
              title: '2. Eat Healthy Food & Drink Water',
              badge: 'Fuel',
              description: 'Fruits, vegetables, nuts, fish, and water give your brain clean energy.',
              example: 'Drink a glass of water when your mind feels tired.'
            },
            {
              icon: '🏃',
              title: '3. Move Your Body',
              badge: 'Exercise',
              description: 'Walking, playing sports, and dancing pump fresh oxygen to your brain.',
              example: 'A 15-minute walk wakes up your thinking power!'
            },
            {
              icon: '📚',
              title: '4. Learn New Things',
              badge: 'Growth',
              description: 'Learning a language, instrument, or game builds strong new brain connections.',
              example: 'Practising English every day exercises your brain like a muscle.'
            },
            {
              icon: '☕',
              title: '5. Take Short Breaks',
              badge: 'Rest',
              description: 'Short breaks during study time stop your brain from feeling overloaded.',
              example: 'Stretch and look away from the screen for 5 minutes after studying.'
            },
            {
              icon: '🌿',
              title: '6. Manage Stress',
              badge: 'Calm',
              description: 'Deep breathing, talking with friends, and kindness help your brain stay calm.',
              example: 'Take 3 slow, deep breaths when a task feels difficult.'
            }
          ]
        }
      },
      {
        block_type: 'interactive_activity',
        content: {
          activity_type: 'click_to_reveal',
          title: 'INTERACT: My Healthy Brain Checklist Today',
          instruction: 'Tap the healthy brain habits you will do today!',
          items: [
            {
              icon: '💧',
              label: 'Drink plenty of water today',
              detail: '🌟 Great choice! Your brain is mostly water and loves staying hydrated.'
            },
            {
              icon: '🚶',
              label: 'Move my body or go for a walk',
              detail: '🌟 Awesome! Movement sends fresh oxygen straight to your brain cells.'
            },
            {
              icon: '🗣️',
              label: 'Practise new words I learned today',
              detail: '🌟 Super! Using new words strengthens your cerebrum.'
            },
            {
              icon: '🌙',
              label: 'Go to bed on time tonight',
              detail: '🌟 Perfect! Tonight your brain will save everything you learned in this course!'
            }
          ]
        }
      },
      {
        block_type: 'key_takeaway',
        content: {
          title: 'REMEMBER: You Are the Caretaker of Your Brain',
          points: [
            'Sleep well, eat healthy food, drink water, and move your body.',
            'Learn new things, take short breaks, and breathe deeply to manage stress.'
          ]
        }
      }
    ],
    questions: [
      {
        question_text: 'Which of these is one of the 6 healthy ways to take care of your brain?',
        question_type: 'multiple_choice',
        options: [
          'Move your body, eat healthy food, and get good sleep',
          'Never take breaks and skip water all day',
          'Stay awake all night staring at a bright screen',
          'Stop learning anything new'
        ],
        correct_answer: 'A',
        explanation: 'Exercise, healthy food, water, rest breaks, and good sleep keep your brain energized and strong!',
        skill: 'Health Habits',
        concept: 'Brain care',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Learning new things (like English or music) helps build stronger connections in your brain.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Correct! Your brain grows stronger every time you practise and learn something new.',
        skill: 'Growth Mindset',
        concept: 'Neuroplasticity for beginners',
        difficulty: 'easy',
        points: 20
      }
    ]
  },

  // ==========================================================================
  // LESSON 7: FINAL CHALLENGE & COURSE COMPLETION
  // ==========================================================================
  {
    title: 'Lesson 7: Final Challenge',
    episode_type: 'assessment',
    estimated_minutes: 12,
    blocks: [
      {
        block_type: 'objective',
        content: {
          title: 'Final Challenge • Show What Your Amazing Brain Knows!',
          text: 'Complete the 5 interactive review challenges below to earn your Junior Brain Explorer Certificate and Leaderboard XP!',
          outcomes: ['Multiple Choice', 'Visual Diagram Check', 'Brain Part Matching', 'True / False', 'One-Word Recall']
        }
      },
      {
        block_type: 'course_completion',
        content: {
          course_title: '🧠 AMAZING BRAIN',
          badge_title: 'Junior Brain Explorer',
          learned_points: [
            'Your brain is the command center inside your skull that works 24 hours a day.',
            'It helps you think, remember, move, see, hear, and feel.',
            'The 3 main parts are the Cerebrum (thinking), Cerebellum (balance), and Brain Stem (breathing & heartbeat).',
            'Short-term memory holds items for seconds; practice and sleep save them into long-term memory.',
            'Sleep, healthy food, water, exercise, learning, and calm breaks keep your brain healthy!'
          ]
        }
      }
    ],
    questions: [
      {
        question_text: 'Look at the brain diagram. Which is the LARGEST part of the brain (Part 1) that helps you think, read, and learn?',
        question_type: 'multiple_choice',
        illustration_key: 'brain_anatomy',
        options: [
          'Cerebrum',
          'Cerebellum',
          'Brain stem',
          'Stomach'
        ],
        correct_answer: 'A',
        explanation: 'Correct! The cerebrum is the largest part of your brain and controls thinking, reading, learning, and memory.',
        skill: 'Visual Anatomy',
        concept: 'Cerebrum',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Match each brain part or memory type to its correct description:',
        question_type: 'matching',
        matching_pairs: [
          { left: 'Cerebrum', right: 'Thinking and learning new things' },
          { left: 'Cerebellum', right: 'Keeping balance when riding a bike' },
          { left: 'Brain stem', right: 'Automatic breathing and heartbeat' },
          { left: 'Long-term memory', right: 'Your brain’s big forever notebook' }
        ],
        options: [
          'Cerebrum -> Thinking and learning new things',
          'Cerebellum -> Keeping balance when riding a bike',
          'Brain stem -> Automatic breathing and heartbeat',
          'Long-term memory -> Your brain’s big forever notebook'
        ],
        correct_answer: 'Matched',
        explanation: 'Fantastic matching! You know all 3 parts of the brain and how long-term memory works.',
        skill: 'Comprehensive Review',
        concept: 'Brain Parts & Memory',
        difficulty: 'medium',
        points: 20
      },
      {
        question_text: 'While you are sleeping at night, your brain cleans away waste and saves the memories of what you learned.',
        question_type: 'true_false',
        options: ['True', 'False'],
        correct_answer: 'True',
        explanation: 'Correct! Sleep is when your brain cleans itself and saves new knowledge into long-term memory.',
        skill: 'Science Review',
        concept: 'Sleep and memory',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Which daily habit is BEST for keeping your brain strong and healthy?',
        question_type: 'multiple_choice',
        options: [
          'Sleeping well, eating healthy food, moving your body, and learning new things',
          'Skipping sleep and never drinking water',
          'Studying for 10 hours without any breaks',
          'Never practising what you learn'
        ],
        correct_answer: 'A',
        explanation: 'Correct! Good sleep, healthy food, water, movement, learning, and short breaks keep your brain at its best.',
        skill: 'Life Skills',
        concept: 'Brain care',
        difficulty: 'easy',
        points: 20
      },
      {
        question_text: 'Good ___ at night helps your brain rest, clean itself, and save your memories.',
        question_type: 'short_answer',
        options: ['sleep'],
        acceptable_answers: ['sleep', 'rest'],
        correct_answer: 'sleep',
        explanation: 'Correct! Sleep is essential for a healthy, smart brain.',
        skill: 'Vocabulary Recall',
        concept: 'sleep',
        difficulty: 'easy',
        points: 20
      }
    ]
  }
];
