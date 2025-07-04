
import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Clock, Shield, Calendar, AlertTriangle, Briefcase } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const EmployeePortal = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your HR Assistant. I'm here to help you with company policies, benefits, and any questions you might have. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickQuestions = [
    { text: "Company Holidays", icon: Calendar, color: "from-blue-400 to-purple-500" },
    { text: "Request Leave", icon: Clock, color: "from-green-400 to-blue-500" },
    { text: "Health Benefits", icon: Shield, color: "from-purple-400 to-pink-500" },
    { text: "Dress Code", icon: Briefcase, color: "from-yellow-400 to-orange-500" },
    { text: "Report Issue", icon: AlertTriangle, color: "from-red-400 to-pink-500" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('holiday') || lowerMessage.includes('vacation')) {
      return "Our company observes all federal holidays including New Year's Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, and Christmas. You can find the complete calendar in your employee portal under 'Company Calendar'. We also offer floating holidays that you can use at your discretion.";
    }
    
    if (lowerMessage.includes('leave') || lowerMessage.includes('time off')) {
      return "To request time off, please use the employee self-service portal. Go to 'My Time' section and submit your request at least 2 weeks in advance for vacation days. Sick leave can be requested with 24-hour notice when possible. Your manager will receive an automatic notification for approval.";
    }
    
    if (lowerMessage.includes('benefit') || lowerMessage.includes('health') || lowerMessage.includes('insurance')) {
      return "We offer comprehensive health benefits including medical, dental, and vision insurance. You also have access to a 401(k) plan with company matching, life insurance, and wellness programs. Open enrollment is held annually in November. Contact HR for specific details about your coverage.";
    }
    
    if (lowerMessage.includes('dress code') || lowerMessage.includes('attire')) {
      return "Our dress code is business casual. This means collared shirts, slacks or khakis, and closed-toe shoes for men. For women, this includes blouses, dress pants, skirts, or dresses that are knee-length or longer. Fridays are casual dress days. Please avoid shorts, flip-flops, or overly casual attire.";
    }
    
    if (lowerMessage.includes('issue') || lowerMessage.includes('problem') || lowerMessage.includes('report')) {
      return "If you need to report an issue, you can: 1) Contact your direct supervisor, 2) Reach out to HR directly via email or phone, 3) Use our anonymous reporting hotline at 1-800-ETHICS, or 4) Submit a confidential report through the employee portal. We take all concerns seriously and investigate promptly.";
    }
    
    return "Thank you for your question! I'd be happy to help you with HR-related topics like company policies, benefits, time off requests, or workplace procedures. Could you please provide more specific details about what you'd like to know?";
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateBotResponse(text),
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="space-y-6 animate-slide-in-right">
      {/* Chat Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">HR Assistant</h2>
            <p className="text-white/70">Always here to help with your questions</p>
          </div>
          <div className="ml-auto">
            <div className="flex items-center space-x-2 text-green-300">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Questions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickQuestions.map((question, index) => {
            const Icon = question.icon;
            return (
              <button
                key={question.text}
                onClick={() => handleQuickQuestion(question.text)}
                className="bg-white/10 hover:bg-white/20 rounded-xl p-4 text-center transition-all duration-300 hover:scale-105 animate-fade-in group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${question.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-white text-sm font-medium">{question.text}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-4'
                    : 'bg-white/20 text-white mr-4'
                } backdrop-blur-sm shadow-lg`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <p className={`text-xs mt-2 ${
                  message.sender === 'user' ? 'text-white/70' : 'text-white/50'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/20 text-white mr-4 px-4 py-3 rounded-2xl backdrop-blur-sm shadow-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-white/20 p-4">
          <div className="flex space-x-4">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full p-3 text-white transition-all duration-200 hover:scale-105"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePortal;
