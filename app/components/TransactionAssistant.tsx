/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { transactionAssistant } from '../services/transactionAssistant';
import { MessageCircle, Send } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
};

interface TransactionAssistantProps {
    txHash: string;
};

export const TransactionAssistant: React.FC<TransactionAssistantProps> = ({ txHash }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "Hi! I'm your Smart Transaction Assistant. Ask me anything about transactions, market trends, or tokens.",
            sender: 'assistant',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
        }
    }, [input]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await transactionAssistant.processQuery(input);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response,
                sender: 'assistant',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "I'm sorry, I encountered an error while processing your request. Please try again.",
                sender: 'assistant',
                timestamp: new Date()
            };

            console.error("Error processing query:", error);

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const exampleQueries = [
        `Explain transaction ${txHash}`,
        "How is PYUSD performing?",
        "What's the transaction volume?",
        "Tell me about token 0x6c3ea9036406852006290770bedfcaba0e23a0e8"
    ];

    const handleExampleClick = (query: string) => {
        setInput(query);
        inputRef.current?.focus();
    };

    const formatMessage = (text: string) => {
        const formattedText = text
            // Headers
            .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-3 mb-2">$1</h2>')
            .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-2 mb-1">$1</h3>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Inline code
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded">$1</code>')
            // Lists
            .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
            .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
            // Line breaks
            .replace(/\n/g, '<br />');
        
        return <div dangerouslySetInnerHTML={{ __html: formattedText }} />;
    };

    return (
        <>
            {/* Button to toggle chat */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={toggleChat}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center cursor-pointer"
                    aria-label="Toggle chat assistant"
                >
                    <MessageCircle size={24} />
                </button>
            </div>

            {/* Chat window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-132 h-[500px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex justify-between items-center">
                            <h2 className="font-bold text-lg text-black">Transaction Assistant</h2>
                            <button 
                                onClick={toggleChat}
                                className="text-gray-500 hover:text-red-700 cursor-pointer"
                                aria-label="Close chat"
                            >
                                &#120;
                            </button>
                        </div>
                    </div>
                    
                    {/* Message area */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`mb-4 ${ message.sender === 'user' ? 'text-right' : 'text-left' }`}
                            >
                                <div
                                    className={`
                                        inline-block p-3 rounded-lg max-w-[80%] text-pretty
                                        ${message.sender === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-none'}
                                        // Gaya penting agar teks tidak terpotong
                                        whitespace-pre-wrap break-words
                                    `}
                                >
                                    {formatMessage(message.text)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 whitespace-pre-line break-all text-pretty">
                                    {message.timestamp.toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start mb-4">
                                <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none">
                                    <div className="flex space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Example query - only show for new users with welcome message */}
                    {messages.length === 1 && (
                        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                            <div className="flex flex-wrap gap-2">
                                {exampleQueries.map((query, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleExampleClick(query)}
                                        className="text-xs bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-gray-700 cursor-pointer"
                                    >
                                        {query.length > 25 ? query.substring(0, 22) + '...' : query}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Area input */}
                    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 bg-white">
                        <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-100 rounded-lg px-4 py-2">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder="Type your message..."
                                    className="w-full bg-transparent focus:outline-none resize-none text-gray-800"
                                    rows={1}
                                    style={{ maxHeight: '150px', overflowY: 'auto' }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className={`
                                    rounded-full p-2 items-center justify-center
                                    ${isLoading || !input.trim()
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                    }
                                `}
                                aria-label="Send message"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            Press Enter to send, Shift+Enter for new line
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default TransactionAssistant;