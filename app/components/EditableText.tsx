"use client";

import { useState, useRef, useEffect } from "react";

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  startEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export default function EditableText({
  value,
  onSave,
  className = "",
  placeholder = "Clique para editar...",
  multiline = false,
  as = "p",
  startEditing = false,
  onEditingChange,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (startEditing && !isEditing) {
      setIsEditing(true);
    }
  }, [startEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      } else {
        inputRef.current.setSelectionRange(0, inputRef.current.value.length);
      }
    }
    if (onEditingChange) {
      onEditingChange(isEditing);
    }
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    setText(value);
  }, [value]);

  const handleSave = () => {
    if (text.trim() !== value) {
      onSave(text.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setText(value);
      setIsEditing(false);
    } else if (e.key === "Enter" && e.metaKey) {
      // Cmd/Ctrl + Enter to save in multiline
      handleSave();
    }
  };

  const Component = as;

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`${className} w-full resize-none border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400`}
          rows={3}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`${className} w-full border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zinc-500`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <Component
      onClick={() => setIsEditing(true)}
      className={`${className} cursor-text  rounded px-1 py-0.5 transition-colors ${
        !value && "opacity-40"
      }`}
      title="Clique para editar"
    >
      {value || placeholder}
    </Component>
  );
}
