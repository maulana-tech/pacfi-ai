import React from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  required?: boolean;
}

export default function Input({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  required = false,
}: InputProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-900 mb-2">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          px-3 py-2 border rounded-md text-base font-normal
          bg-white text-gray-900 placeholder-gray-500
          border-gray-300 focus:border-primary focus:outline-none
          focus:ring-2 focus:ring-blue-100
          disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed
          transition-all duration-200
          ${error ? 'border-danger focus:ring-red-100' : ''}
        `}
      />
      {error && <p className="text-sm text-danger mt-1">{error}</p>}
    </div>
  );
}
