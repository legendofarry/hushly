import React, { useState } from "react";
import { recordHushQuizAnswer } from "../../../services/gameAnswerService";

export default function HushQuiz({ userId = "" }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameState, setGameState] = useState("playing"); // playing, complete
  const [choices, setChoices] = useState([]);

  const scenarios = [
    {
      id: 1,
      title: "First Date Vibe",
      question: "What's your ideal first date?",
      optionA: { text: "Cozy coffee chat", emoji: "☕", points: 10 },
      optionB: { text: "Adventure activity", emoji: "🎢", points: 10 }
    },
    {
      id: 2,
      title: "Weekend Energy",
      question: "How do you spend a perfect Saturday?",
      optionA: { text: "Brunch & museum", emoji: "🎨", points: 10 },
      optionB: { text: "Hiking & outdoors", emoji: "🏔️", points: 10 }
    },
    {
      id: 3,
      title: "Food Philosophy",
      question: "Your go-to meal choice?",
      optionA: { text: "Try new cuisines", emoji: "🍜", points: 10 },
      optionB: { text: "Classic favorites", emoji: "🍕", points: 10 }
    },
    {
      id: 4,
      title: "Social Scene",
      question: "Ideal Friday night?",
      optionA: { text: "Intimate dinner", emoji: "🕯️", points: 10 },
      optionB: { text: "Party with friends", emoji: "🎉", points: 10 }
    },
    {
      id: 5,
      title: "Travel Style",
      question: "Dream vacation looks like?",
      optionA: { text: "Beach relaxation", emoji: "🏖️", points: 10 },
      optionB: { text: "City exploration", emoji: "🌆", points: 10 }
    },
    {
      id: 6,
      title: "Communication",
      question: "How do you prefer to connect?",
      optionA: { text: "Deep conversations", emoji: "💭", points: 10 },
      optionB: { text: "Fun activities", emoji: "🎮", points: 10 }
    },
    {
      id: 7,
      title: "Morning Person?",
      question: "When are you most energetic?",
      optionA: { text: "Early bird", emoji: "🌅", points: 10 },
      optionB: { text: "Night owl", emoji: "🌙", points: 10 }
    },
    {
      id: 8,
      title: "Netflix & Chill",
      question: "What's on your watch list?",
      optionA: { text: "Romantic comedies", emoji: "😂", points: 10 },
      optionB: { text: "Thrillers & action", emoji: "🎬", points: 10 }
    },
    {
      id: 9,
      title: "Pet Preference",
      question: "Your perfect pet companion?",
      optionA: { text: "Cuddly cat", emoji: "🐱", points: 10 },
      optionB: { text: "Energetic dog", emoji: "🐶", points: 10 }
    },
    {
      id: 10,
      title: "Fitness Routine",
      question: "How do you stay active?",
      optionA: { text: "Yoga & meditation", emoji: "🧘", points: 10 },
      optionB: { text: "Gym & sports", emoji: "🏋️", points: 10 }
    },
    {
      id: 11,
      title: "Music Mood",
      question: "What's your music vibe?",
      optionA: { text: "Chill & acoustic", emoji: "🎸", points: 10 },
      optionB: { text: "Upbeat & dance", emoji: "🎵", points: 10 }
    },
    {
      id: 12,
      title: "Work Style",
      question: "Your ideal work environment?",
      optionA: { text: "Remote & flexible", emoji: "💻", points: 10 },
      optionB: { text: "Office & team", emoji: "🏢", points: 10 }
    },
    {
      id: 13,
      title: "Celebration Mode",
      question: "How do you celebrate wins?",
      optionA: { text: "Quiet reflection", emoji: "🙏", points: 10 },
      optionB: { text: "Big party", emoji: "🎊", points: 10 }
    },
    {
      id: 14,
      title: "Creative Outlet",
      question: "Your favorite hobby?",
      optionA: { text: "Reading & writing", emoji: "📚", points: 10 },
      optionB: { text: "Arts & crafts", emoji: "🎨", points: 10 }
    },
    {
      id: 15,
      title: "Shopping Style",
      question: "How do you shop?",
      optionA: { text: "Online browsing", emoji: "📱", points: 10 },
      optionB: { text: "Mall exploration", emoji: "🛍️", points: 10 }
    },
    {
      id: 16,
      title: "Date Night Food",
      question: "Perfect dinner setting?",
      optionA: { text: "Home cooked meal", emoji: "🍳", points: 10 },
      optionB: { text: "Fancy restaurant", emoji: "🍽️", points: 10 }
    },
    {
      id: 17,
      title: "Weather Preference",
      question: "Your ideal climate?",
      optionA: { text: "Warm & sunny", emoji: "☀️", points: 10 },
      optionB: { text: "Cool & breezy", emoji: "🍂", points: 10 }
    },
    {
      id: 18,
      title: "Learning Style",
      question: "How do you grow?",
      optionA: { text: "Books & courses", emoji: "📖", points: 10 },
      optionB: { text: "Hands-on practice", emoji: "🔧", points: 10 }
    },
    {
      id: 19,
      title: "Texting Habits",
      question: "How do you text?",
      optionA: { text: "Thoughtful replies", emoji: "✍️", points: 10 },
      optionB: { text: "Quick responses", emoji: "⚡", points: 10 }
    },
    {
      id: 20,
      title: "Gift Giving",
      question: "Your gifting style?",
      optionA: { text: "Sentimental gifts", emoji: "💝", points: 10 },
      optionB: { text: "Practical items", emoji: "🎁", points: 10 }
    },
    {
      id: 21,
      title: "Photo Style",
      question: "Your camera roll is full of?",
      optionA: { text: "Selfies & people", emoji: "🤳", points: 10 },
      optionB: { text: "Nature & places", emoji: "📸", points: 10 }
    },
    {
      id: 22,
      title: "Stress Relief",
      question: "How do you unwind?",
      optionA: { text: "Spa & self-care", emoji: "🛀", points: 10 },
      optionB: { text: "Sports & exercise", emoji: "⚽", points: 10 }
    },
    {
      id: 23,
      title: "Gaming Choice",
      question: "Preferred game type?",
      optionA: { text: "Strategy & puzzle", emoji: "🧩", points: 10 },
      optionB: { text: "Action & racing", emoji: "🏎️", points: 10 }
    },
    {
      id: 24,
      title: "Sweet Tooth",
      question: "Dessert preference?",
      optionA: { text: "Ice cream", emoji: "🍦", points: 10 },
      optionB: { text: "Chocolate cake", emoji: "🍰", points: 10 }
    },
    {
      id: 25,
      title: "Drink Choice",
      question: "Go-to beverage?",
      optionA: { text: "Tea lover", emoji: "🍵", points: 10 },
      optionB: { text: "Coffee addict", emoji: "☕", points: 10 }
    }
  ];

  const handleSwipe = (direction) => {
    if (isAnimating || gameState === 'complete') return;
    
    setIsAnimating(true);
    setSwipeDirection(direction);
    
    const choice = direction === 'left' 
      ? scenarios[currentCard].optionA 
      : scenarios[currentCard].optionB;
    const choiceKey = direction === "left" ? "A" : "B";
    if (userId) {
      void recordHushQuizAnswer(
        userId,
        String(scenarios[currentCard].id),
        choiceKey,
      );
    }
    
    const newScore = score + choice.points;
    const newStreak = streak + 1;
    
    setScore(newScore);
    setStreak(newStreak);
    setChoices([...choices, {
      scenario: scenarios[currentCard].title,
      choice: choice.text,
      emoji: choice.emoji
    }]);

    setTimeout(() => {
      if (currentCard < scenarios.length - 1) {
        setCurrentCard(currentCard + 1);
        setSwipeDirection(null);
        setIsAnimating(false);
      } else {
        setGameState('complete');
        setIsAnimating(false);
      }
    }, 500);
  };

  const resetGame = () => {
    setCurrentCard(0);
    setScore(0);
    setStreak(0);
    setSwipeDirection(null);
    setIsAnimating(false);
    setGameState('playing');
    setChoices([]);
  };

  const getPersonalityType = () => {
    const adventureCount = choices.filter(c => 
      ['Adventure activity', 'Hiking & outdoors', 'City exploration', 'Party with friends', 
       'Energetic dog', 'Gym & sports', 'Upbeat & dance', 'Big party', 'Mall exploration',
       'Fancy restaurant', 'Hands-on practice', 'Quick responses', 'Sports & exercise',
       'Action & racing'].includes(c.choice)
    ).length;
    
    const introvertCount = choices.filter(c =>
      ['Cozy coffee chat', 'Intimate dinner', 'Deep conversations', 'Reading & writing',
       'Thoughtful replies', 'Sentimental gifts', 'Spa & self-care', 'Strategy & puzzle',
       'Tea lover', 'Cuddly cat', 'Yoga & meditation', 'Chill & acoustic'].includes(c.choice)
    ).length;
    
    const creativeCount = choices.filter(c =>
      ['Brunch & museum', 'Try new cuisines', 'Arts & crafts', 'Reading & writing',
       'Nature & places', 'Strategy & puzzle'].includes(c.choice)
    ).length;
    
    // Determine primary and secondary traits
    if (adventureCount >= 13) {
      return { 
        type: "The Bold Adventurer", 
        desc: "You're spontaneous, energetic, and always ready for the next thrill!",
        traits: ["Outgoing", "Active", "Social"]
      };
    } else if (adventureCount >= 9) {
      return { 
        type: "The Dynamic Explorer", 
        desc: "You balance excitement with purpose, seeking meaningful adventures!",
        traits: ["Versatile", "Curious", "Energetic"]
      };
    } else if (introvertCount >= 13) {
      return { 
        type: "The Gentle Soul", 
        desc: "You value deep connections and cherish intimate, meaningful moments!",
        traits: ["Thoughtful", "Empathetic", "Loyal"]
      };
    } else if (creativeCount >= 10) {
      return { 
        type: "The Creative Dreamer", 
        desc: "You see beauty everywhere and express yourself through art and imagination!",
        traits: ["Artistic", "Imaginative", "Cultured"]
      };
    } else if (introvertCount >= 9) {
      return { 
        type: "The Mindful Companion", 
        desc: "You appreciate quality over quantity in all aspects of life!",
        traits: ["Reflective", "Warm", "Genuine"]
      };
    } else {
      return { 
        type: "The Balanced Harmonizer", 
        desc: "You blend the best of all worlds, adapting to any situation with grace!",
        traits: ["Flexible", "Open-minded", "Well-rounded"]
      };
    }
  };

  if (gameState === "complete") {
    const personality = getPersonalityType();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
              <span className="text-white text-4xl" aria-hidden="true">
                🏆
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Profile Complete!</h2>
            <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-4 mb-4">
              <p className="text-lg font-semibold text-purple-700">{personality.type}</p>
              <p className="text-sm text-gray-600 mt-1">{personality.desc}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {personality.traits.map((trait, idx) => (
                  <span key={idx} className="bg-white px-3 py-1 rounded-full text-xs font-medium text-purple-600">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3">
              <span className="text-gray-700 font-medium">Total Score</span>
              <span className="text-2xl font-bold text-indigo-600">{score}</span>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-3">
              <span className="text-gray-700 font-medium">Perfect Streak</span>
              <span className="text-2xl font-bold text-rose-600">{streak} 🔥</span>
            </div>
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3">
              <span className="text-gray-700 font-medium">Questions Answered</span>
              <span className="text-2xl font-bold text-emerald-600">{choices.length}</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Dating DNA:</h3>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {choices.map((choice, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-2 text-center hover:bg-gray-100 transition-colors">
                  <div className="text-xl mb-1">{choice.emoji}</div>
                  <div className="text-xs text-gray-600 font-medium line-clamp-2">{choice.choice}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={resetGame}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
          >
            <span className="text-white text-lg" aria-hidden="true">
              ↺
            </span>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const scenario = scenarios[currentCard];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 text-white">
          <div className="flex items-center gap-2">
            <span className="text-white text-xl" aria-hidden="true">
              ✨
            </span>
            <span className="font-bold text-xl">Match Maker</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-yellow-300 text-sm" aria-hidden="true">
                ★
              </span>
              <span className="font-semibold">{score}</span>
            </div>
            <div className="text-sm font-medium bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              {currentCard + 1}/{scenarios.length}
            </div>
          </div>
        </div>

        {/* Streak Badge */}
        {streak > 2 && (
          <div className="mb-4 text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold px-4 py-2 rounded-full shadow-lg animate-pulse">
              🔥 {streak} Streak!
            </div>
          </div>
        )}

        {/* Card */}
        <div className={`relative transition-all duration-500 ${
          swipeDirection === 'left' ? '-translate-x-full rotate-12 opacity-0' :
          swipeDirection === 'right' ? 'translate-x-full -rotate-12 opacity-0' :
          'translate-x-0 rotate-0 opacity-100'
        }`}>
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-pink-400 to-purple-500 p-6 text-white">
              <div className="text-sm font-semibold opacity-90 mb-1">{scenario.title}</div>
              <h2 className="text-2xl font-bold">{scenario.question}</h2>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Option A */}
                <button
                  onClick={() => handleSwipe('left')}
                  disabled={isAnimating}
                  className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 rounded-2xl p-6 transition-all transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{scenario.optionA.emoji}</div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-800 text-lg">{scenario.optionA.text}</div>
                        <div className="text-sm text-gray-500">+{scenario.optionA.points} points</div>
                      </div>
                    </div>
                    <span className="text-blue-500 text-2xl" aria-hidden="true">
                      ✕
                    </span>
                  </div>
                </button>

                {/* VS Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm font-semibold text-gray-400">OR</span>
                  </div>
                </div>

                {/* Option B */}
                <button
                  onClick={() => handleSwipe('right')}
                  disabled={isAnimating}
                  className="w-full bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 border-2 border-pink-200 rounded-2xl p-6 transition-all transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{scenario.optionB.emoji}</div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-800 text-lg">{scenario.optionB.text}</div>
                        <div className="text-sm text-gray-500">+{scenario.optionB.points} points</div>
                      </div>
                    </div>
                    <span className="text-pink-500 text-2xl" aria-hidden="true">
                      ❤
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pb-6">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${((currentCard + 1) / scenarios.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-white/80 text-sm">
          <p>Choose your preference to build your perfect date profile!</p>
        </div>
      </div>
    </div>
  );
}
