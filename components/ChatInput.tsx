import React, { useState, useRef } from 'react';


interface ChatInputProps {
  onSendMessage: (text: string, files?: File[]) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() || selectedFiles.length > 0) {
      onSendMessage(inputText, selectedFiles);
      setInputText('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          📎
        </label>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (!inputText.trim() && !selectedFiles.length)}
          className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="bg-gray-800 px-2 py-1 rounded-md text-sm">
              {file.name}
            </div>
          ))}
        </div>
      )}
    </form>
  );
};
