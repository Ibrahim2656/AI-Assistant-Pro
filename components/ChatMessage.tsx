import React from 'react';
import type { Message } from '../types';
import { BotIcon, UserIcon } from './Icons';

export const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  return (
    <div className={`flex gap-3 ${message.sender === 'bot' ? 'items-start' : 'items-start justify-end'}`}>
      {message.sender === 'bot' && <BotIcon />}
      <div className={`flex flex-col gap-2 max-w-[80%] ${message.sender === 'bot' ? 'items-start' : 'items-end'}`}>
        <div className={`p-3 rounded-lg ${
          message.sender === 'bot' ? 'bg-gray-800' : 'bg-purple-500'
        }`}>
          <p className="whitespace-pre-wrap">{message.text}</p>
          {message.imageUrl && (
            <img 
              src={message.imageUrl} 
              alt="Generated or uploaded image"
              className="mt-2 rounded-lg max-w-full h-auto"
            />
          )}
          {message.files && message.files.map((file, index) => (
            <div key={index} className="mt-2">
              {file.startsWith('data:image') ? (
                <img 
                  src={file} 
                  alt={`Uploaded image ${index + 1}`} 
                  className="rounded-lg max-w-full h-auto"
                />
              ) : (
                <a 
                  href={file} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  View uploaded file {index + 1}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
      {message.sender === 'user' && <UserIcon />}
    </div>
  );
};