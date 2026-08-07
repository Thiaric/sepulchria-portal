import { RichTextContent } from "@/components/editor/rich-text-content";

export function RichMessageContent({
  body,
}: {
  body: string;
}) {
  return <RichTextContent body={body} />;
}
