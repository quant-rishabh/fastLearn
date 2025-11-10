'use client';

import { useState, useEffect, useRef } from 'react';
import { sendChatMessage, getChatHistory } from '@/utils/workoutDatabase';

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  message_type: string;
  created_at: string;
}

interface ChatComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatComponent({ isOpen, onClose }: ChatComponentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messageType, setMessageType] = useState('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    try {
      const response = await getChatHistory(20);
      if (response.success) {
        setMessages(response.chatHistory);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userMessage, messageType);
      if (response.success) {
        // Add the new message to the chat
        const newMessage: ChatMessage = {
          id: response.chatId || Date.now().toString(),
          message: userMessage,
          response: response.message,
          message_type: messageType,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        message: userMessage,
        response: "I'm sorry, I couldn't process your message right now. Please try again.",
        message_type: 'error',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    { text: "How many calories should I eat today?", type: "nutrition" },
    { text: "What exercises burn the most calories?", type: "workout" },
    { text: "How am I progressing toward my goal?", type: "progress" },
    { text: "Give me motivation to continue", type: "general" }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <h3 className="text-xl font-semibold text-white">🤖 Fitness Coach AI</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Message Type Selector */}
        <div className="p-3 border-b border-gray-700">
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-3 py-1 text-sm border border-gray-600 focus:border-blue-400"
          >
            <option value="general">💬 General Chat</option>
            <option value="workout">💪 Workout Advice</option>
            <option value="nutrition">🍽️ Nutrition Help</option>
            <option value="progress">📊 Progress Review</option>
          </select>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <div className="text-6xl mb-4">🤖</div>
              <h4 className="text-lg font-semibold mb-2">Welcome to your Fitness Coach!</h4>
              <p className="text-sm mb-4">Ask me anything about your workout, nutrition, or progress.</p>
              
              {/* Predefined Quick Questions */}
              <div className="grid grid-cols-1 gap-2 mb-4">
                <h5 className="text-xs font-semibold text-gray-300 mb-2">💡 Quick Questions:</h5>
                {[
                  { text: "How many calories do I have left today?", type: "progress" },
                  { text: "What's my current weight loss progress?", type: "progress" },
                  { text: "What exercises burn the most calories?", type: "workout" },
                  { text: "What should I eat to reach my protein goal?", type: "nutrition" },
                  { text: "How can I stay motivated?", type: "general" }
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentMessage(question.text);
                      setMessageType(question.type);
                    }}
                    className="text-left text-xs bg-gray-600 hover:bg-gray-500 rounded px-2 py-1 transition-colors"
                  >
                    {question.text}
                  </button>
                ))}
              </div>
              
              {/* Quick Questions */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                {quickQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentMessage(q.text);
                      setMessageType(q.type);
                    }}
                    className="block w-full text-left text-sm bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 transition-colors"
                  >
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="space-y-3">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs text-blue-200 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              {/* AI Response */}
              <div className="flex justify-start">
                <div className="bg-gray-700 text-white rounded-lg px-4 py-2 max-w-[80%]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                      {msg.message_type === 'workout' && '💪'}
                      {msg.message_type === 'nutrition' && '🍽️'}
                      {msg.message_type === 'progress' && '📊'}
                      {msg.message_type === 'general' && '💬'}
                      {msg.message_type === 'error' && '❌'}
                      {msg.message_type}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.response}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-white rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex gap-3">
            <textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about workouts, nutrition, progress, or anything fitness related..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                '✈️'
              )}
              Send
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 Tip: Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}