import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    Heading1, Heading2, Heading3,
    List, ListOrdered,
    Quote, Code, Minus,
    AlignLeft, AlignCenter, AlignRight,
    Undo2, Redo2, Pilcrow, Type
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

// --- Toolbar Button ---
const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}> = ({ onClick, isActive, disabled, title, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`
         p-1.5 rounded-md transition-all duration-200 flex items-center justify-center
         ${isActive
                ? 'bg-earth text-cream shadow-sm'
                : 'text-earth/50 hover:text-earth hover:bg-earth/5'
            }
         ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
        {children}
    </button>
);

// --- Toolbar Divider ---
const ToolbarDivider = () => (
    <div className="w-px h-5 bg-earth/10 mx-1" />
);

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Start writing your story...'
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose-blog focus:outline-none min-h-[320px] px-6 py-5 font-serif text-lg leading-relaxed text-earth',
            },
        },
    });

    // Sync external value changes (e.g., loading a different post)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '');
        }
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!editor) return null;

    const iconSize = 15;

    return (
        <div className="border border-earth/10 rounded-xl bg-white shadow-sm">
            {/* Toolbar — sticky so it floats when scrolling long posts */}
            <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur-sm border-b border-earth/10 px-3 py-2 flex flex-wrap items-center gap-0.5 shadow-sm rounded-t-xl">

                {/* Text Style Group */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    isActive={editor.isActive('paragraph') && !editor.isActive('heading')}
                    title="Normal text"
                >
                    <Pilcrow size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Title (H1)"
                >
                    <Heading1 size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Subtitle (H2)"
                >
                    <Heading2 size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="Section heading (H3)"
                >
                    <Heading3 size={iconSize} />
                </ToolbarButton>

                <ToolbarDivider />

                {/* Inline Formatting Group */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold (⌘B)"
                >
                    <Bold size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic (⌘I)"
                >
                    <Italic size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    title="Underline (⌘U)"
                >
                    <UnderlineIcon size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    title="Strikethrough"
                >
                    <Strikethrough size={iconSize} />
                </ToolbarButton>

                <ToolbarDivider />

                {/* List Group */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet list"
                >
                    <List size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numbered list"
                >
                    <ListOrdered size={iconSize} />
                </ToolbarButton>

                <ToolbarDivider />

                {/* Block Elements Group */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Quote / Excerpt"
                >
                    <Quote size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Code block"
                >
                    <Code size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    title="Divider"
                >
                    <Minus size={iconSize} />
                </ToolbarButton>

                <ToolbarDivider />

                {/* Alignment Group */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    isActive={editor.isActive({ textAlign: 'left' })}
                    title="Align left"
                >
                    <AlignLeft size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    isActive={editor.isActive({ textAlign: 'center' })}
                    title="Align center"
                >
                    <AlignCenter size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    isActive={editor.isActive({ textAlign: 'right' })}
                    title="Align right"
                >
                    <AlignRight size={iconSize} />
                </ToolbarButton>

                <ToolbarDivider />

                {/* Undo/Redo */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo (⌘Z)"
                >
                    <Undo2 size={iconSize} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo (⌘⇧Z)"
                >
                    <Redo2 size={iconSize} />
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;
