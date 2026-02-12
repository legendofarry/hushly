import React, { useEffect, useState } from "react";
import { recordDateNightTrait } from "../../../services/gameAnswerService";

export default function DateNightStory({ defaultName = "", userId = "" }) {
  const [currentScene, setCurrentScene] = useState("start");
  const [relationshipScore, setRelationshipScore] = useState(50);
  const [choices, setChoices] = useState([]);
  const [characterName, setCharacterName] = useState("Alex");
  const [playerName, setPlayerName] = useState(defaultName);
  const [gameState, setGameState] = useState("nameInput"); // nameInput, playing, ending
  const [storyPath, setStoryPath] = useState([]);

  useEffect(() => {
    if (!playerName.trim() && defaultName.trim()) {
      setPlayerName(defaultName);
    }
  }, [defaultName, playerName]);

  // Story scenes with branching paths
  const scenes = {
    start: {
      background: "from-pink-400 to-rose-500",
      image: "☕",
      title: "Coffee Shop Encounter",
      text: `You're at your favorite coffee shop when you notice ${characterName} sitting alone, looking at their phone with a slight smile. You've seen them here before. This could be your chance...`,
      choices: [
        {
          text: "Smile and wave, then approach their table",
          next: "approach_confident",
          relationship: 5,
          trait: "confident",
        },
        {
          text: "Order their favorite drink and send it over",
          next: "approach_subtle",
          relationship: 3,
          trait: "thoughtful",
        },
        {
          text: "Wait for them to notice you first",
          next: "approach_shy",
          relationship: -2,
          trait: "cautious",
        },
      ],
    },

    approach_confident: {
      background: "from-blue-400 to-indigo-500",
      image: "😊",
      title: "Bold First Move",
      text: `${characterName} looks up as you approach. "Hey! I've seen you here before. Mind if I join you?" They smile warmly. "I was hoping you'd say something eventually! Please, sit down."`,
      choices: [
        {
          text: "Ask about what they're reading on their phone",
          next: "conversation_interests",
          relationship: 4,
          trait: "curious",
        },
        {
          text: "Compliment their style",
          next: "conversation_flirty",
          relationship: 6,
          trait: "flirty",
        },
        {
          text: "Share a funny story about the coffee shop",
          next: "conversation_humor",
          relationship: 5,
          trait: "funny",
        },
      ],
    },

    approach_subtle: {
      background: "from-purple-400 to-pink-500",
      image: "💝",
      title: "Sweet Gesture",
      text: `The barista brings the drink to ${characterName}, pointing at you. They look surprised and delighted. ${characterName} walks over to your table with a genuine smile. "That's really sweet! How did you know this was my favorite?"`,
      choices: [
        {
          text: "I've noticed you order it before - hope that's not creepy!",
          next: "conversation_honest",
          relationship: 7,
          trait: "observant",
        },
        {
          text: "Lucky guess! I have good intuition about people",
          next: "conversation_playful",
          relationship: 4,
          trait: "playful",
        },
        {
          text: "The barista mentioned it. Want to sit together?",
          next: "conversation_casual",
          relationship: 3,
          trait: "casual",
        },
      ],
    },

    approach_shy: {
      background: "from-indigo-400 to-purple-500",
      image: "👀",
      title: "Missed Connection?",
      text: `You wait, but ${characterName} seems absorbed in their phone. Just as you're about to leave, they look up and catch your eye. "Hey! I keep seeing you here. I'm ${characterName}. What's your name?"`,
      choices: [
        {
          text: "Introduce yourself warmly and explain you were shy",
          next: "conversation_honest",
          relationship: 2,
          trait: "honest",
        },
        {
          text: "Play it cool and ask if they come here often",
          next: "conversation_casual",
          relationship: 1,
          trait: "casual",
        },
      ],
    },

    conversation_interests: {
      background: "from-teal-400 to-cyan-500",
      image: "📚",
      title: "Shared Interests",
      text: `"Oh, just reading about this new art exhibit downtown," ${characterName} says excitedly. "I love modern art. Do you have any hobbies you're passionate about?" The conversation flows naturally.`,
      choices: [
        {
          text: "Share your love for art and suggest visiting together",
          next: "first_date_museum",
          relationship: 8,
          trait: "compatible",
        },
        {
          text: "Talk about your own different interests",
          next: "first_date_casual",
          relationship: 4,
          trait: "different",
        },
      ],
    },

    conversation_flirty: {
      background: "from-rose-400 to-pink-500",
      image: "😘",
      title: "Chemistry Building",
      text: `${characterName} blushes slightly. "You're pretty smooth, aren't you?" They lean in a bit closer. "I like that. Tell me, what else have you noticed about me?"`,
      choices: [
        {
          text: "Keep the flirty energy going with a playful response",
          next: "relationship_intense",
          relationship: 9,
          trait: "passionate",
        },
        {
          text: "Switch to deeper conversation to balance it out",
          next: "conversation_deep",
          relationship: 6,
          trait: "balanced",
        },
      ],
    },

    conversation_humor: {
      background: "from-yellow-400 to-orange-500",
      image: "😄",
      title: "Laughter & Connection",
      text: `${characterName} laughs genuinely at your story. "That's hilarious! I love your sense of humor. This barista drama is better than any TV show." They seem completely comfortable now.`,
      choices: [
        {
          text: "Suggest grabbing dinner to continue the conversation",
          next: "first_date_dinner",
          relationship: 7,
          trait: "spontaneous",
        },
        {
          text: "Exchange numbers and plan something for the weekend",
          next: "first_date_planned",
          relationship: 5,
          trait: "careful",
        },
      ],
    },

    conversation_honest: {
      background: "from-green-400 to-emerald-500",
      image: "💚",
      title: "Genuine Connection",
      text: `${characterName} looks touched by your honesty. "I really appreciate you being real with me. That's actually really refreshing. I've been hoping to talk to you too, but I wasn't sure how to start."`,
      choices: [
        {
          text: "Share more about yourself and ask about them",
          next: "conversation_deep",
          relationship: 8,
          trait: "open",
        },
        {
          text: "Suggest doing something together right now",
          next: "first_date_spontaneous",
          relationship: 6,
          trait: "spontaneous",
        },
      ],
    },

    conversation_playful: {
      background: "from-pink-400 to-purple-500",
      image: "😏",
      title: "Playful Banter",
      text: `"Oh really? What else does your intuition tell you about me?" ${characterName} asks with a mischievous smile, clearly enjoying the playful vibe.`,
      choices: [
        {
          text: "Make a clever guess about their personality",
          next: "relationship_fun",
          relationship: 7,
          trait: "witty",
        },
        {
          text: "Admit you're making it up and laugh together",
          next: "conversation_honest",
          relationship: 5,
          trait: "humble",
        },
      ],
    },

    conversation_casual: {
      background: "from-blue-400 to-cyan-500",
      image: "☺️",
      title: "Easy Going Chat",
      text: `The conversation flows easily. ${characterName} seems relaxed and comfortable. "This is nice. I don't usually talk to strangers, but you seem cool."`,
      choices: [
        {
          text: "Ask if they'd want to hang out sometime",
          next: "first_date_casual",
          relationship: 5,
          trait: "friendly",
        },
        {
          text: "Deepen the conversation with personal questions",
          next: "conversation_deep",
          relationship: 4,
          trait: "deeper",
        },
      ],
    },

    conversation_deep: {
      background: "from-indigo-400 to-blue-500",
      image: "💭",
      title: "Meaningful Conversation",
      text: `You both dive into deeper topics - dreams, values, what makes you happy. Time flies by. ${characterName} looks at their watch. "Wow, we've been talking for two hours! I haven't felt this connected to someone in a long time."`,
      choices: [
        {
          text: "Suggest continuing over dinner tonight",
          next: "first_date_dinner",
          relationship: 10,
          trait: "invested",
        },
        {
          text: "End on a high note and plan a proper date",
          next: "first_date_planned",
          relationship: 8,
          trait: "patient",
        },
      ],
    },

    relationship_intense: {
      background: "from-red-400 to-rose-600",
      image: "🔥",
      title: "Sparks Flying",
      text: `The chemistry between you is undeniable. ${characterName} reaches across the table and touches your hand. "I know we just met, but there's something special here. Want to get out of here?"`,
      choices: [
        {
          text: "Yes! Let's go on an adventure together",
          next: "ending_passionate",
          relationship: 15,
          trait: "bold",
        },
        {
          text: "Suggest a more planned first date instead",
          next: "first_date_planned",
          relationship: 6,
          trait: "cautious",
        },
      ],
    },

    relationship_fun: {
      background: "from-yellow-400 to-pink-500",
      image: "🎉",
      title: "Fun & Games",
      text: `You both are laughing so hard people are looking. ${characterName} wipes tears from their eyes. "This is the most fun I've had in forever! We should definitely do this again."`,
      choices: [
        {
          text: "Plan something fun for this weekend",
          next: "ending_friendship",
          relationship: 7,
          trait: "fun",
        },
        {
          text: "Suggest a romantic dinner date",
          next: "first_date_dinner",
          relationship: 8,
          trait: "romantic",
        },
      ],
    },

    first_date_museum: {
      background: "from-purple-400 to-indigo-500",
      image: "🎨",
      title: "The Art Date",
      text: `You spend the afternoon at the museum together. ${characterName} lights up when talking about each piece. As you stand in front of a romantic painting, they turn to you. "Thank you for this. I feel like I've known you forever."`,
      choices: [
        {
          text: "Hold their hand and express how you feel",
          next: "ending_romantic",
          relationship: 12,
          trait: "romantic",
        },
        {
          text: "Suggest grabbing dinner to keep the date going",
          next: "ending_perfect",
          relationship: 10,
          trait: "perfect",
        },
      ],
    },

    first_date_dinner: {
      background: "from-orange-400 to-red-500",
      image: "🍽️",
      title: "Dinner Date",
      text: `Over candlelight and good food, the conversation gets deeper. ${characterName} shares their dreams and listens intently to yours. As dessert arrives, they reach across the table for your hand.`,
      choices: [
        {
          text: "Lean in for a kiss",
          next: "ending_romantic",
          relationship: 13,
          trait: "bold",
        },
        {
          text: "Enjoy the moment and plan a second date",
          next: "ending_perfect",
          relationship: 11,
          trait: "steady",
        },
      ],
    },

    first_date_planned: {
      background: "from-green-400 to-teal-500",
      image: "📅",
      title: "Taking It Slow",
      text: `You exchange numbers and plan a proper date for the weekend. Over the next few days, the texts flow naturally. When the date finally happens, it's even better than you imagined.`,
      choices: [
        {
          text: "Continue building the relationship slowly",
          next: "ending_perfect",
          relationship: 9,
          trait: "stable",
        },
        {
          text: "Express stronger feelings",
          next: "ending_romantic",
          relationship: 10,
          trait: "honest",
        },
      ],
    },

    first_date_casual: {
      background: "from-blue-300 to-cyan-400",
      image: "🎮",
      title: "Keeping It Light",
      text: `You hang out a few times - coffee, walks, casual activities. ${characterName} is great company, but you're both keeping things light. After a few weeks, they bring up the question: "So... what are we?"`,
      choices: [
        {
          text: "Express desire for something more serious",
          next: "ending_romantic",
          relationship: 8,
          trait: "ready",
        },
        {
          text: "Suggest staying friends for now",
          next: "ending_friendship",
          relationship: 5,
          trait: "friends",
        },
      ],
    },

    first_date_spontaneous: {
      background: "from-pink-400 to-orange-500",
      image: "🌟",
      title: "Spontaneous Adventure",
      text: `"Let's not overthink this!" you both agree. You spend the whole day together - exploring the city, trying new foods, laughing constantly. As the sun sets, you find yourselves at the waterfront.`,
      choices: [
        {
          text: "Share a romantic moment watching the sunset",
          next: "ending_romantic",
          relationship: 11,
          trait: "romantic",
        },
        {
          text: "Keep the adventure spirit going",
          next: "ending_passionate",
          relationship: 10,
          trait: "adventurous",
        },
      ],
    },

    // ENDINGS

    ending_romantic: {
      background: "from-pink-500 to-rose-600",
      image: "💕",
      title: "A Love Story Begins",
      text: `Six months later, you and ${characterName} are inseparable. What started as a chance encounter at a coffee shop has blossomed into something beautiful. You've built a relationship on genuine connection, shared values, and deep affection.\n\n${characterName} often jokes that ordering that coffee was the best decision you ever made. Looking at them now, you couldn't agree more.\n\nYour relationship is built on: ${storyPath.includes("honest") ? "honesty" : ""} ${storyPath.includes("romantic") ? "romance" : ""} ${storyPath.includes("deep") ? "deep connection" : ""} and mutual respect.`,
      isEnding: true,
      endingType: "romantic",
      endingScore: "A+",
    },

    ending_perfect: {
      background: "from-purple-500 to-indigo-600",
      image: "✨",
      title: "The Perfect Match",
      text: `You and ${characterName} have found something rare - a relationship that feels effortless yet meaningful. You balance each other perfectly, bringing out the best in one another.\n\nFriends and family have noticed how happy you both are. What started as nervousness and uncertainty has transformed into confidence and joy.\n\n"I'm so glad I walked into that coffee shop," ${characterName} tells you. "Finding you felt like finding home."\n\nYour relationship thrives on: ${storyPath.includes("patient") ? "patience" : ""} ${storyPath.includes("balanced") ? "balance" : ""} ${storyPath.includes("perfect") ? "compatibility" : ""} and genuine care.`,
      isEnding: true,
      endingType: "perfect",
      endingScore: "S-Tier",
    },

    ending_passionate: {
      background: "from-red-500 to-orange-600",
      image: "🔥",
      title: "Burning Bright",
      text: `Your relationship with ${characterName} is intense, passionate, and thrilling. You both live in the moment, embracing spontaneity and adventure together.\n\nEvery day feels like a new adventure. Sure, things move fast, but when it feels this right, why wait?\n\n"Life's too short to play it safe," ${characterName} says, pulling you into an embrace. "I'm all in if you are."\n\nYour relationship is fueled by: ${storyPath.includes("bold") ? "boldness" : ""} ${storyPath.includes("passionate") ? "passion" : ""} ${storyPath.includes("spontaneous") ? "spontaneity" : ""} and living fully.`,
      isEnding: true,
      endingType: "passionate",
      endingScore: "A",
    },

    ending_friendship: {
      background: "from-yellow-400 to-amber-500",
      image: "🤝",
      title: "Best Friends Forever",
      text: `You and ${characterName} realized that while the romantic spark wasn't quite there, you've found something equally valuable - an amazing friendship.\n\nYou hang out regularly, support each other through ups and downs, and genuinely enjoy each other's company. Who knows? Maybe someday it could be more, but for now, this friendship is exactly what you both need.\n\n"Thanks for being real with me," ${characterName} says. "I'd rather have you as a true friend than force something that isn't right."\n\nYour friendship is built on: ${storyPath.includes("honest") ? "honesty" : ""} ${storyPath.includes("fun") ? "fun times" : ""} mutual respect and genuine care.`,
      isEnding: true,
      endingType: "friendship",
      endingScore: "B+",
    },
  };

  const handleChoice = (choice) => {
    const newScore = relationshipScore + choice.relationship;
    setRelationshipScore(Math.max(0, Math.min(100, newScore)));
    setChoices([
      ...choices,
      { scene: currentScene, choice: choice.text, impact: choice.relationship },
    ]);
    setStoryPath([...storyPath, choice.trait]);
    setCurrentScene(choice.next);
    if (userId && choice?.trait) {
      void recordDateNightTrait(userId, choice.trait);
    }
  };

  const resetGame = () => {
    setCurrentScene("start");
    setRelationshipScore(50);
    setChoices([]);
    setGameState("nameInput");
    setStoryPath([]);
    setPlayerName(defaultName);
  };

  const startGame = () => {
    if (playerName.trim()) {
      setGameState("playing");
    }
  };

  // Name Input Screen
  if (gameState === "nameInput") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full mb-4">
              <span className="text-white text-4xl" aria-hidden="true">
                ❤
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Date Night Story
            </h1>
            <p className="text-gray-600">Your choices shape your love story</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What's your name?
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && startGame()}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none text-gray-800"
              autoFocus
            />
          </div>

          <button
            onClick={startGame}
            disabled={!playerName.trim()}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold py-4 rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
          >
            Start Your Story
          </button>

          <div className="mt-6 space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-pink-500 text-sm" aria-hidden="true">
                💬
              </span>
              <span>Multiple branching paths</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pink-500 text-sm" aria-hidden="true">
                ❤
              </span>
              <span>Relationship tracking system</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pink-500 text-sm" aria-hidden="true">
                ✨
              </span>
              <span>4 unique endings to discover</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentSceneData = scenes[currentScene];

  // Ending Screen
  if (currentSceneData?.isEnding) {
    const getRelationshipLevel = () => {
      if (relationshipScore >= 80)
        return {
          label: "Soulmates",
          color: "from-pink-500 to-rose-600",
          icon: "💑",
        };
      if (relationshipScore >= 60)
        return {
          label: "Strong Bond",
          color: "from-purple-500 to-pink-500",
          icon: "💕",
        };
      if (relationshipScore >= 40)
        return {
          label: "Good Friends",
          color: "from-blue-500 to-indigo-500",
          icon: "🤝",
        };
      return {
        label: "Acquaintances",
        color: "from-gray-500 to-slate-500",
        icon: "👋",
      };
    };

    const relationshipLevel = getRelationshipLevel();

    return (
      <div
        className={`min-h-screen bg-gradient-to-br ${currentSceneData.background} flex items-center justify-center p-4`}
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{currentSceneData.image}</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {currentSceneData.title}
            </h2>
            <div
              className={`inline-block bg-gradient-to-r ${relationshipLevel.color} text-white px-4 py-2 rounded-full font-semibold mb-4`}
            >
              {currentSceneData.endingScore} -{" "}
              {currentSceneData.endingType.toUpperCase()}
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {currentSceneData.text}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-pink-500 text-base" aria-hidden="true">
                  ❤
                </span>
                <span className="font-semibold text-gray-700">Final Score</span>
              </div>
              <div className="text-3xl font-bold text-pink-600">
                {relationshipScore}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {relationshipLevel.label} {relationshipLevel.icon}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-500 text-base" aria-hidden="true">
                  💬
                </span>
                <span className="font-semibold text-gray-700">
                  Choices Made
                </span>
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {choices.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Your unique path</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-base" aria-hidden="true">
                👥
              </span>
              Your Story Journey
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {choices.map((choice, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{choice.choice}</span>
                    <span
                      className={`flex items-center gap-1 font-semibold ${choice.impact > 0 ? "text-green-600" : choice.impact < 0 ? "text-red-600" : "text-gray-600"}`}
                    >
                      {choice.impact > 0 ? (
                        <span className="text-sm" aria-hidden="true">
                          ▲
                        </span>
                      ) : choice.impact < 0 ? (
                        <span className="text-sm" aria-hidden="true">
                          ▼
                        </span>
                      ) : null}
                      {choice.impact > 0 ? "+" : ""}
                      {choice.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={resetGame}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
          >
            <span className="text-lg" aria-hidden="true">
              ↺
            </span>
            Start a New Story
          </button>

          <p className="text-center text-gray-600 text-sm mt-4">
            Explore different choices to discover all 4 endings!
          </p>
        </div>
      </div>
    );
  }

  // Main Game Screen
  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${currentSceneData.background} flex items-center justify-center p-4`}
    >
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-pink-500 text-base" aria-hidden="true">
                ❤
              </span>
              <span className="font-bold text-gray-800">Date Night Story</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">
                {playerName} & {characterName}
              </span>
            </div>
          </div>

          {/* Relationship Meter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Connection Level
              </span>
              <span className="font-bold text-pink-600">
                {relationshipScore}/100
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-500"
                style={{ width: `${relationshipScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Story Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[80vh]">
          {/* Scene Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 text-white">
            <div className="text-6xl text-center mb-3">
              {currentSceneData.image}
            </div>
            <h2 className="text-2xl font-bold text-center">
              {currentSceneData.title}
            </h2>
          </div>

          {/* Story Text */}
          <div className="p-8">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 mb-6">
              <p className="text-gray-700 leading-relaxed text-lg">
                {currentSceneData.text}
              </p>
            </div>

            {/* Choices */}
            <div className="space-y-4 overflow-y-auto max-h-[30vh]">
              <p className="font-semibold text-gray-700 text-sm mb-3 sticky top-0 bg-white/90 backdrop-blur-sm p-2 rounded-tl-2xl rounded-tr-2xl shadow z-10">
                How do you respond?
              </p>
              {currentSceneData.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoice(choice)}
                  className="w-full bg-gradient-to-r from-white to-gray-50 hover:from-pink-50 hover:to-rose-50 border-2 border-gray-200 hover:border-pink-300 rounded-2xl p-5 transition-all transform hover:scale-102 hover:shadow-lg text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium group-hover:text-pink-700 transition-colors">
                        {choice.text}
                      </p>
                    </div>
                    <div
                      className={`ml-3 px-3 py-1 rounded-full text-xs font-bold ${
                        choice.relationship > 5
                          ? "bg-green-100 text-green-700"
                          : choice.relationship > 0
                            ? "bg-blue-100 text-blue-700"
                            : choice.relationship < 0
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {choice.relationship > 0 ? "+" : ""}
                      {choice.relationship}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Choice Counter */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Choices made: {choices.length}</span>
                <span className="flex items-center gap-1">
                  <span className="text-sm" aria-hidden="true">
                    ☕
                  </span>
                  Your story continues...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
