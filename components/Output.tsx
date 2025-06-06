'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Container, Flex, Text, Image, Grid } from '@mantine/core';
import axios from 'axios';
import { IconPlayerPlayFilled, IconDownload } from '@tabler/icons-react';

interface GeneratedFile {
  name: string;
  type: string;
  content: string; // base64 encoded
}

export const Output = ({ editorRef, sessionId }: { editorRef: any; sessionId: string }) => {
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);

  const runCode = async () => {
    const code = editorRef.current.getValue();

    if (!code || code.trim() === '') {
      return;
    }

    try {
      setLoading(true);
      setOutput(null);
      setIsError(false);
      setGeneratedFiles([]);

      // First, ensure the file is saved to the virtual file system
      await axios.post(`http://${process.env.NEXT_PUBLIC_API_ADDRESS}/update-file/${sessionId}`, {
        filename: 'script.py',
        content: code,
      });

      // Execute the code using Docker
      const response = await axios.post(`http://${process.env.NEXT_PUBLIC_API_ADDRESS}/execute`, {
        sourceCode: code,
        email: 'user@gmail.com',
      });

      const stdout = response.data?.run?.stdout || '';
      const stderr = response.data?.run?.stderr || '';
      const files = response.data?.files || [];

      // Set generated files
      setGeneratedFiles(files);

      // If there's output in stdout, show that
      if (stdout.trim()) {
        setOutput(stdout);
        setIsError(false);
      }
      // If there's no stdout but there's stderr (compilation/runtime errors), show stderr
      else if (stderr.trim()) {
        setOutput(stderr);
        setIsError(true);
      }
      // If neither stdout nor stderr has content but files were generated
      else if (files.length > 0) {
        setOutput('Code executed successfully. Check generated files below.');
        setIsError(false);
      }
      // If nothing at all
      else {
        setOutput('No output');
        setIsError(false);
      }
    } catch (error: any) {
      setOutput(`Execution failed: ${error.message}`);
      setIsError(true);
      setGeneratedFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (filename: string) => {
    try {
      // Find the file in our generatedFiles array
      const file = generatedFiles.find((f) => f.name === filename);

      if (file && file.content) {
        // Convert base64 to blob
        const byteCharacters = atob(file.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.type });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('File not found in generated files');
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const renderGeneratedFile = (file: GeneratedFile) => {
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      return (
        <div key={file.name} style={{ marginBottom: '1rem' }}>
          <Flex justify="space-between" align="center" mb="xs">
            <Text size="sm" fw={500}>
              {file.name}
            </Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDownload size={14} />}
              onClick={() => downloadFile(file.name)}
            >
              Download
            </Button>
          </Flex>
          <Image
            src={`data:${file.type};base64,${file.content}`}
            alt={file.name}
            style={{ maxWidth: '100%', height: 'auto', border: '1px solid #ddd' }}
          />
        </div>
      );
    }

    return (
      <div key={file.name} style={{ marginBottom: '1rem' }}>
        <Flex justify="space-between" align="center" mb="xs">
          <Text size="sm" fw={500}>
            {file.name}
          </Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconDownload size={14} />}
            onClick={() => downloadFile(file.name)}
          >
            Download
          </Button>
        </Flex>
        <Text size="xs" c="dimmed">
          File generated - click download to save
        </Text>
      </div>
    );
  };

  return (
    <Container w="100%" h="70vh" p={0}>
      <Button radius={0} h="5vh" w="100%" onClick={runCode} loading={loading}>
        <Text size="sm" fw={500} mr={5}>
          Run
        </Text>
        <IconPlayerPlayFilled size={16} />
      </Button>

      <div style={{ height: '65vh', overflowY: 'scroll', padding: '1rem' }}>
        {/* Console Output */}
        <Text
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: isError ? '#ff6b6b' : 'inherit',
            marginBottom: generatedFiles.length > 0 ? '1rem' : 0,
          }}
        >
          {output || ''}
        </Text>

        {/* Generated Files */}
        {generatedFiles.length > 0 && (
          <div>
            <Text size="lg" fw={600} mb="md" c="blue">
              Generated Files ({generatedFiles.length})
            </Text>
            <Grid>{generatedFiles.map(renderGeneratedFile)}</Grid>
          </div>
        )}
      </div>
    </Container>
  );
};
