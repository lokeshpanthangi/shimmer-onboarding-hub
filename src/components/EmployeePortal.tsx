
import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Clock, Shield, Calendar, AlertTriangle, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sources?: Array<{
    filename: string;
    score: number;
    department: string;
  }>;
}

const API_BASE_URL = 'http://localhost:3001/api';

const EmployeePortal = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const departments = [
    { value: 'all', label: 'All Departments' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'it', label: 'Information Technology' },
    { value: 'finance', label: 'Finance' },
    { value: 'operations', label: 'Operations' },
    { value: 'legal', label: 'Legal' }
  ];

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

  const sendMessageToAPI = async (message: string): Promise<{ response: string; sources?: Array<{filename: string; score: number; department: string}> }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          department: selectedDepartment === 'all' ? undefined : selectedDepartment,
          conversationHistory: conversationHistory.slice(-10), // Keep last 10 messages for context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error(errorData.message || 'No relevant information found in company documents');
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        response: data.response,
        sources: data.sources || []
      };
    } catch (error) {
      console.error('Error calling chat API:', error);
      throw error;
     }
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

    // Update conversation history
    const newHistory = [...conversationHistory, { role: 'user', content: text }];
    setConversationHistory(newHistory);

    try {
      const apiResponse = await sendMessageToAPI(text);
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: apiResponse.response,
        sender: 'bot',
        timestamp: new Date(),
        sources: apiResponse.sources
      };
      
      setMessages(prev => [...prev, botResponse]);
      
      // Update conversation history with bot response
      setConversationHistory(prev => [...prev, { role: 'assistant', content: apiResponse.response }]);
      
      // Show success toast if sources were found
      if (apiResponse.sources && apiResponse.sources.length > 0) {
        toast({
          title: "Sources Found",
          description: `Found ${apiResponse.sources.length} relevant document(s) to answer your question.`,
        });
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || "Unable to process your request. Please ensure the backend server is running and try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
      
      const isNoDocumentsError = error.message?.includes('No relevant information found') || error.message?.includes('company documents');
      
      toast({
        title: isNoDocumentsError ? "No Information Found" : "Connection Error",
        description: isNoDocumentsError ? "No relevant company documents found for your question." : "Unable to connect to the HR knowledge base. Please try again.",
        variant: "destructive",
      });
    } finally {
       setIsTyping(false);
     }
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

      {/* Department Filter */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Department Filter</h3>
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
        >
          {departments.map((dept) => (
            <option key={dept.value} value={dept.value} className="bg-gray-800 text-white">
              {dept.label}
            </option>
          ))}
        </select>
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
                
                {/* Show sources for bot messages */}
                {message.sender === 'bot' && message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-xs text-white/70 mb-2">Sources:</p>
                    <div className="space-y-1">
                      {message.sources.map((source, idx) => (
                        <div key={idx} className="text-xs text-white/60 flex items-center justify-between">
                          <span>📄 {source.filename}</span>
                          <span className="text-green-300">{Math.round(source.score * 100)}% match</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
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
