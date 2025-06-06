import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import Router from 'next/router';
import Layout from '../components/Layout';
import { getSession } from 'next-auth/react';
import { CodeEditor } from '../components/CodeEditor';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { TextInput, Button, Flex, Text, Paper, Stack, Container } from '@mantine/core';

const Terminal = dynamic(() => import('../components/Terminal'), { ssr: false });

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession({ req });
  if (!session) {
    res.statusCode = 403;
    return { props: {} };
  }
  return {
    props: {},
  };
};

const Create: React.FC = () => {
  const [title, setTitle] = useState('');
  const [sessionId] = useState(
    `create_${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentCode, setCurrentCode] = useState('');

  const submitData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const body = { title, content: currentCode };
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create script');
      }

      toast.success('Script created successfully');
      await Router.push('/drafts');
    } catch (error: any) {
      console.error('Error creating script:', error);
      setError(error.message || 'An error occurred while creating the script');
      toast.error(error.message || 'Failed to create script');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) Router.push('/drafts');
  };

  return (
    <Layout>
      <Flex align="flex-end" gap="sm">
        <TextInput
          required
          label="Title"
          value={title}
          placeholder="Enter script title..."
          onChange={(e) => setTitle(e.currentTarget.value)}
          disabled={isLoading}
        />
        <Button onClick={submitData} disabled={!title.trim() || isLoading} loading={isLoading}>
          Create Script
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
          Cancel
        </Button>
      </Flex>
      <div className="w-full">
        <CodeEditor sessionId={sessionId} onCodeChange={setCurrentCode} />
        <Terminal sessionId={sessionId} />
      </div>
    </Layout>
  );
};

export default Create;
