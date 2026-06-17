export type MilestoneItem = { key: string; text: string }
export type MilestoneCategory = { label: string; items: MilestoneItem[] }
export type MilestoneGroup = { key: string; label: string; categories: MilestoneCategory[] }

const AGE_THRESHOLDS: { key: string; months: number }[] = [
  { key: '2mo',  months: 2  },
  { key: '4mo',  months: 4  },
  { key: '6mo',  months: 6  },
  { key: '9mo',  months: 9  },
  { key: '12mo', months: 12 },
  { key: '15mo', months: 15 },
  { key: '18mo', months: 18 },
  { key: '24mo', months: 24 },
  { key: '30mo', months: 30 },
  { key: '36mo', months: 36 },
  { key: '48mo', months: 48 },
  { key: '60mo', months: 60 },
]

function calendarMonthsDiff(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear()
  const months = to.getMonth() - from.getMonth()
  const dayOffset = to.getDate() < from.getDate() ? -1 : 0
  return years * 12 + months + dayOffset
}

export function getDefaultOpenGroup(dob: string | null, now: Date = new Date()): string {
  if (!dob) return '2mo'
  const ageMonths = calendarMonthsDiff(new Date(dob), now)
  const match = [...AGE_THRESHOLDS].reverse().find(t => ageMonths >= t.months)
  return match?.key ?? '2mo'
}

