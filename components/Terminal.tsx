'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalComponentProps {
  editorContent?: string;
  currentFileName?: string;
  sessionId: string;
}

export default function TerminalComponent({
  editorContent = '',
  currentFileName = 'script.py',
  sessionId,
}: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const lastEditorContentRef = useRef<string>('');

  useEffect(() => {
    if (editorContent !== lastEditorContentRef.current && editorContent.trim()) {
      lastEditorContentRef.current = editorContent;
      updateFileOnServer(currentFileName, editorContent);
    }
  }, [editorContent, currentFileName]);

  const updateFileOnServer = async (filename: string, content: string) => {
    try {
      await fetch(`http://${process.env.NEXT_PUBLIC_API_ADDRESS}/update-file/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          content,
        }),
      });
    } catch (error) {
      console.error('Failed to update file on server:', error);
    }
  };

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      convertEol: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    const ws = new WebSocket(`ws://${process.env.NEXT_PUBLIC_API_ADDRESS}/ws/${sessionId}`);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to virtual terminal');
      if (editorContent.trim()) {
        updateFileOnServer(currentFileName, editorContent);
      }
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onclose = () => {
      term.write('\r\n\x1B[1;31mDisconnected from virtual terminal\x1B[0m\r\n');
      term.write('Attempting to reconnect...\r\n');

      setTimeout(() => {
        if (socketRef.current?.readyState === WebSocket.CLOSED) {
          const newWs = new WebSocket(
            `ws://${process.env.NEXT_PUBLIC_API_ADDRESS}/ws/${sessionId}`
          );
          socketRef.current = newWs;

          newWs.onopen = () => {
            term.write('\x1B[1;32mReconnected to virtual terminal\x1B[0m\r\n');
          };

          newWs.onmessage = (event) => {
            term.write(event.data);
          };

          newWs.onerror = () => {
            term.write('\x1B[1;31mFailed to reconnect\x1B[0m\r\n');
          };
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      term.write('\r\n\x1B[1;31mConnection error - check if backend is running\x1B[0m\r\n');
    };

    // Handle terminal input
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send command with admin email
        const message = {
          command: data,
          email: 'user@gmail.com',
        };
        ws.send(JSON.stringify(message));
      }
    });

    // Handle special key combinations
    term.onKey(({ domEvent }) => {
      if (domEvent.ctrlKey) {
        switch (domEvent.key) {
          case 'c':
            // Ctrl+C handled by backend
            break;
          case 'l':
            // Ctrl+L to clear screen
            domEvent.preventDefault();
            term.clear();
            if (ws.readyState === WebSocket.OPEN) {
              const message = {
                command: 'clear\r',
                email: 'user@gmail.com',
              };
              ws.send(JSON.stringify(message));
            }
            break;
        }
      }
    });

    terminalInstanceRef.current = term;

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      term.dispose();
    };
  }, [sessionId]);

  const handleTerminalClick = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.focus();
    }
  };
  return (
    <div
      ref={terminalRef}
      onClick={handleTerminalClick}
      onKeyDown={handleTerminalClick}
      role="textbox"
      tabIndex={0}
      style={{
        width: '100%',
        height: '30vh',
        backgroundColor: '#1e1e1e',
        padding: '15px',
        borderTop: '1px solid #333',
        overflowY: 'scroll',
      }}
    />
  );
}
