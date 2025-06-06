import React, { useState } from 'react';
import { GetServerSideProps } from 'next';
import Router from 'next/router';
import Layout from '../../components/Layout';
import { PostProps } from '../../components/Post';
import { getSession, useSession } from 'next-auth/react';
import prisma from '../../lib/prisma';
import { CodeEditor } from '../../components/CodeEditor';
import dynamic from 'next/dynamic';
import { Button, Flex, TextInput } from '@mantine/core';
import { toast } from 'react-hot-toast';

const Terminal = dynamic(() => import('../../components/Terminal'), { ssr: false });

export const getServerSideProps: GetServerSideProps = async ({ params, req, res }) => {
  const session = await getSession({ req });
  if (!session) {
    res.statusCode = 403;
    return { props: { drafts: [] } };
  }

  const post = await prisma.post.findUnique({
    where: {
      id: String(params?.id),
    },
    include: {
      author: {
        select: { name: true, email: true },
      },
    },
  });
  return {
    props: post,
  };
};

async function deletePost(id: string): Promise<void> {
  await fetch(`/api/post/${id}`, {
    method: 'DELETE',
  });
  toast.success('Script deleted successfully');
  Router.push('/drafts');
}

async function updatePost(id: string, title: string, content: string): Promise<void> {
  const response = await fetch(`/api/post/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, content }),
  });

  if (response.ok) {
    toast.success('Script updated successfully');
    Router.push('/drafts');
  } else {
    const error = await response.json();
    alert(`Error: ${error.message}`);
  }
}

const Post: React.FC<PostProps> = (props) => {
  const { data: session, status } = useSession();

  const [editTitle, setEditTitle] = useState(props.title);
  const [code, setCode] = useState(props.content || '');
  const [sessionId, setSessionId] = useState<string>(
    props.id + Math.random().toString(36).substring(2, 15)
  );

  if (status === 'loading') {
    return <div>Authenticating ...</div>;
  }

  if (!session) {
    return (
      <Layout>
        <h1>A Script</h1>
        <div>You need to be authenticated to view this page.</div>
      </Layout>
    );
  }

  const userHasValidSession = Boolean(session);
  const postBelongsToUser = session?.user?.email === props.author?.email;

  const handleSave = async () => {
    await updatePost(props.id, editTitle, code);
  };

  return (
    <Layout>
      <Flex align="flex-end" gap="sm">
        <TextInput
          label="Title"
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Title"
        />
        {userHasValidSession && postBelongsToUser && (
          <>
            <Button variant="outline" onClick={handleSave}>
              Save to Cloud
            </Button>
            <Button variant="default" onClick={() => deletePost(props.id)}>
              Delete Script
            </Button>
          </>
        )}
      </Flex>
      {sessionId && (
        <div className="w-full">
          <CodeEditor sessionId={sessionId} initialCode={props.content} onCodeChange={setCode} />
          <Terminal sessionId={sessionId} />
        </div>
      )}
    </Layout>
  );
};

export default Post;
