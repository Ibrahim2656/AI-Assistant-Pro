import React, { useState, useRef, useEffect } from 'react';
import type { Message } from './types';
import { getBotResponse } from './services/Service';
import { ReminderService } from './services/ReminderService';
import { EmbeddingService } from './services/EmbeddingService';
import { ChatInput } from './components/ChatInput';
import { ChatMessage } from './components/ChatMessage';
import { BotIcon } from './components/Icons';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      sender: 'bot',
      text: "👋 Hello! I'm your AI Assistant with advanced features:\n\n🤖 AI Reminder Agent: Tell me things like 'remind me to call mom tomorrow at 3pm'\n🎨  Image Generation : Ask me to 'generate an image of a sunset'\n🧠  Smart Memory : I remember our conversations and provide context-aware responses\n📎  File Analysis : Upload images or documents for analysis\n\nClick the ⚙️ button to see all features and memory status!\n\nHow can I help you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleSendMessage = async (inputText: string, files?: File[]) => {
    if (!inputText.trim() && (!files || files.length === 0)) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      files: files ? Array.from(files).map((file) => URL.createObjectURL(file)) : undefined,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const botResponse = await getBotResponse(inputText, files);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botResponse.text || 'Sorry, I could not process that.',
        imageUrl: botResponse.imageUrl,
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'An error occurred. Please try again later.',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const reminders = ReminderService.getReminders();
  const pendingReminders = reminders.filter((r) => r.status === 'pending');
  const memories = EmbeddingService.getMemories();

  const handleClearMemory = () => {
    if (confirm('Are you sure you want to clear all conversation memory? This cannot be undone.')) {
      EmbeddingService.clearMemories();
      setShowSettings(false);
      alert('✅ Memory cleared!');
    }
  };

  const handleClearReminders = () => {
    if (confirm('Are you sure you want to clear all reminders?')) {
      ReminderService.clearAllReminders();
      setShowReminders(false);
      alert('✅ Reminders cleared!');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm p-4 border-b border-gray-700 shadow-md">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            🤖 AI Assistant Pro
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowReminders(!showReminders)}
              className="relative px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              title="View Reminders"
            >
              ⏰ Reminders
              {pendingReminders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingReminders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="relative px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
              title="Settings & Features"
            >
              ⚙️ Features
              {memories.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {memories.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 border-b border-gray-700 p-4 max-h-96 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <h3 className="font-bold text-lg mb-4 text-cyan-400">🎯 AI Features & Settings</h3>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* AI Reminder Agent */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🤖</span>
                  <h4 className="font-bold text-purple-400">AI Reminder Agent</h4>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  Intelligent natural language reminder parsing using Gemini AI
                </p>
                <div className="text-xs text-gray-400">
                  <p>✅ Understands: "remind me to call mom tomorrow at 3pm"</p>
                  <p>✅ Handles: "don't forget my meeting in 2 hours"</p>
                  <p>✅ Active reminders: {pendingReminders.length}</p>
                </div>
              </div>

              {/* Embeddings & Memory */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🧠</span>
                  <h4 className="font-bold text-cyan-400">Smart Memory (Embeddings)</h4>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  RAG-based context retrieval using sentence transformers
                </p>
                <div className="text-xs text-gray-400">
                  <p>✅ Model: sentence-transformers/all-MiniLM-L6-v2</p>
                  <p>✅ Stored conversations: {memories.length}/100</p>
                  <p>✅ Provides context-aware responses</p>
                </div>
                <button
                  onClick={handleClearMemory}
                  className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                >
                  Clear Memory
                </button>
              </div>

              {/* Image Generation */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎨</span>
                  <h4 className="font-bold text-pink-400">Image Generation</h4>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  Create images using Stable Diffusion XL
                </p>
                <div className="text-xs text-gray-400">
                  <p>✅ Model: stabilityai/stable-diffusion-xl-base-1.0</p>
                  <p>✅ Try: "generate an image of a futuristic city"</p>
                  <p>✅ High-quality outputs with 30 inference steps</p>
                </div>
              </div>

              {/* File Analysis */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📎</span>
                  <h4 className="font-bold text-green-400">File Analysis</h4>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  Upload and analyze images, PDFs, and text files
                </p>
                <div className="text-xs text-gray-400">
                  <p>✅ Powered by Gemini 2.0 Flash</p>
                  <p>✅ Supports: images, PDFs, text files</p>
                  <p>✅ Vision capabilities for image understanding</p>
                </div>
              </div>
            </div>

            {/* Memory Preview */}
            {memories.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-bold text-cyan-400 mb-2">📚 Recent Conversation Memory</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {memories.slice(-5).reverse().map((memory) => (
                    <div key={memory.id} className="text-xs bg-gray-800 p-2 rounded">
                      <p className="text-gray-400">
                        {new Date(memory.timestamp).toLocaleString()}
                      </p>
                      <p className="text-white truncate">You: {memory.userMessage}</p>
                      <p className="text-cyan-300 truncate">Bot: {memory.botResponse}</p>
                      <p className="text-gray-500 text-[10px] mt-1">
                        Embedding: {memory.embedding?.length || 0} dimensions
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-gray-700 p-4 rounded-lg mt-4">
              <h4 className="font-bold text-yellow-400 mb-2">💡 How Embeddings Work</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>1️⃣ Your messages are converted to vector embeddings (384 dimensions)</li>
                <li>2️⃣ When you ask a question, we search for similar past conversations</li>
                <li>3️⃣ Top 3 relevant conversations are added as context to the AI</li>
                <li>4️⃣ This enables personalized, context-aware responses</li>
                <li>5️⃣ It's like a "fine-tuned" memory without actual model training</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reminders Panel */}
      {showReminders && (
        <div className="bg-gray-800 border-b border-gray-700 p-4 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">📋 Your Reminders:</h3>
            {reminders.length > 0 && (
              <button
                onClick={handleClearReminders}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
              >
                Clear All
              </button>
            )}
          </div>
          {reminders.length === 0 ? (
            <p className="text-gray-400">No reminders set. Try: "remind me to call mom tomorrow at 3pm"</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="bg-gray-700 p-2 rounded-lg text-sm flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span>{reminder.task}</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ml-2 ${
                          reminder.status === 'pending' ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                      >
                        {reminder.status}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      ⏰ {reminder.datetime.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      ReminderService.deleteReminder(reminder.id);
                      setShowReminders(false);
                      setTimeout(() => setShowReminders(true), 10);
                    }}
                    className="ml-2 text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center space-x-3 animate-pulse p-4">
            <div className="flex-shrink-0">
              <BotIcon />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-300"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700">
        <div className="max-w-3xl mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          <div className="text-center text-xs text-gray-500 mt-2 space-y-1">
            <p>💡 Examples: "remind me to call mom tomorrow at 3pm" | "generate an image of a robot"</p>
            <p className="text-green-400">
              🧠 Memory Active: {memories.length} conversations stored | Context-aware responses enabled
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;