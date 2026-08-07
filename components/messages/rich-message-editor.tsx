"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import type { PrivateMessageMode } from "@/types/messages";

type RichMessageEditorProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  mode: PrivateMessageMode;
  placeholder: string;
};

export function RichMessageEditor({
  value,
  onChange,
  maxLength,
  placeholder,
}: RichMessageEditorProps) {
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      maxLength={maxLength}
      rows={6}
      placeholder={placeholder}
      variant="message"
    />
  );
}
