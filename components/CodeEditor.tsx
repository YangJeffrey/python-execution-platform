'use client';

import { useState, useRef, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Flex, SimpleGrid, Text, useMantineColorScheme } from '@mantine/core';
import { Output } from './Output';
import axios from 'axios';

interface CodeEditorProps {
  sessionId: string;
  onCodeChange?: (code: string) => void;
  initialCode?: string;
}

export const CodeEditor = ({ sessionId, onCodeChange, initialCode }: CodeEditorProps) => {
  const editorRef = useRef<any>(null);
  const [code, setCode] = useState<string | undefined>('');
  const { colorScheme } = useMantineColorScheme();

  const onMount = (editor: any) => {
    editorRef.current = editor;
    editor.focus();
    setCode(initialCode || '');
  };

  // Update parent component with code changes
  useEffect(() => {
    if (code !== undefined && onCodeChange) {
      onCodeChange(code);
    }
  }, [code, onCodeChange]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);

    if (newCode !== undefined && editorRef.current) {
      axios.post(`http://${process.env.NEXT_PUBLIC_API_ADDRESS}/update-file/${sessionId}`, {
        filename: 'script.py',
        content: newCode,
        session_id: sessionId,
      });
    }
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} p={0} spacing={0}>
      <div>
        <Flex direction="row" h="5vh" align="center" pl="md" gap={8}>
          <Text size="sm" fw={500}>
            script.py
          </Text>
        </Flex>
        <MonacoEditor
          height="65vh"
          width="100%"
          theme={colorScheme === 'dark' ? 'vs-dark' : 'vs-light'}
          language="python"
          onMount={onMount}
          value={code}
          onChange={handleCodeChange}
          options={{
            scrollBeyondLastLine: false,
            padding: { top: 20, bottom: 20 },
            minimap: { enabled: false },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              // useShadows: false,
            },
          }}
        />
      </div>
      <Output editorRef={editorRef} sessionId={sessionId} />
    </SimpleGrid>
  );
};
