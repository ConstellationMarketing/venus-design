import { useState, useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Mark, mergeAttributes } from "@tiptap/core";
import { supabase } from "@/lib/supabase";
import { compressToWebP } from "@/lib/imageCompression";
import { toast } from "sonner";
import { normalizeCmsLinkHref } from "./richTextLink";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Unlink,
  Heading2,
  Heading3,
  Heading4,
  Paintbrush,
  List,
  ListOrdered,
  Quote,
  ImagePlus,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Custom TipTap Mark: AccentColor                                    */
/*  Wraps selected text in <span class="text-brand-accent">             */
/* ------------------------------------------------------------------ */
const AccentColor = Mark.create({
  name: "accentColor",

  parseHTML() {
    return [
      {
        tag: "span.text-brand-accent",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { class: "text-brand-accent" }),
      0,
    ];
  },

});

/* ------------------------------------------------------------------ */

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing…",
  minHeight = "120px",
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        bulletList: {},
        orderedList: {},
        blockquote: {},
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({ placeholder }),
      Typography,
      AccentColor,
    ],
    content: value,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync external value changes (e.g. reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleAccent = useCallback(() => {
    editor?.chain().focus().toggleMark("accentColor").run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const openLinkInput = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes("link").href ?? "";
    setLinkUrl(existing);
    setShowLinkInput(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl.trim()) {
      const href = normalizeCmsLinkHref(linkUrl);
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor || !file.type.startsWith("image/")) return;

      setUploadingImage(true);
      try {
        // Compress to WebP before uploading
        const { blob, ext } = await compressToWebP(file);

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `blog-images/${timestamp}-${randomStr}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, blob, {
            cacheControl: "3600",
            upsert: false,
            contentType: ext === "webp" ? "image/webp" : file.type,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(fileName);

        editor
          .chain()
          .focus()
          .setImage({ src: urlData.publicUrl, alt: file.name })
          .run();
      } catch (err) {
        console.error("Image upload error:", err);
        toast.error("Failed to upload image. Please try again.");
      } finally {
        setUploadingImage(false);
      }
    },
    [editor],
  );

  const onImageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageUpload(file);
      e.target.value = "";
    },
    [handleImageUpload],
  );

  if (!editor) return null;

  return (
    <div
      className="tiptap-editor"
      style={{ ["--tiptap-min-height" as string]: minHeight }}
    >
      {/* Hidden file input for image uploads */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={onImageInputChange}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-1 border border-b-0 rounded-t-md border-[hsl(var(--border))] bg-gray-50 px-2 py-1 flex-wrap">
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("heading", { level: 4 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 4 }).run()
          }
          title="Heading 4"
        >
          <Heading4 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={toggleBold}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={toggleItalic}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={toggleBulletList}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={toggleOrderedList}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={toggleBlockquote}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          active={editor.isActive("accentColor")}
          onClick={toggleAccent}
          title="Accent Color"
        >
          <Paintbrush className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          active={editor.isActive("link")}
          onClick={openLinkInput}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        {editor.isActive("link") && (
          <ToolbarButton
            active={false}
            onClick={removeLink}
            title="Remove Link"
          >
            <Unlink className="h-4 w-4" />
          </ToolbarButton>
        )}

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton
          active={false}
          onClick={() => imageInputRef.current?.click()}
          title="Insert Image"
          disabled={uploadingImage}
        >
          {uploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </ToolbarButton>
      </div>

      {/* Inline link input bar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 border border-b-0 border-[hsl(var(--border))] bg-blue-50 px-3 py-1.5">
          <span className="text-xs text-gray-500 shrink-0">URL:</span>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyLink()}
            placeholder="/about/ or https://example.com"
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400"
            autoFocus
          />
          <button
            type="button"
            onClick={applyLink}
            className="text-xs font-medium bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
function ToolbarButton({
  active,
  onClick,
  title,
  children,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : active
            ? "bg-gray-300 text-black"
            : "text-gray-600 hover:bg-gray-200 hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}