export const MILESTONE_GROUPS: MilestoneGroup[] = [
  {
    key: '2mo', label: '2 Months',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '2mo_social_1', text: 'Calms down when spoken to or picked up' },
        { key: '2mo_social_2', text: 'Looks at your face' },
        { key: '2mo_social_3', text: 'Seems happy to see you when you walk up to her' },
        { key: '2mo_social_4', text: 'Smiles when you talk to or smile at her' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '2mo_lang_1', text: 'Makes sounds other than crying' },
        { key: '2mo_lang_2', text: 'Reacts to loud sounds' },
      ]},
      { label: 'Cognitive', items: [
        { key: '2mo_cog_1', text: 'Watches you as you move' },
        { key: '2mo_cog_2', text: 'Looks at a toy for several seconds' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '2mo_motor_1', text: 'Holds head up when on tummy' },
        { key: '2mo_motor_2', text: 'Moves both arms and both legs' },
        { key: '2mo_motor_3', text: 'Opens hands briefly' },
      ]},
    ],
  },
  {
    key: '4mo', label: '4 Months',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '4mo_social_1', text: 'Smiles on his own to get your attention' },
        { key: '4mo_social_2', text: 'Chuckles (not yet a full laugh) when you try to make her laugh' },
        { key: '4mo_social_3', text: 'Looks at you, moves, or makes sounds to get or keep your attention' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '4mo_lang_1', text: 'Makes sounds like "oooo", "aahh" (cooing)' },
        { key: '4mo_lang_2', text: 'Makes sounds back when you talk to him' },
        { key: '4mo_lang_3', text: 'Turns head towards the sound of your voice' },
      ]},
      { label: 'Cognitive', items: [
        { key: '4mo_cog_1', text: 'If hungry, opens mouth when she sees breast or bottle' },
        { key: '4mo_cog_2', text: 'Looks at his hands with interest' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '4mo_motor_1', text: 'Holds head steady without support when you are holding her' },
        { key: '4mo_motor_2', text: 'Holds a toy when you put it in his hand' },
        { key: '4mo_motor_3', text: 'Uses her arm to swing at toys' },
        { key: '4mo_motor_4', text: 'Brings hands to mouth' },
        { key: '4mo_motor_5', text: 'Pushes up onto elbows/forearms when on tummy' },
      ]},
    ],
  },
  {
    key: '6mo', label: '6 Months',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '6mo_social_1', text: 'Knows familiar people' },
        { key: '6mo_social_2', text: 'Likes to look at himself in a mirror' },
        { key: '6mo_social_3', text: 'Laughs' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '6mo_lang_1', text: 'Takes turns making sounds with you' },
        { key: '6mo_lang_2', text: 'Blows "raspberries" (sticks tongue out and blows)' },
        { key: '6mo_lang_3', text: 'Makes squealing noises' },
      ]},
      { label: 'Cognitive', items: [
        { key: '6mo_cog_1', text: 'Puts things in her mouth to explore them' },
        { key: '6mo_cog_2', text: 'Reaches to grab a toy he wants' },
        { key: '6mo_cog_3', text: 'Closes lips to show she doesn\'t want more food' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '6mo_motor_1', text: 'Rolls from tummy to back' },
        { key: '6mo_motor_2', text: 'Pushes up with straight arms when on tummy' },
        { key: '6mo_motor_3', text: 'Leans on hands to support himself when sitting' },
      ]},
    ],
  },
  {
    key: '9mo', label: '9 Months',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '9mo_social_1', text: 'Is shy, clingy, or fearful around strangers' },
        { key: '9mo_social_2', text: 'Shows several facial expressions, like happy, sad, angry, and surprised' },
        { key: '9mo_social_3', text: 'Looks when you call her name' },
        { key: '9mo_social_4', text: 'Reacts when you leave (looks, reaches for you, or cries)' },
        { key: '9mo_social_5', text: 'Smiles or laughs when you play peek-a-boo' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '9mo_lang_1', text: 'Makes different sounds like "mamamama" and "babababa"' },
        { key: '9mo_lang_2', text: 'Lifts arms up to be picked up' },
      ]},
      { label: 'Cognitive', items: [
        { key: '9mo_cog_1', text: 'Looks for objects when dropped out of sight (like his spoon or toy)' },
        { key: '9mo_cog_2', text: 'Bangs two things together' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '9mo_motor_1', text: 'Gets to a sitting position by herself' },
        { key: '9mo_motor_2', text: 'Moves things from one hand to her other hand' },
        { key: '9mo_motor_3', text: 'Uses fingers to "rake" food towards himself' },
        { key: '9mo_motor_4', text: 'Sits without support' },
      ]},
    ],
  },
  {
    key: '12mo', label: '12 Months',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '12mo_social_1', text: 'Plays games with you, like pat-a-cake' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '12mo_lang_1', text: 'Waves "bye-bye"' },
        { key: '12mo_lang_2', text: 'Calls a parent "mama" or "dada" or another special name' },
        { key: '12mo_lang_3', text: 'Understands "no" (pauses briefly or stops when you say it)' },
      ]},
      { label: 'Cognitive', items: [
        { key: '12mo_cog_1', text: 'Puts something in a container, like a block in a cup' },
        { key: '12mo_cog_2', text: 'Looks for things he sees you hide, like a toy under a blanket' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '12mo_motor_1', text: 'Pulls up to stand' },
        { key: '12mo_motor_2', text: 'Walks, holding on to furniture' },
        { key: '12mo_motor_3', text: 'Drinks from a cup without a lid, as you hold it' },
        { key: '12mo_motor_4', text: 'Picks things up between thumb and pointer finger, like small bits of food' },
      ]},
    ],
  },
  {
    key: '15mo', label: '15 Months',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '15mo_social_1', text: 'Copies other children while playing, like taking toys out of a container when another child does' },
        { key: '15mo_social_2', text: 'Shows you an object she likes' },
        { key: '15mo_social_3', text: 'Claps when excited' },
        { key: '15mo_social_4', text: 'Hugs stuffed doll or other toy' },
        { key: '15mo_social_5', text: 'Shows you affection (hugs, cuddles, or kisses you)' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '15mo_lang_1', text: 'Tries to say one or two words besides "mama" or "dada," like "ba" for ball or "da" for dog' },
        { key: '15mo_lang_2', text: 'Looks at a familiar object when you name it' },
        { key: '15mo_lang_3', text: 'Follows directions given with both a gesture and words. For example, he gives you a toy when you hold out your hand and say, "Give me the toy."' },
        { key: '15mo_lang_4', text: 'Points to ask for something or to get help' },
      ]},
      { label: 'Cognitive', items: [
        { key: '15mo_cog_1', text: 'Tries to use things the right way, like a phone, cup, or book' },
        { key: '15mo_cog_2', text: 'Stacks at least two small objects, like blocks' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '15mo_motor_1', text: 'Takes a few steps on his own' },
        { key: '15mo_motor_2', text: 'Uses fingers to feed herself some food' },
      ]},
    ],
  },
  {
    key: '18mo', label: '18 Months',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '18mo_social_1', text: 'Moves away from you, but looks to make sure you are close by' },
        { key: '18mo_social_2', text: 'Points to show you something interesting' },
        { key: '18mo_social_3', text: 'Puts hands out for you to wash them' },
        { key: '18mo_social_4', text: 'Looks at a few pages in a book with you' },
        { key: '18mo_social_5', text: 'Helps you dress him by pushing arm through sleeve or lifting up foot' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '18mo_lang_1', text: 'Tries to say three or more words besides "mama" or "dada"' },
        { key: '18mo_lang_2', text: 'Follows one-step directions without any gestures, like giving you the toy when you say, "Give it to me."' },
      ]},
      { label: 'Cognitive', items: [
        { key: '18mo_cog_1', text: 'Copies you doing chores, like sweeping with a broom' },
        { key: '18mo_cog_2', text: 'Plays with toys in a simple way, like pushing a toy car' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '18mo_motor_1', text: 'Walks without holding on to anyone or anything' },
        { key: '18mo_motor_2', text: 'Scribbles' },
        { key: '18mo_motor_3', text: 'Drinks from a cup without a lid and may spill sometimes' },
        { key: '18mo_motor_4', text: 'Feeds herself with her fingers' },
        { key: '18mo_motor_5', text: 'Tries to use a spoon' },
        { key: '18mo_motor_6', text: 'Climbs on and off a couch or chair without help' },
      ]},
    ],
  },
  {
    key: '24mo', label: '2 Years',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '24mo_social_1', text: 'Notices when others are hurt or upset, like pausing or looking sad when someone is crying' },
        { key: '24mo_social_2', text: 'Looks at your face to see how to react in a new situation' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '24mo_lang_1', text: 'Points to things in a book when you ask, like "Where is the bear?"' },
        { key: '24mo_lang_2', text: 'Says at least two words together, like "More milk."' },
        { key: '24mo_lang_3', text: 'Points to at least two body parts when you ask him to show you' },
        { key: '24mo_lang_4', text: 'Uses more gestures than just waving and pointing, like blowing a kiss or nodding yes' },
      ]},
      { label: 'Cognitive', items: [
        { key: '24mo_cog_1', text: 'Holds something in one hand while using the other hand; for example, holding a container and taking the lid off' },
        { key: '24mo_cog_2', text: 'Tries to use switches, knobs, or buttons on a toy' },
        { key: '24mo_cog_3', text: 'Plays with more than one toy at the same time, like putting toy food on a toy plate' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '24mo_motor_1', text: 'Kicks a ball' },
        { key: '24mo_motor_2', text: 'Runs' },
        { key: '24mo_motor_3', text: 'Walks (not climbs) up a few stairs with or without help' },
        { key: '24mo_motor_4', text: 'Eats with a spoon' },
      ]},
    ],
  },
  {
    key: '30mo', label: '30 Months',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '30mo_social_1', text: 'Plays next to other children and sometimes plays with them' },
        { key: '30mo_social_2', text: 'Shows you what she can do by saying, "Look at me!"' },
        { key: '30mo_social_3', text: 'Follows simple routines when told, like helping to pick up toys when you say, "It\'s clean-up time."' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '30mo_lang_1', text: 'Says about 50 words' },
        { key: '30mo_lang_2', text: 'Says two or more words, with one action word, like "Doggie run"' },
        { key: '30mo_lang_3', text: 'Names things in a book when you point and ask, "What is this?"' },
        { key: '30mo_lang_4', text: 'Says words like "I," "me," or "we"' },
      ]},
      { label: 'Cognitive', items: [
        { key: '30mo_cog_1', text: 'Uses things to pretend, like feeding a block to a doll as if it were food' },
        { key: '30mo_cog_2', text: 'Shows simple problem-solving skills, like standing on a small stool to reach something' },
        { key: '30mo_cog_3', text: 'Follows two-step instructions like "Put the toy down and close the door."' },
        { key: '30mo_cog_4', text: 'Shows he knows at least one color, like pointing to a red crayon when you ask, "Which one is red?"' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '30mo_motor_1', text: 'Uses hands to twist things, like turning doorknobs or unscrewing lids' },
        { key: '30mo_motor_2', text: 'Takes some clothes off by himself, like loose pants or an open jacket' },
        { key: '30mo_motor_3', text: 'Jumps off the ground with both feet' },
        { key: '30mo_motor_4', text: 'Turns book pages, one at a time, when you read to her' },
      ]},
    ],
  },
  {
    key: '36mo', label: '3 Years',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '36mo_social_1', text: 'Calms down within 10 minutes after you leave her, like at a childcare drop off' },
        { key: '36mo_social_2', text: 'Notices other children and joins them to play' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '36mo_lang_1', text: 'Talks with you in conversation using at least two back-and-forth exchanges' },
        { key: '36mo_lang_2', text: 'Asks "who," "what," "where," or "why" questions, like "Where is mommy/daddy?"' },
        { key: '36mo_lang_3', text: 'Says what action is happening in a picture or book when asked, like "running," "eating," or "playing"' },
        { key: '36mo_lang_4', text: 'Says first name, when asked' },
        { key: '36mo_lang_5', text: 'Talks well enough for others to understand, most of the time' },
      ]},
      { label: 'Cognitive', items: [
        { key: '36mo_cog_1', text: 'Draws a circle, when you show him how' },
        { key: '36mo_cog_2', text: 'Avoids touching hot objects, like a stove, when you warn her' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '36mo_motor_1', text: 'Strings items together, like large beads or macaroni' },
        { key: '36mo_motor_2', text: 'Puts on some clothes by himself, like loose pants or a jacket' },
        { key: '36mo_motor_3', text: 'Uses a fork' },
      ]},
    ],
  },
  {
    key: '48mo', label: '4 Years',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '48mo_social_1', text: 'Pretends to be something else during play (teacher, superhero, dog)' },
        { key: '48mo_social_2', text: 'Asks to go play with children if none are around, like "Can I play with Alex?"' },
        { key: '48mo_social_3', text: 'Comforts others who are hurt or sad, like hugging a crying friend' },
        { key: '48mo_social_4', text: 'Avoids danger, like not jumping from tall heights at the playground' },
        { key: '48mo_social_5', text: 'Likes to be a "helper"' },
        { key: '48mo_social_6', text: 'Changes behavior based on where she is (place of worship, library, playground)' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '48mo_lang_1', text: 'Says sentences with four or more words' },
        { key: '48mo_lang_2', text: 'Says some words from a song, story, or nursery rhyme' },
        { key: '48mo_lang_3', text: 'Talks about at least one thing that happened during his day, like "I played soccer."' },
        { key: '48mo_lang_4', text: 'Answers simple questions like "What is a coat for?" or "What is a crayon for?"' },
      ]},
      { label: 'Cognitive', items: [
        { key: '48mo_cog_1', text: 'Names a few colors of items' },
        { key: '48mo_cog_2', text: 'Tells what comes next in a well-known story' },
        { key: '48mo_cog_3', text: 'Draws a person with three or more body parts' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '48mo_motor_1', text: 'Catches a large ball most of the time' },
        { key: '48mo_motor_2', text: 'Serves himself food or pours water, with adult supervision' },
        { key: '48mo_motor_3', text: 'Unbuttons some buttons' },
        { key: '48mo_motor_4', text: 'Holds crayon or pencil between fingers and thumb (not a fist)' },
      ]},
    ],
  },
  {
    key: '60mo', label: '5 Years',
    categories: [
      { label: 'Social/Emotional', items: [
        { key: '60mo_social_1', text: 'Follows rules or takes turns when playing games with other children' },
        { key: '60mo_social_2', text: 'Sings, dances, or acts for you' },
        { key: '60mo_social_3', text: 'Does simple chores at home, like matching socks or clearing the table after eating' },
      ]},
      { label: 'Language/Communication', items: [
        { key: '60mo_lang_1', text: 'Tells a story she heard or made up with at least two events. For example, a cat was stuck in a tree and a firefighter saved it' },
        { key: '60mo_lang_2', text: 'Answers simple questions about a book or story after you read or tell it to him' },
        { key: '60mo_lang_3', text: 'Keeps a conversation going with more than three back-and-forth exchanges' },
        { key: '60mo_lang_4', text: 'Uses or recognizes simple rhymes (bat-cat, ball-tall)' },
      ]},
      { label: 'Cognitive', items: [
        { key: '60mo_cog_1', text: 'Counts to 10' },
        { key: '60mo_cog_2', text: 'Names some numbers between 1 and 5 when you point to them' },
        { key: '60mo_cog_3', text: 'Uses words about time, like "yesterday," "tomorrow," "morning," or "night"' },
        { key: '60mo_cog_4', text: 'Pays attention for 5 to 10 minutes during activities. For example, during story time or making arts and crafts' },
        { key: '60mo_cog_5', text: 'Writes some letters in her name' },
        { key: '60mo_cog_6', text: 'Names some letters when you point to them' },
      ]},
      { label: 'Movement/Physical Development', items: [
        { key: '60mo_motor_1', text: 'Buttons some buttons' },
        { key: '60mo_motor_2', text: 'Hops on one foot' },
      ]},
    ],
  },
]
